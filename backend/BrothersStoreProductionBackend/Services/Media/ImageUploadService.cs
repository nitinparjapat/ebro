using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace BrothersStoreApi.Services.Media;

public sealed class ImageUploadService
{
    private const int MaxUploadBytes = 12 * 1024 * 1024;

    private readonly IObjectStorage storage;

    public ImageUploadService(IObjectStorage storage)
    {
        this.storage = storage;
    }

    public async Task<ImageUploadResult> UploadProductImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("Empty file.");
        }

        if (file.Length > MaxUploadBytes)
        {
            throw new InvalidOperationException("Image is too large. Keep each image under 12 MB.");
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Unsupported image type.");
        }

        var imageId = Guid.NewGuid().ToString("N");
        var cacheControl = "public, max-age=31536000, immutable";

        await using var input = file.OpenReadStream();
        using var image = await Image.LoadAsync(input, cancellationToken);
        image.Mutate(ctx => ctx.AutoOrient());

        foreach (var width in ImageVariantPlanner.Widths)
        {
            using var clone = image.Clone(ctx =>
            {
                ctx.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(width, 0),
                    Sampler = KnownResamplers.Lanczos3,
                });
            });

            await UploadWebpVariantAsync(imageId, width, clone, cacheControl, cancellationToken);
            await UploadJpegVariantAsync(imageId, width, clone, cacheControl, cancellationToken);
        }

        return new ImageUploadResult
        {
            ImageId = imageId,
            PublicUrl = $"/media/images/{imageId}",
        };
    }

    private async Task UploadWebpVariantAsync(
        string imageId,
        int width,
        Image image,
        string cacheControl,
        CancellationToken cancellationToken)
    {
        await using var outStream = new MemoryStream();
        await image.SaveAsWebpAsync(outStream, new WebpEncoder
        {
            Quality = 75,
            FileFormat = WebpFileFormatType.Lossy,
            Method = WebpEncodingMethod.BestQuality,
        }, cancellationToken);
        outStream.Position = 0;

        await storage.UploadAsync(
            $"images/{imageId}/w{width}.webp",
            outStream,
            "image/webp",
            cacheControl,
            cancellationToken);
    }

    private async Task UploadJpegVariantAsync(
        string imageId,
        int width,
        Image image,
        string cacheControl,
        CancellationToken cancellationToken)
    {
        await using var outStream = new MemoryStream();
        await image.SaveAsJpegAsync(outStream, new JpegEncoder
        {
            Quality = 80,
        }, cancellationToken);
        outStream.Position = 0;

        await storage.UploadAsync(
            $"images/{imageId}/w{width}.jpg",
            outStream,
            "image/jpeg",
            cacheControl,
            cancellationToken);
    }

    public Task<string> ResolveVariantUrlAsync(
        string imageId,
        int? width,
        string? acceptHeader,
        CancellationToken cancellationToken)
    {
        var (objectName, _) = ResolveVariantObject(imageId, width, acceptHeader);
        return Task.FromResult(storage.GetPublicUrl(objectName));
    }

    public Task<ObjectReadResult?> OpenVariantAsync(
        string imageId,
        int? width,
        string? acceptHeader,
        CancellationToken cancellationToken)
    {
        var (objectName, _) = ResolveVariantObject(imageId, width, acceptHeader);
        return storage.OpenReadAsync(objectName, cancellationToken);
    }

    private static (string objectName, string contentType) ResolveVariantObject(
        string imageId,
        int? width,
        string? acceptHeader)
    {
        var chosenWidth = ImageVariantPlanner.PickWidth(width);
        var prefersWebp = acceptHeader?.IndexOf("image/webp", StringComparison.OrdinalIgnoreCase) >= 0;

        return prefersWebp
            ? ($"images/{imageId}/w{chosenWidth}.webp", "image/webp")
            : ($"images/{imageId}/w{chosenWidth}.jpg", "image/jpeg");
    }
}

public sealed class ImageUploadResult
{
    public string ImageId { get; set; } = "";
    public string PublicUrl { get; set; } = "";
}
