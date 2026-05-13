namespace BrothersStoreApi.Services.Media;

public class MediaOptions
{
    /// <summary>
    /// Storage mode. Supported: "gcs", "local".
    /// Defaults to "local" when not set.
    /// </summary>
    public string Mode { get; set; } = "local";

    /// <summary>
    /// GCS bucket name for media storage (required when Mode == "gcs").
    /// </summary>
    public string? Bucket { get; set; }

    /// <summary>
    /// Optional public base URL for the bucket / CDN (example: https://cdn.example.com).
    /// When not set, uses https://storage.googleapis.com/{Bucket}.
    /// </summary>
    public string? PublicBaseUrl { get; set; }

    /// <summary>
    /// Local static-files prefix under wwwroot (only for Mode == "local").
    /// Defaults to "_media" -> served at "/_media/*".
    /// </summary>
    public string LocalPublicPrefix { get; set; } = "_media";
}

