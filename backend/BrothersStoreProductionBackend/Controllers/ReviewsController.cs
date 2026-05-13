
using Microsoft.AspNetCore.Mvc;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using BrothersStoreApi.Services.Caching;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/products/{productId}/reviews")]
public class ReviewsController:ControllerBase{

 private readonly AppDbContext db;
 private readonly IMemoryCache cache;
 
 public ReviewsController(AppDbContext d, IMemoryCache cache){db=d; this.cache = cache;}

[HttpGet]
public async Task<IActionResult> Get(int productId){
var r=await db.Reviews
    .AsNoTracking()
    .Where(x=>x.ProductId==productId && x.Status=="Approved")
    .OrderByDescending(x=>x.ApprovedAt ?? x.CreatedAt)
    .ToListAsync();
return Ok(r);
}

[HttpPost]
[EnableRateLimiting("write")]
public async Task<IActionResult> Create(int productId,[FromBody] ReviewCreateRequest request){
if (request.Rating < 1 || request.Rating > 5)
{
    return BadRequest(new { message = "Choose a valid rating." });
}

if (string.IsNullOrWhiteSpace(request.Text) || request.Text.Trim().Length < 5)
{
    return BadRequest(new { message = "Write a short review before submitting." });
}

var productExists = await db.Products
    .AsNoTracking()
    .AnyAsync(product => product.Id == productId);

if (!productExists)
{
    return NotFound(new { message = "Product not found." });
}

var review = new Review
{
    ProductId = productId,
    ProductTitle = request.ProductTitle?.Trim() ?? "",
    Rating = request.Rating,
    Text = request.Text.Trim(),
    Status = "Pending",
    CustomerName = request.CustomerName?.Trim() ?? "",
    CustomerEmail = request.CustomerEmail?.Trim() ?? "",
    CreatedAt = DateTime.UtcNow,
};

 db.Reviews.Add(review);
 await db.SaveChangesAsync();
 ProductCacheKeys.Invalidate(cache, productId);
 return Ok(review);
 }
}

public class ReviewCreateRequest
{
    public string ProductTitle { get; set; } = "";
    public int Rating { get; set; }
    public string Text { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
}
