using System.Security.Claims;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/cart")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly AppDbContext db;
    private const int MaxQuantityPerItem = 10;

    public CartController(AppDbContext d)
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

        return Ok(await BuildCartResponse(userId));
    }

    [HttpPost("items")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Add([FromBody] CartItemRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        if (request.ProductId <= 0 || request.Quantity <= 0)
        {
            return BadRequest(new { message = "Product and quantity are required." });
        }

        if (request.Quantity > MaxQuantityPerItem)
        {
            return BadRequest(new { message = $"You can only add up to {MaxQuantityPerItem} quantity for a product." });
        }

        var productExists = await db.Products
            .AsNoTracking()
            .AnyAsync(product => product.Id == request.ProductId);

        if (!productExists)
        {
            return NotFound(new { message = "Product not found." });
        }

        var cartItem = await db.CartItems.FirstOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == request.ProductId
        );

        if (cartItem == null)
        {
            db.CartItems.Add(new CartItem
            {
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                UserId = userId,
            });
        }
        else
        {
            cartItem.Quantity += request.Quantity;
            if (cartItem.Quantity > MaxQuantityPerItem)
            {
                return BadRequest(new { message = $"You can only add up to {MaxQuantityPerItem} quantity for a product." });
            }
        }

        await db.SaveChangesAsync();
        return Ok(await BuildCartResponse(userId));
    }

    [HttpPatch("items/{productId:int}")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> UpdateQuantity(int productId, [FromBody] UpdateCartItemRequest request)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var cartItem = await db.CartItems.FirstOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == productId
        );

        if (cartItem == null)
        {
            return NotFound(new { message = "Cart item not found." });
        }

        if (request.Quantity <= 0)
        {
            db.CartItems.Remove(cartItem);
        }
        else
        {
            if (request.Quantity > MaxQuantityPerItem)
            {
                return BadRequest(new { message = $"You can only add up to {MaxQuantityPerItem} quantity for a product." });
            }

            cartItem.Quantity = request.Quantity;
        }

        await db.SaveChangesAsync();
        return Ok(await BuildCartResponse(userId));
    }

    [HttpDelete("items/{productId:int}")]
    public async Task<IActionResult> RemoveItem(int productId)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var cartItem = await db.CartItems.FirstOrDefaultAsync(
            item => item.UserId == userId && item.ProductId == productId
        );

        if (cartItem != null)
        {
            db.CartItems.Remove(cartItem);
            await db.SaveChangesAsync();
        }

        return Ok(await BuildCartResponse(userId));
    }

    [HttpDelete]
    public async Task<IActionResult> Clear()
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var cartItems = await db.CartItems.Where(item => item.UserId == userId).ToListAsync();
        if (cartItems.Count > 0)
        {
            db.CartItems.RemoveRange(cartItems);
            await db.SaveChangesAsync();
        }

        return Ok(await BuildCartResponse(userId));
    }

    private string? GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    private async Task<object> BuildCartResponse(string userId)
    {
        var items = await (
            from cartItem in db.CartItems.AsNoTracking()
            join product in db.Products.AsNoTracking() on cartItem.ProductId equals product.Id
            where cartItem.UserId == userId
            orderby cartItem.Id descending
            select new
            {
                productId = cartItem.ProductId,
                productName = product.Name,
                price = product.Price,
                quantity = cartItem.Quantity,
            }
        ).ToListAsync();

        return new
        {
            userId,
            totalAmount = items.Sum(item => item.price * item.quantity),
            items,
        };
    }
}

public class CartItemRequest
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class UpdateCartItemRequest
{
    public int Quantity { get; set; }
}
