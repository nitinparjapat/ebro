using Microsoft.Extensions.Options;

namespace BrothersStoreApi.Services.Media;

public sealed class LocalObjectStorage : IObjectStorage
{
    private readonly IWebHostEnvironment env;
    private readonly MediaOptions options;

    public LocalObjectStorage(IWebHostEnvironment env, IOptions<MediaOptions> options)
    {
        this.env = env;
        this.options = options.Value;
    }

    public async Task UploadAsync(
        string objectName,
        Stream content,
        string contentType,
        string cacheControl,
        CancellationToken cancellationToken)
    {
        var physicalPath = GetPhysicalPath(objectName);
        var directory = Path.GetDirectoryName(physicalPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var fileStream = File.Create(physicalPath);
        await content.CopyToAsync(fileStream, cancellationToken);
    }

    public string GetPublicUrl(string objectName)
    {
        var prefix = options.LocalPublicPrefix.Trim('/').Trim();
        var normalized = objectName.Replace('\\', '/').TrimStart('/');
        return $"/{prefix}/{normalized}";
    }

    public Task<bool> ExistsAsync(string objectName, CancellationToken cancellationToken)
    {
        var physicalPath = GetPhysicalPath(objectName);
        return Task.FromResult(File.Exists(physicalPath));
    }

    public Task<ObjectReadResult?> OpenReadAsync(string objectName, CancellationToken cancellationToken)
    {
        var physicalPath = GetPhysicalPath(objectName);
        if (!File.Exists(physicalPath))
        {
            return Task.FromResult<ObjectReadResult?>(null);
        }

        var extension = Path.GetExtension(physicalPath);
        var contentType = extension.Equals(".webp", StringComparison.OrdinalIgnoreCase)
            ? "image/webp"
            : extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase) || extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
                ? "image/jpeg"
                : "application/octet-stream";

        Stream stream = File.OpenRead(physicalPath);
        return Task.FromResult<ObjectReadResult?>(new ObjectReadResult
        {
            Content = stream,
            ContentType = contentType,
        });
    }

    private string GetPhysicalPath(string objectName)
    {
        var normalized = objectName.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        var prefix = options.LocalPublicPrefix.Trim('/').Trim();
        return Path.Combine(env.ContentRootPath, "wwwroot", prefix, normalized);
    }
}
