using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Options;

namespace BrothersStoreApi.Services.Media;

public sealed class GcsObjectStorage : IObjectStorage
{
    private readonly MediaOptions options;
    private readonly StorageClient client;
    private readonly string bucket;
    private readonly string publicBaseUrl;

    public GcsObjectStorage(IOptions<MediaOptions> options)
    {
        this.options = options.Value;
        client = StorageClient.Create();
        bucket = this.options.Bucket?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(bucket))
        {
            throw new InvalidOperationException("Media:Bucket must be set when Media:Mode is 'gcs'.");
        }

        publicBaseUrl = string.IsNullOrWhiteSpace(this.options.PublicBaseUrl)
            ? $"https://storage.googleapis.com/{bucket}"
            : this.options.PublicBaseUrl.TrimEnd('/');
    }

    public async Task UploadAsync(
        string objectName,
        Stream content,
        string contentType,
        string cacheControl,
        CancellationToken cancellationToken)
    {
        var storageObject = await client.UploadObjectAsync(
            bucket,
            objectName,
            contentType,
            content,
            new UploadObjectOptions
            {
                PredefinedAcl = PredefinedObjectAcl.PublicRead,
            },
            cancellationToken
        );

        storageObject.CacheControl = cacheControl;
        await client.UpdateObjectAsync(storageObject, cancellationToken: cancellationToken);
    }

    public string GetPublicUrl(string objectName)
    {
        var normalized = objectName.Replace('\\', '/').TrimStart('/');
        return $"{publicBaseUrl}/{normalized}";
    }

    public async Task<bool> ExistsAsync(string objectName, CancellationToken cancellationToken)
    {
        try
        {
            _ = await client.GetObjectAsync(bucket, objectName, cancellationToken: cancellationToken);
            return true;
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public async Task<ObjectReadResult?> OpenReadAsync(string objectName, CancellationToken cancellationToken)
    {
        try
        {
            var storageObject = await client.GetObjectAsync(bucket, objectName, cancellationToken: cancellationToken);
            var contentType = string.IsNullOrWhiteSpace(storageObject.ContentType)
                ? "application/octet-stream"
                : storageObject.ContentType;

            var outStream = new MemoryStream();
            await client.DownloadObjectAsync(bucket, objectName, outStream, cancellationToken: cancellationToken);
            outStream.Position = 0;

            return new ObjectReadResult
            {
                Content = outStream,
                ContentType = contentType,
            };
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
