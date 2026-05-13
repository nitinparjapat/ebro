using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using BrothersStoreApi.Services.Caching;
using BrothersStoreApi.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;

namespace BrothersStoreApi.Controllers;

/// <summary>
/// This is an example of how to create admin-only endpoints
/// Add [Authorize(Roles = "Admin")] attribute to restrict access to admin users only
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]  // This ensures only Admin users can access these endpoints
[EnableRateLimiting("write")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly IMemoryCache cache;
    private readonly IOrderEmailNotificationService orderEmailNotificationService;

    public AdminController(AppDbContext d, IMemoryCache cache, IOrderEmailNotificationService orderEmailNotificationService)
    {
        db = d;
        this.cache = cache;
        this.orderEmailNotificationService = orderEmailNotificationService;
    }

    /// <summary>
    /// Get all users (Admin only)
    /// </summary>
    [HttpGet("users")]
    public IActionResult GetAllUsers()
    {
        var users = db.Users.ToList();
        return Ok(users);
    }

    /// <summary>
    /// Get specific user details (Admin only)
    /// </summary>
    [HttpGet("users/{userId}")]
    public IActionResult GetUser(string userId)
    {
        var user = db.Users.Find(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        return Ok(user);
    }

    /// <summary>
    /// Promote user to admin (Admin only)
    /// </summary>
    [HttpPut("users/{userId}/promote")]
    public async Task<IActionResult> PromoteToAdmin(string userId)
    {
        var user = db.Users.Find(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        user.Role = "Admin";
        await db.SaveChangesAsync();

        return Ok(new { message = "User promoted to Admin", user });
    }

    /// <summary>
    /// Demote user to regular user (Admin only)
    /// </summary>
    [HttpPut("users/{userId}/demote")]
    public async Task<IActionResult> DemoteToUser(string userId)
    {
        var user = db.Users.Find(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        user.Role = "User";
        await db.SaveChangesAsync();

        return Ok(new { message = "User demoted to regular user", user });
    }

    /// <summary>
    /// Get dashboard statistics (Admin only)
    /// </summary>
    [HttpGet("dashboard/stats")]
    public IActionResult GetDashboardStats()
    {
        var stats = new
        {
            totalUsers = db.Users.Count(),
            totalAdmins = db.Users.Count(u => u.Role == "Admin"),
            totalProducts = db.Products.Count(),
            totalOrders = db.Orders.Count(),
            totalReviews = db.Reviews.Count(),
            pendingReviews = db.Reviews.Count(r => r.Status == "Pending"),
            recentOrders = db.Orders.OrderByDescending(o => o.CreatedAt).Take(10).ToList(),
            recentUsers = db.Users.OrderByDescending(u => u.CreatedAt).Take(10).ToList()
        };

        return Ok(stats);
    }

    /// <summary>
    /// Get all pending reviews (Admin only)
    /// </summary>
    [HttpGet("reviews/pending")]
    public IActionResult GetPendingReviews()
    {
        var reviews = db.Reviews.Where(r => r.Status == "Pending").ToList();
        return Ok(reviews);
    }

    [HttpGet("reviews")]
    public IActionResult GetAllReviews()
    {
        var reviews = db.Reviews
            .OrderByDescending(review => review.CreatedAt)
            .ToList();
        return Ok(reviews);
    }

    /// <summary>
    /// Approve a review (Admin only)
    /// </summary>
    [HttpPut("reviews/{reviewId}/approve")]
    public async Task<IActionResult> ApproveReview(int reviewId)
    {
        var review = db.Reviews.Find(reviewId);
        if (review == null)
        {
            return NotFound(new { message = "Review not found" });
        }

        review.Status = "Approved";
        review.ApprovedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        ProductCacheKeys.Invalidate(cache, review.ProductId);

        return Ok(new { message = "Review approved", review });
    }

    /// <summary>
    /// Reject a review (Admin only)
    /// </summary>
    [HttpPut("reviews/{reviewId}/reject")]
    public async Task<IActionResult> RejectReview(int reviewId)
    {
        var review = db.Reviews.Find(reviewId);
        if (review == null)
        {
            return NotFound(new { message = "Review not found" });
        }

        review.Status = "Rejected";
        await db.SaveChangesAsync();
        ProductCacheKeys.Invalidate(cache, review.ProductId);

        return Ok(new { message = "Review rejected", review });
    }

    /// <summary>
    /// Get all orders (Admin only)
    /// </summary>
    [HttpGet("orders")]
    public IActionResult GetAllOrders()
    {
        var orders = db.Orders.OrderByDescending(o => o.CreatedAt).ToList();
        return Ok(orders);
    }

    /// <summary>
    /// Update order status (Admin only)
    /// </summary>
    [HttpPut("orders/{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = db.Orders.Include(o => o.Items).FirstOrDefault(o => o.Id == orderId);
        if (order == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        order.Status = request.Status;
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

        return Ok(new { message = "Order status updated", order });
    }

    /// <summary>
    /// Get logged-in admin's information
    /// </summary>
    [HttpGet("me")]
    public IActionResult GetAdminInfo()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var admin = db.Users.Find(userId);
        if (admin?.Role != "Admin")
        {
            return Forbid("Only admins can access this resource");
        }

        return Ok(admin);
    }

    [HttpGet("prepaid-discounts")]
    public async Task<IActionResult> GetPrepaidDiscountRules()
    {
        var rules = await db.PrepaidDiscountRules
            .AsNoTracking()
            .OrderByDescending(rule => rule.IsActive)
            .ThenBy(rule => rule.ProductId)
            .ThenBy(rule => rule.MinQuantity)
            .ToListAsync();

        var productIds = rules.Select(rule => rule.ProductId).Distinct().ToList();
        var products = await db.Products
            .AsNoTracking()
            .Where(product => productIds.Contains(product.Id))
            .Select(product => new { product.Id, product.Name })
            .ToListAsync();

        var productLookup = products.ToDictionary(product => product.Id, product => product.Name);

        return Ok(rules.Select(rule => new
        {
            rule.Id,
            rule.ProductId,
            productName = productLookup.TryGetValue(rule.ProductId, out var name) ? name : "",
            rule.MinQuantity,
            rule.MaxQuantity,
            rule.DiscountPerItem,
            rule.IsActive,
        }));
    }

    [HttpPost("prepaid-discounts")]
    public async Task<IActionResult> CreatePrepaidDiscountRule([FromBody] PrepaidDiscountRuleUpsertRequest request)
    {
        if (request.ProductId <= 0)
        {
            return BadRequest(new { message = "Product is required." });
        }

        if (request.MinQuantity < 1)
        {
            return BadRequest(new { message = "Min quantity must be at least 1." });
        }

        if (request.MaxQuantity.HasValue && request.MaxQuantity.Value < request.MinQuantity)
        {
            return BadRequest(new { message = "Max quantity must be greater than or equal to min quantity." });
        }

        if (request.DiscountPerItem < 0)
        {
            return BadRequest(new { message = "Discount per item cannot be negative." });
        }

        var productExists = await db.Products.AsNoTracking().AnyAsync(product => product.Id == request.ProductId);
        if (!productExists)
        {
            return BadRequest(new { message = "Invalid product." });
        }

        var rule = new PrepaidDiscountRule
        {
            ProductId = request.ProductId,
            MinQuantity = request.MinQuantity,
            MaxQuantity = request.MaxQuantity,
            DiscountPerItem = request.DiscountPerItem,
            IsActive = request.IsActive ?? true,
        };

        db.PrepaidDiscountRules.Add(rule);
        await db.SaveChangesAsync();

        return Ok(rule);
    }

    [HttpDelete("prepaid-discounts/{id:int}")]
    public async Task<IActionResult> DeletePrepaidDiscountRule(int id)
    {
        var rule = await db.PrepaidDiscountRules.FindAsync(id);
        if (rule == null)
        {
            return NotFound(new { message = "Rule not found." });
        }

        db.PrepaidDiscountRules.Remove(rule);
        await db.SaveChangesAsync();

        return Ok(new { deleted = true });
    }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = "";
}

public class PrepaidDiscountRuleUpsertRequest
{
    public int ProductId { get; set; }
    public int MinQuantity { get; set; } = 1;
    public int? MaxQuantity { get; set; }
    public decimal DiscountPerItem { get; set; }
    public bool? IsActive { get; set; }
}
