using System.Text.Json;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private const int MaxInlineListImageLength = 80_000;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext db;

    public ProductsController(AppDbContext d)
    {
        db = d;
    }

    [HttpGet]
    public async Task<IActionResult> Get(int page = 1, int pageSize = 50, bool includeInactive = false)
    {
        var query = db.Products.AsNoTracking().AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(product => product.IsActive);
        }

        var products = await query
            .OrderBy(product => product.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(product => new
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
                product.VideosJson,
            })
            .ToListAsync();

        return Ok(products.Select(product => new ProductResponse
        {
            Id = product.Id,
            Name = product.Name,
            Description = product.Description,
            OriginalPrice = product.OriginalPrice,
            Price = product.Price,
            Stock = product.Stock,
            CategoryName = product.CategoryName,
            IsActive = product.IsActive,
            PrimaryImageUrl = BuildListImageUrl(product.PrimaryImageUrl),
            Images = BuildListImages(product.PrimaryImageUrl),
            Videos = [],
            HasVideo = DeserializeMedia(product.VideosJson).Count > 0,
        }));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);

        if (product == null)
        {
            return NotFound();
        }

        return Ok(ToResponse(product, includeVideos: true));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Create([FromBody] ProductUpsertRequest request)
    {
        var product = new Product();
        ApplyRequest(product, request);

        db.Products.Add(product);
        await db.SaveChangesAsync();

        return Ok(ToResponse(product, includeVideos: true));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Update(int id, [FromBody] ProductUpsertRequest request)
    {
        var product = await db.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound();
        }

        ApplyRequest(product, request);
        await db.SaveChangesAsync();

        return Ok(ToResponse(product, includeVideos: true));
    }

    [HttpPatch("{id:int}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Patch(int id, [FromBody] ProductPatchRequest request)
    {
        var product = await db.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound();
        }

        var wasActive = product.IsActive;

        if (request.IsActive.HasValue)
        {
            product.IsActive = request.IsActive.Value;
        }

        if (request.Stock.HasValue)
        {
            product.Stock = request.Stock.Value;
        }

        await db.SaveChangesAsync();

        if (wasActive && !product.IsActive)
        {
            await RemoveProductFromCartsAndWishlistsAsync(product.Id);
        }

        return Ok(ToResponse(product, includeVideos: true));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound();
        }

        await RemoveProductFromCartsAndWishlistsAsync(product.Id);

        db.Products.Remove(product);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private async Task RemoveProductFromCartsAndWishlistsAsync(int productId)
    {
        await db.CartItems
            .Where(item => item.ProductId == productId)
            .ExecuteDeleteAsync();

        await db.Wishlist
            .Where(item => item.ProductId == productId)
            .ExecuteDeleteAsync();
    }

    private static ProductResponse ToResponse(Product product, bool includeVideos)
    {
        var images = DeserializeMedia(product.ImagesJson);
        var videos = DeserializeMedia(product.VideosJson);

        if (!string.IsNullOrWhiteSpace(product.PrimaryImageUrl) &&
            !images.Contains(product.PrimaryImageUrl, StringComparer.Ordinal))
        {
            images.Insert(0, product.PrimaryImageUrl);
        }

        if (images.Count == 0 && !string.IsNullOrWhiteSpace(product.PrimaryImageUrl))
        {
            images.Add(product.PrimaryImageUrl);
        }

        return new ProductResponse
        {
            Id = product.Id,
            Name = product.Name,
            Description = product.Description,
            Price = product.Price,
            Stock = product.Stock,
            CategoryName = product.CategoryName,
            IsActive = product.IsActive,
            PrimaryImageUrl = product.PrimaryImageUrl,
            Images = images,
            Videos = includeVideos ? videos : [],
            HasVideo = videos.Count > 0,
        };
    }

    private static List<string> BuildListImages(string? primaryImageUrl)
    {
        var listImageUrl = BuildListImageUrl(primaryImageUrl);

        if (!string.IsNullOrWhiteSpace(listImageUrl))
        {
            return [listImageUrl];
        }

        return [];
    }

    private static string? BuildListImageUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return null;
        }

        var trimmedImageUrl = imageUrl.Trim();

        // Keep list responses fast while allowing lightweight inline thumbnails.
        if (trimmedImageUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) &&
            trimmedImageUrl.Length > MaxInlineListImageLength)
        {
            return null;
        }

        return trimmedImageUrl;
    }

    private static void ApplyRequest(Product product, ProductUpsertRequest request)
    {
        var images = NormalizeMedia(request.Images);
        var videos = NormalizeMedia(request.Videos);
        var primaryImage = request.PrimaryImageUrl?.Trim();

        if (images.Count == 0 && !string.IsNullOrWhiteSpace(primaryImage))
        {
            images.Add(primaryImage);
        }

        product.Name = request.Name?.Trim() ?? "";
        product.Description = request.Description?.Trim() ?? "";
        var price = request.Price;
        var originalPrice = request.OriginalPrice > 0 ? request.OriginalPrice : price;
        if (originalPrice < price)
        {
            originalPrice = price;
        }

        product.OriginalPrice = originalPrice;
        product.Price = request.Price;
        product.Stock = request.Stock;
        product.CategoryName = request.CategoryName?.Trim() ?? "";
        product.IsActive = request.IsActive;
        product.PrimaryImageUrl = images.FirstOrDefault() ?? primaryImage ?? "";
        product.ImagesJson = SerializeMedia(images);
        product.VideosJson = SerializeMedia(videos);
    }

    private static List<string> NormalizeMedia(IEnumerable<string>? media) =>
        (media ?? [])
            .Select(item => item?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.Ordinal)
            .Cast<string>()
            .ToList();

    private static List<string> DeserializeMedia(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return NormalizeMedia(JsonSerializer.Deserialize<List<string>>(json, JsonOptions));
        }
        catch
        {
            return [];
        }
    }

    private static string SerializeMedia(IEnumerable<string> media) =>
        JsonSerializer.Serialize(NormalizeMedia(media), JsonOptions);
}

public class ProductUpsertRequest
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal OriginalPrice { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string CategoryName { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public string? PrimaryImageUrl { get; set; }
    public List<string> Images { get; set; } = [];
    public List<string> Videos { get; set; } = [];
}

public class ProductPatchRequest
{
    public bool? IsActive { get; set; }
    public int? Stock { get; set; }
}

public class ProductResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal OriginalPrice { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string CategoryName { get; set; } = "";
    public bool IsActive { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public List<string> Images { get; set; } = [];
    public List<string> Videos { get; set; } = [];
    public bool HasVideo { get; set; }
}
