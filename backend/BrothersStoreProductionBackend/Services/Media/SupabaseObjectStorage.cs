using Microsoft.Extensions.Options;

namespace BrothersStoreApi.Services.Media;

public sealed class SupabaseObjectStorage : IObjectStorage
{
    private readonly HttpClient httpClient;
    private readonly string projectUrl;
    private readonly string bucket;
    private readonly string serviceRoleKey;
    private readonly bool keyLooksLikeJwt;

    public SupabaseObjectStorage(IOptions<MediaOptions> options, HttpClient httpClient)
    {
        var opts = options.Value;

        projectUrl = opts.SupabaseProjectUrl?.TrimEnd('/')
            ?? throw new InvalidOperationException("Media:SupabaseProjectUrl must be set");

        bucket = opts.SupabaseBucket?.Trim()
            ?? throw new InvalidOperationException("Media:SupabaseBucket must be set");

        serviceRoleKey = opts.SupabaseServiceRoleKey?.Trim()
            ?? throw new InvalidOperationException("Media:SupabaseServiceRoleKey must be set");

        // Supabase now issues both JWT-style keys (legacy anon/service_role)
        // and opaque "sb_secret_..." keys. Only JWTs should be sent as Bearer tokens,
        // otherwise Supabase returns "Invalid Compact JWS".
        keyLooksLikeJwt = serviceRoleKey.Count(c => c == '.') == 2;

        this.httpClient = httpClient;
    }

    public async Task UploadAsync(
        string objectName,
        Stream content,
        string contentType,
        string cacheControl,
        CancellationToken cancellationToken)
    {
        var url = $"{projectUrl}/storage/v1/object/{bucket}/{objectName}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);

        request.Headers.Add("apikey", serviceRoleKey);
        if (keyLooksLikeJwt)
        {
            request.Headers.Add("Authorization", $"Bearer {serviceRoleKey}");
        }
        request.Headers.Add("x-upsert", "true");
        request.Headers.Add("cache-control", cacheControl);

        request.Content = new StreamContent(content);
        request.Content.Headers.ContentType =
            new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);

        var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Supabase upload failed ({response.StatusCode}): {body}");
        }
    }

    public string GetPublicUrl(string objectName)
    {
        var normalized = objectName.Replace('\\', '/').TrimStart('/');
        return $"{projectUrl}/storage/v1/object/public/{bucket}/{normalized}";
    }

    public async Task<bool> ExistsAsync(string objectName, CancellationToken cancellationToken)
    {
        var url = $"{projectUrl}/storage/v1/object/info/public/{bucket}/{objectName}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("apikey", serviceRoleKey);
        if (keyLooksLikeJwt)
        {
            request.Headers.Add("Authorization", $"Bearer {serviceRoleKey}");
        }

        var response = await httpClient.SendAsync(request, cancellationToken);
        return response.IsSuccessStatusCode;
    }

    public async Task<ObjectReadResult?> OpenReadAsync(string objectName, CancellationToken cancellationToken)
    {
        var url = $"{projectUrl}/storage/v1/object/public/{bucket}/{objectName}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var contentType = response.Content.Headers.ContentType?.MediaType
            ?? "application/octet-stream";

        var stream = new MemoryStream();
        await response.Content.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        return new ObjectReadResult
        {
            Content = stream,
            ContentType = contentType,
        };
    }
}
