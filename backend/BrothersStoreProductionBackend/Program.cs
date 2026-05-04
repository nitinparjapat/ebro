using BrothersStoreApi.Data;
using BrothersStoreApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc.WriteTo.Console());

var cloudRunPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(cloudRunPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{cloudRunPort}");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat([
        "application/json"
    ]);
});
builder.Services.Configure<Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions>(options =>
{
    options.Limits.MaxConcurrentConnections = 200;
    options.Limits.MaxConcurrentUpgradedConnections = 100;
    options.Limits.MaxRequestBodySize = 20 * 1024 * 1024;
    options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(15);
});

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var configuredConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var connectionString = !string.IsNullOrWhiteSpace(databaseUrl)
    ? NormalizeDatabaseUrl(databaseUrl)
    : configuredConnectionString;

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Database connection string is required. Configure DATABASE_URL or ConnectionStrings:DefaultConnection.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (IsPostgresConnectionString(connectionString))
    {
        options.UseNpgsql(connectionString);
        return;
    }

    options.UseSqlServer(connectionString);
});

builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

    options.AddPolicy("vite", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"message\":\"Too many requests. Please wait a moment and try again.\"}",
            cancellationToken
        );
    };

    options.GlobalLimiter = PartitionedRateLimiter.CreateChained<HttpContext>(
        PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            RateLimitPartition.GetConcurrencyLimiter(
                GetRateLimitKey(httpContext),
                _ => new ConcurrencyLimiterOptions
                {
                    PermitLimit = 40,
                    QueueLimit = 20,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                }
            )
        ),
        PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                GetRateLimitKey(httpContext),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 120,
                    Window = TimeSpan.FromMinutes(1),
                    AutoReplenishment = true,
                    QueueLimit = 0,
                }
            )
        )
    );

    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetRateLimitKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 8,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0,
            }
        )
    );

    options.AddPolicy("write", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetRateLimitKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0,
            }
        )
    );
});

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<IGoogleAuthService, GoogleAuthService>();
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
builder.Services.Configure<AdminNotificationOptions>(builder.Configuration.GetSection("AdminNotification"));
builder.Services.Configure<PublicSiteOptions>(builder.Configuration.GetSection("PublicSite"));
builder.Services.AddScoped<IOrderEmailNotificationService, OrderEmailNotificationService>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"] ?? "your-secret-key-min-32-characters-long!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "BrothersStoreApi",
        ValidAudience = jwtSettings["Audience"] ?? "BrothersStoreClient",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';";

    if (context.Request.Path.StartsWithSegments("/api"))
    {
        headers["Cache-Control"] = "no-store";
        headers["Pragma"] = "no-cache";
    }

    await next();
});

app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("vite");

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.Run();

static string GetRateLimitKey(HttpContext httpContext)
{
    var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

    if (!string.IsNullOrWhiteSpace(userId))
    {
        return $"user:{userId}";
    }

    var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    var ip = forwardedFor?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()
        ?? httpContext.Connection.RemoteIpAddress?.ToString()
        ?? "unknown";

    return $"ip:{ip}";
}

static bool IsPostgresConnectionString(string connectionString)
{
    var normalized = connectionString.Trim();

    return normalized.StartsWith("Host=", StringComparison.OrdinalIgnoreCase)
        || normalized.StartsWith("Server=", StringComparison.OrdinalIgnoreCase) && normalized.Contains("Port=")
        || normalized.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || normalized.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
}

static string NormalizeDatabaseUrl(string databaseUrl)
{
    if (databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var database = uri.AbsolutePath.TrimStart('/');

        return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
    }

    return databaseUrl;
}
