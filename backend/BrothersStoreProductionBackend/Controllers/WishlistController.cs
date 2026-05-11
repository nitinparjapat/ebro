using System.Security.Claims;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/wishlist")]
[Authorize]
public class WishlistController : ControllerBase
{
    private readonly AppDbContext db;

    public WishlistController(AppDbContext d)
    {
        db = d;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var products = await (
            from wishlistItem in db.Wishlist.AsNoTracking()
            join product in db.Products.AsNoTracking() on wishlistItem.ProductId equals product.Id
            where wishlistItem.UserId == userId && product.IsActive
            orderby wishlistItem.Id descending
            select new
            {
                product.Id,
                product.Name,
                product.Description,
                product.OriginalPrice,
                product.Price,
                product.Stock,
                product.CategoryName,
                product.IsActive,
                product.PrimaryImageUrl,
                product.ImagesJson,
                product.VideosJson,
            }
        ).ToListAsync();

        return Ok(products);
    }

    [HttpPost("items/toggle")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Toggle([FromBody] WishlistToggleRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        if (request.ProductId <= 0)
        {
            return BadRequest(new { message = "Product is required." });
        }

        var productExists = await db.Products
            .AsNoTracking()
            .AnyAsync(product => product.Id == request.ProductId && product.IsActive);

        if (!productExists)
        {
            return NotFound(new { message = "Product not found." });
        }

        var existing = await db.Wishlist.FirstOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == request.ProductId
        );

        if (existing != null)
        {
            db.Wishlist.Remove(existing);
            await db.SaveChangesAsync();
            return Ok(new { removed = true });
        }

        db.Wishlist.Add(new WishlistItem
        {
            ProductId = request.ProductId,
            UserId = userId,
        });

        await db.SaveChangesAsync();
        return Ok(new { removed = false });
    }

    [HttpDelete("items/{productId:int}")]
    public async Task<IActionResult> Remove(int productId)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var existing = await db.Wishlist.FirstOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == productId
        );

        if (existing != null)
        {
            db.Wishlist.Remove(existing);
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    private string? GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
}

public class WishlistToggleRequest
{
    public int ProductId { get; set; }
}

