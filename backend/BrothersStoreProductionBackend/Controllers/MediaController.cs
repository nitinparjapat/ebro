using BrothersStoreApi.Services.Media;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BrothersStoreApi.Controllers;

[ApiController]
public class MediaController : ControllerBase
{
    private readonly ImageUploadService imageUploadService;

    public MediaController(ImageUploadService imageUploadService)
    {
        this.imageUploadService = imageUploadService;
    }

    [HttpPost("api/media/images")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("write")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null)
        {
            return BadRequest(new { message = "file is required." });
        }

        try
        {
            var result = await imageUploadService.UploadProductImageAsync(file, cancellationToken);
            var absoluteUrl = $"{Request.Scheme}://{Request.Host}{result.PublicUrl}";
            return Ok(new { id = result.ImageId, url = absoluteUrl });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("media/images/{id}")]
    [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Any, NoStore = false)]
    public async Task<IActionResult> GetImage(string id, [FromQuery] int? w, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return NotFound();
        }

        var accept = Request.Headers.Accept.ToString();
        await using var result = await imageUploadService.OpenVariantAsync(id.Trim(), w, accept, cancellationToken);
        if (result == null)
        {
            return NotFound();
        }

        Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
        Response.Headers["Vary"] = "Accept";

        return File(result.Content, result.ContentType);
    }
}
