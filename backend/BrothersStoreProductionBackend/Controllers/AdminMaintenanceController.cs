using BrothersStoreApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/admin/maintenance")]
[Authorize(Roles = "Admin")]
public class AdminMaintenanceController : ControllerBase
{
    private readonly AppDbContext db;

    public AdminMaintenanceController(AppDbContext db)
    {
        this.db = db;
    }

    [HttpPost("purge-test-data")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> PurgeTestData([FromBody] PurgeTestDataRequest request)
    {
        var keepProductName = request.KeepProductName?.Trim();
        if (string.IsNullOrWhiteSpace(keepProductName))
        {
            return BadRequest(new { message = "KeepProductName is required." });
        }

        var keepProductIds = await db.Products
            .AsNoTracking()
            .Where(product => product.Name.ToLower() == keepProductName.ToLower())
            .Select(product => product.Id)
            .ToListAsync();

        if (keepProductIds.Count == 0)
        {
            return NotFound(new { message = $"No product found with name \"{keepProductName}\"." });
        }

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Clear user state & test records first (avoid FK issues).
        await db.CartItems.ExecuteDeleteAsync();
        await db.Wishlist.ExecuteDeleteAsync();
        await db.Reviews.ExecuteDeleteAsync();

        // Orders + items (items depend on orders).
        await db.OrderItems.ExecuteDeleteAsync();
        await db.Orders.ExecuteDeleteAsync();

        // Keep only the requested product(s).
        await db.Products
            .Where(product => !keepProductIds.Contains(product.Id))
            .ExecuteDeleteAsync();

        await transaction.CommitAsync();

        return Ok(new
        {
            keptProductIds = keepProductIds,
            keptProductName = keepProductName,
            visitsKept = true,
        });
    }
}

public class PurgeTestDataRequest
{
    public string KeepProductName { get; set; } = "";
}
