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
    /// Optional public base URL for the bucket / CDN
    /// (example: https://cdn.example.com).
    /// When not set, uses https://storage.googleapis.com/{Bucket}.
    /// </summary>
    public string? PublicBaseUrl { get; set; }

    /// <summary>
    /// Local static-files prefix under wwwroot
    /// (only for Mode == "local").
    /// Defaults to "/media" -> served at "/media/...".
    /// </summary>
    public string LocalPublicPrefix { get; set; } = "media";

    /// <summary>
    /// Supabase project URL (required when Mode == "supabase").
    /// Example: https://your-project-id.supabase.co
    /// </summary>
    public string? SupabaseProjectUrl { get; set; }

    /// <summary>
    /// Supabase storage bucket name
    /// (required when Mode == "supabase").
    /// </summary>
    public string? SupabaseBucket { get; set; }

    /// <summary>
    /// Supabase service role secret key
    /// (required when Mode == "supabase").
    /// </summary>
    public string? SupabaseServiceRoleKey { get; set; }
}
