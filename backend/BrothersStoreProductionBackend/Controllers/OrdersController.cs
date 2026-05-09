using System.Security.Claims;
using System.Text.RegularExpressions;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using BrothersStoreApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly IOrderEmailNotificationService orderEmailNotificationService;

    public OrdersController(AppDbContext d, IOrderEmailNotificationService orderEmailNotificationService)
    {
        db = d;
        this.orderEmailNotificationService = orderEmailNotificationService;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? scope = null)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized();
        }

        var isAdmin = IsAdmin();
        var query = db.Orders
            .AsNoTracking()
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAt)
            .AsQueryable();

        if (!isAdmin || !string.Equals(scope, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(order => order.CustomerEmail == userEmail);
        }

        return Ok(await query.ToListAsync());
    }

    [HttpGet("owner")]
    public async Task<IActionResult> GetOwnerOrders()
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        var orders = await db.Orders
            .AsNoTracking()
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpPost]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        var userName = User.FindFirst(ClaimTypes.Name)?.Value;

        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized();
        }

        var cartItems = await (
            from cartItem in db.CartItems
            join product in db.Products on cartItem.ProductId equals product.Id
            where cartItem.UserId == userId
            select new
            {
                cartItem.ProductId,
                cartItem.Quantity,
                ProductName = product.Name,
                product.Price,
            }
        ).ToListAsync();

        if (cartItems.Count == 0)
        {
            return BadRequest(new { message = "Your cart is empty." });
        }

        var customerMobile = request.CustomerMobile?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(customerMobile))
        {
            return BadRequest(new { message = "Mobile number is required." });
        }

        var mobileDigits = Regex.Replace(customerMobile, @"\D", "");
        if (mobileDigits.Length != 10)
        {
            return BadRequest(new { message = "Enter a valid 10 digit mobile number." });
        }

        if (string.IsNullOrWhiteSpace(request.ShippingAddress))
        {
            return BadRequest(new { message = "Shipping address is required." });
        }

        var hasPreviousOrders = await db.Orders
            .AsNoTracking()
            .AnyAsync(order => order.CustomerEmail == userEmail);

        var originalTotalAmount = cartItems.Sum(item => item.Price * item.Quantity);
        var firstOrderDiscountAmount = !hasPreviousOrders ? Math.Min(50m, originalTotalAmount) : 0m;
        var subtotalAfterFirstDiscount = Math.Max(0m, originalTotalAmount - firstOrderDiscountAmount);

        var paymentMethod = request.PaymentMethod?.Trim() ?? "Cash on Delivery";
        var isPrepaid = paymentMethod.StartsWith("Prepaid", StringComparison.OrdinalIgnoreCase)
            || paymentMethod.Contains("Online", StringComparison.OrdinalIgnoreCase)
            || paymentMethod.Contains("Razorpay", StringComparison.OrdinalIgnoreCase)
            || paymentMethod.Contains("UPI", StringComparison.OrdinalIgnoreCase);

        var totalQuantity = cartItems.Sum(item => item.Quantity);
        var prepaidDiscountAmount = isPrepaid
            ? Math.Min(totalQuantity * 30m, subtotalAfterFirstDiscount)
            : 0m;

        var finalTotalAmount = Math.Max(0m, subtotalAfterFirstDiscount - prepaidDiscountAmount);

        var order = new Order
        {
            CustomerName = string.IsNullOrWhiteSpace(request.CustomerName)
                ? userName ?? ""
                : request.CustomerName.Trim(),
            CustomerMobile = mobileDigits,
            CustomerEmail = request.CustomerEmail?.Trim() ?? userEmail,
            ShippingAddress = request.ShippingAddress?.Trim() ?? "",
            PaymentMethod = paymentMethod,
            Status = "Pending",
            TotalAmount = finalTotalAmount,
            CreatedAt = DateTime.UtcNow,
            Items = cartItems.Select(item => new OrderItem
            {
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                Price = item.Price,
                Quantity = item.Quantity,
            }).ToList(),
        };

        db.Orders.Add(order);

        var userCartItems = await db.CartItems.Where(item => item.UserId == userId).ToListAsync();
        if (userCartItems.Count > 0)
        {
            db.CartItems.RemoveRange(userCartItems);
        }

        await db.SaveChangesAsync();
        _ = orderEmailNotificationService.SendOrderPlacedNotificationsAsync(order);

        return Ok(new
        {
            order.Id,
            order.CustomerName,
            order.CustomerMobile,
            order.CustomerEmail,
            order.ShippingAddress,
            order.PaymentMethod,
            order.Status,
            order.ConfirmedByAdminName,
            order.ConfirmedByAdminEmail,
            order.ConfirmedAt,
            order.TotalAmount,
            order.CreatedAt,
            items = order.Items,
            originalTotalAmount,
            firstOrderDiscountAmount,
            prepaidDiscountAmount,
            firstOrderDiscountApplied = firstOrderDiscountAmount > 0,
            prepaidDiscountApplied = prepaidDiscountAmount > 0,
        });
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> Status(int id, [FromBody] OrderStatusPatchRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        var order = await db.Orders.Include(item => item.Items).FirstOrDefaultAsync(item => item.Id == id);
        if (order == null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "Status is required." });
        }

        order.Status = request.Status.Trim();
        if (string.Equals(order.Status, "Confirmed", StringComparison.OrdinalIgnoreCase))
        {
            order.ConfirmedByAdminName = User.FindFirst(ClaimTypes.Name)?.Value?.Trim() ?? "";
            order.ConfirmedByAdminEmail = User.FindFirst(ClaimTypes.Email)?.Value?.Trim() ?? "";
            order.ConfirmedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        if (string.Equals(order.Status, "Confirmed", StringComparison.OrdinalIgnoreCase))
        {
            _ = orderEmailNotificationService.SendOrderConfirmedNotificationAsync(order);
        }

        return Ok(order);
    }

    private bool IsAdmin() =>
        string.Equals(User.FindFirst(ClaimTypes.Role)?.Value, "Admin", StringComparison.OrdinalIgnoreCase);
}

public class CreateOrderRequest
{
    public string ShippingAddress { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CustomerMobile { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
}

public class OrderStatusPatchRequest
{
    public string Status { get; set; } = "";
}
