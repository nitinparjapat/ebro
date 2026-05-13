using System.Text.Json;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using BrothersStoreApi.Services.Caching;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private const int MaxInlineListImageLength = 80_000;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan ProductListCacheDuration = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan ProductDetailCacheDuration = TimeSpan.FromMinutes(5);

    private readonly AppDbContext db;
    private readonly IMemoryCache cache;

    public ProductsController(AppDbContext d, IMemoryCache cache)
    {
        db = d;
        this.cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> Get(int page = 1, int pageSize = 50, bool includeInactive = false)
    {
        var cacheKey = ProductCacheKeys.BuildList(page, pageSize, includeInactive);
        if (cache.TryGetValue(cacheKey, out List<ProductResponse>? cachedProducts) && cachedProducts != null)
        {
            return Ok(cachedProducts);
        }

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
        var reviewSummaries = await GetReviewSummariesAsync(products.Select(product => product.Id).ToList());

        var responses = products.Select(product =>
        {
            reviewSummaries.TryGetValue(product.Id, out var reviewSummary);

            return new ProductResponse
            {
                Id = product.Id,
                Name = product.Name,
                Description = string.Empty,
                OriginalPrice = product.OriginalPrice,
                Price = product.Price,
                Stock = product.Stock,
                CategoryName = product.CategoryName,
                IsActive = product.IsActive,
                PrimaryImageUrl = BuildListImageUrl(product.PrimaryImageUrl),
                Images = BuildListImages(product.PrimaryImageUrl),
                Videos = [],
                HasVideo = HasVideo(product.VideosJson),
                ReviewCount = reviewSummary?.ReviewCount ?? 0,
                AverageRating = reviewSummary?.AverageRating ?? 0,
            };
        }).ToList();

        cache.Set(cacheKey, responses, ProductListCacheDuration);
        return Ok(responses);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var cacheKey = ProductCacheKeys.BuildDetail(id);
        if (cache.TryGetValue(cacheKey, out ProductResponse? cachedProduct) && cachedProduct != null)
        {
            return Ok(cachedProduct);
        }

        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);

        if (product == null)
        {
            return NotFound();
        }

        var response = ToResponse(
            product,
            includeVideos: true,
            await GetReviewSummaryAsync(id));
        cache.Set(cacheKey, response, ProductDetailCacheDuration);
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Create([FromBody] ProductUpsertRequest request)
    {
        var inlineError = ValidateNoInlineMedia(request);
        if (inlineError != null)
        {
            return inlineError;
        }

        var product = new Product();
        ApplyRequest(product, request);

        db.Products.Add(product);
        await db.SaveChangesAsync();
        ProductCacheKeys.Invalidate(cache, product.Id);

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

        var inlineError = ValidateNoInlineMedia(request);
        if (inlineError != null)
        {
            return inlineError;
        }

        ApplyRequest(product, request);
        await db.SaveChangesAsync();
        ProductCacheKeys.Invalidate(cache, product.Id);

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
        ProductCacheKeys.Invalidate(cache, product.Id);

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
        ProductCacheKeys.Invalidate(cache, product.Id);

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

    private static ProductResponse ToResponse(Product product, bool includeVideos, ProductReviewSummary? reviewSummary = null)
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
            OriginalPrice = product.OriginalPrice,
            Price = product.Price,
            Stock = product.Stock,
            CategoryName = product.CategoryName,
            IsActive = product.IsActive,
            PrimaryImageUrl = product.PrimaryImageUrl,
            Images = images,
            Videos = includeVideos ? videos : [],
            HasVideo = videos.Count > 0,
            ReviewCount = reviewSummary?.ReviewCount ?? 0,
            AverageRating = reviewSummary?.AverageRating ?? 0,
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
        var originalPrice = request.OriginalPrice.HasValue && request.OriginalPrice.Value > 0
            ? request.OriginalPrice.Value
            : product.OriginalPrice > 0
                ? product.OriginalPrice
                : price;
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

    private static IActionResult? ValidateNoInlineMedia(ProductUpsertRequest request)
    {
        if (IsInlineDataUri(request.PrimaryImageUrl))
        {
            return new BadRequestObjectResult(new { message = "Inline base64 images are not supported. Upload images and store the returned URL instead." });
        }

        foreach (var image in request.Images ?? [])
        {
            if (IsInlineDataUri(image))
            {
                return new BadRequestObjectResult(new { message = "Inline base64 images are not supported. Upload images and store the returned URL instead." });
            }
        }

        return null;
    }

    private static bool IsInlineDataUri(string? value) =>
        !string.IsNullOrWhiteSpace(value) &&
        value.TrimStart().StartsWith("data:", StringComparison.OrdinalIgnoreCase);

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

    private async Task<Dictionary<int, ProductReviewSummary>> GetReviewSummariesAsync(List<int> productIds)
    {
        if (productIds.Count == 0)
        {
            return [];
        }

        return await db.Reviews
            .AsNoTracking()
            .Where(review => productIds.Contains(review.ProductId) && review.Status == "Approved")
            .GroupBy(review => review.ProductId)
            .Select(group => new ProductReviewSummary
            {
                ProductId = group.Key,
                ReviewCount = group.Count(),
                AverageRating = group.Average(review => (double)review.Rating),
            })
            .ToDictionaryAsync(summary => summary.ProductId);
    }

    private Task<ProductReviewSummary?> GetReviewSummaryAsync(int productId) =>
        db.Reviews
            .AsNoTracking()
            .Where(review => review.ProductId == productId && review.Status == "Approved")
            .GroupBy(review => review.ProductId)
            .Select(group => new ProductReviewSummary
            {
                ProductId = group.Key,
                ReviewCount = group.Count(),
                AverageRating = group.Average(review => (double)review.Rating),
            })
            .FirstOrDefaultAsync();

    private static bool HasVideo(string? videosJson) =>
        !string.IsNullOrWhiteSpace(videosJson) &&
        !string.Equals(videosJson.Trim(), "[]", StringComparison.Ordinal);
}

public class ProductUpsertRequest
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal? OriginalPrice { get; set; }
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
    public int ReviewCount { get; set; }
    public double AverageRating { get; set; }
}

public sealed class ProductReviewSummary
{
    public int ProductId { get; set; }
    public int ReviewCount { get; set; }
    public double AverageRating { get; set; }
}
