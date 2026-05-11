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
    private sealed class CartPricingItem
    {
        public int ProductId { get; init; }
        public int Quantity { get; init; }
        public string ProductName { get; init; } = "";
        public decimal Price { get; init; }
    }

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
            select new CartPricingItem
            {
                ProductId = cartItem.ProductId,
                Quantity = cartItem.Quantity,
                ProductName = product.Name,
                Price = product.Price,
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

        await using var transaction = await db.Database.BeginTransactionAsync();

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

        var prepaidDiscountAmount = isPrepaid
            ? await ComputePrepaidDiscountAsync(cartItems, subtotalAfterFirstDiscount)
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

        var stockReservationError = await ReserveStockAsync(cartItems);
        if (!string.IsNullOrWhiteSpace(stockReservationError))
        {
            await transaction.RollbackAsync();
            return BadRequest(new { message = stockReservationError });
        }

        db.Orders.Add(order);

        var userCartItems = await db.CartItems.Where(item => item.UserId == userId).ToListAsync();
        if (userCartItems.Count > 0)
        {
            db.CartItems.RemoveRange(userCartItems);
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
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

        var previousStatus = order.Status;
        var nextStatus = request.Status.Trim();
        order.Status = nextStatus;

        if (!IsCancelledStatus(previousStatus) && IsCancelledStatus(nextStatus))
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            await RestoreStockAsync(order);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(order);
        }

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

    [HttpPost("{id:int}/cancel")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value?.Trim();
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized();
        }

        var isAdmin = IsAdmin();

        var order = await db.Orders.Include(item => item.Items).FirstOrDefaultAsync(item => item.Id == id);
        if (order == null)
        {
            return NotFound();
        }

        if (!isAdmin && !string.Equals(order.CustomerEmail, userEmail, StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        if (IsCancelledStatus(order.Status))
        {
            return Ok(order);
        }

        if (string.Equals(order.Status, "Confirmed", StringComparison.OrdinalIgnoreCase)
            || order.Status.Contains("ship", StringComparison.OrdinalIgnoreCase)
            || order.Status.Contains("deliver", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "This order cannot be cancelled now." });
        }

        await using var transaction = await db.Database.BeginTransactionAsync();
        order.Status = "Cancelled";
        await RestoreStockAsync(order);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(order);
    }

    private bool IsAdmin() =>
        string.Equals(User.FindFirst(ClaimTypes.Role)?.Value, "Admin", StringComparison.OrdinalIgnoreCase);

    private static bool IsCancelledStatus(string status) =>
        status.Trim().Contains("cancel", StringComparison.OrdinalIgnoreCase);

    private async Task<string?> ReserveStockAsync(IReadOnlyCollection<CartPricingItem> cartItems)
    {
        foreach (var item in cartItems)
        {
            var rowsAffected = await db.Products
                .Where(product =>
                    product.Id == item.ProductId
                    && product.IsActive
                    && product.Stock >= item.Quantity
                )
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(product => product.Stock, product => product.Stock - item.Quantity)
                );

            if (rowsAffected == 0)
            {
                var productName = string.IsNullOrWhiteSpace(item.ProductName) ? "Product" : item.ProductName;
                return $"{productName} is out of stock for quantity {item.Quantity}.";
            }
        }

        return null;
    }

    private async Task RestoreStockAsync(Order order)
    {
        foreach (var item in order.Items)
        {
            await db.Products
                .Where(product => product.Id == item.ProductId)
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(product => product.Stock, product => product.Stock + item.Quantity)
                );
        }
    }

    private async Task<decimal> ComputePrepaidDiscountAsync(
        IReadOnlyCollection<CartPricingItem> cartItems,
        decimal subtotalAfterFirstDiscount
    )
    {
        var rules = await db.PrepaidDiscountRules
            .AsNoTracking()
            .Where(rule => rule.IsActive)
            .ToListAsync();

        // Backwards compatible default: Rs. 30 / item until any rules are configured.
        if (rules.Count == 0)
        {
            var totalQuantity = cartItems.Sum(item => item.Quantity);
            return Math.Min(totalQuantity * 30m, subtotalAfterFirstDiscount);
        }

        decimal discount = 0m;
        foreach (var item in cartItems)
        {
            var match = rules
                .Where(rule =>
                    rule.ProductId == item.ProductId
                    && item.Quantity >= rule.MinQuantity
                    && (!rule.MaxQuantity.HasValue || item.Quantity <= rule.MaxQuantity.Value)
                )
                .OrderByDescending(rule => rule.MinQuantity)
                .ThenBy(rule => rule.MaxQuantity ?? int.MaxValue)
                .FirstOrDefault();

            if (match != null && match.DiscountPerItem > 0)
            {
                discount += match.DiscountPerItem * item.Quantity;
            }
        }

        return Math.Min(discount, subtotalAfterFirstDiscount);
    }
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
