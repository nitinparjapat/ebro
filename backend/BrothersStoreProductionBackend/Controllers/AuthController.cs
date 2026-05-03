using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using BrothersStoreApi.Services;
using System.Security.Claims;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/auth")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly IJwtTokenService jwtTokenService;
    private readonly IGoogleAuthService googleAuthService;

    // Admin emails list
    public AuthController(AppDbContext d, IJwtTokenService jwt, IGoogleAuthService google)
    {
        db = d;
        jwtTokenService = jwt;
        googleAuthService = google;
    }

    [HttpPost("google-login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.IdToken))
        {
            return BadRequest(new { message = "IdToken is required" });
        }

        // Verify Google token
        var googleToken = await googleAuthService.VerifyTokenAsync(request.IdToken);
        if (googleToken == null || string.IsNullOrWhiteSpace(googleToken.Email))
        {
            return Unauthorized(new { message = "Invalid Google token" });
        }

        var email = googleToken.Email.ToLower();
        var resolvedName = ResolveUserName(googleToken, email);
        
        // Check if email is admin
        var isAdmin = AdminRoleConfiguration.AdminEmails.Any(a => a.Equals(email, StringComparison.OrdinalIgnoreCase));

        // Find existing user or create new one
        var user = db.Users.FirstOrDefault(u => u.Email == email);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                Name = resolvedName,
                Role = isAdmin ? "Admin" : "User",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
        }
        else
        {
            if (!string.Equals(user.Name, resolvedName, StringComparison.Ordinal) &&
                (!string.IsNullOrWhiteSpace(resolvedName) || string.Equals(user.Name, "User", StringComparison.OrdinalIgnoreCase)))
            {
                user.Name = resolvedName;
            }

            // Update role if it was changed (e.g., from User to Admin)
            if (isAdmin && user.Role != "Admin")
            {
                user.Role = "Admin";
            }
        }

        await db.SaveChangesAsync();

        // Generate JWT token
        var jwtToken = jwtTokenService.GenerateToken(user);

        return Ok(new
        {
            success = true,
            token = jwtToken,
            user = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                createdAt = user.CreatedAt,
                picture = googleToken.Picture
            }
        });
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var name = User.FindFirst(ClaimTypes.Name)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        return Ok(new
        {
            id = userId,
            email = email,
            name = name,
            role = role
        });
    }

    [HttpPost("logout")]
    [EnableRateLimiting("write")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Logged out successfully" });
    }

    private static string ResolveUserName(GoogleTokenResponse googleToken, string email)
    {
        if (!string.IsNullOrWhiteSpace(googleToken.Name))
        {
            return googleToken.Name.Trim();
        }

        var composedName = $"{googleToken.GivenName} {googleToken.FamilyName}".Trim();
        if (!string.IsNullOrWhiteSpace(composedName))
        {
            return composedName;
        }

        var emailName = email.Split('@', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(emailName))
        {
            var parts = emailName
                .Replace('.', ' ')
                .Replace('_', ' ')
                .Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length > 0)
            {
                return string.Join(
                    " ",
                    parts.Select(part => char.ToUpperInvariant(part[0]) + part[1..])
                );
            }
        }

        return "User";
    }
}

public class GoogleLoginRequest
{
    public string IdToken { get; set; } = "";
}
