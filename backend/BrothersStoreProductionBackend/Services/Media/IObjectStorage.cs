namespace BrothersStoreApi.Services.Media;

public interface IObjectStorage
{
    Task UploadAsync(
        string objectName,
        Stream content,
        string contentType,
        string cacheControl,
        CancellationToken cancellationToken);

    string GetPublicUrl(string objectName);

    Task<bool> ExistsAsync(string objectName, CancellationToken cancellationToken);

    Task<ObjectReadResult?> OpenReadAsync(string objectName, CancellationToken cancellationToken);
}

public sealed class ObjectReadResult : IAsyncDisposable
{
    public required Stream Content { get; init; }
    public required string ContentType { get; init; }

    public ValueTask DisposeAsync() => Content.DisposeAsync();
}
