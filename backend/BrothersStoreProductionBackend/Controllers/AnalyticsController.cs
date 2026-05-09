using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext db;

    public AnalyticsController(AppDbContext db)
    {
        this.db = db;
    }

    [HttpPost("visit")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> RecordVisit([FromBody] VisitCreateRequest request)
    {
        var clientKey = request.ClientKey?.Trim();
        if (string.IsNullOrWhiteSpace(clientKey))
        {
            return BadRequest(new { message = "Client key is required." });
        }

        var visitDateUtc = DateTime.UtcNow.Date;
        var alreadyRecorded = await db.WebsiteVisits.AnyAsync(visit =>
            visit.ClientKey == clientKey && visit.VisitDateUtc == visitDateUtc);

        if (!alreadyRecorded)
        {
            db.WebsiteVisits.Add(new WebsiteVisit
            {
                ClientKey = clientKey,
                Path = request.Path?.Trim() ?? "/",
                VisitDateUtc = visitDateUtc,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        return Ok(new { recorded = !alreadyRecorded });
    }

    [HttpGet("summary")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetSummary()
    {
        var uniqueVisitors = await db.WebsiteVisits
            .Select(visit => visit.ClientKey)
            .Distinct()
            .CountAsync();
        var totalVisitors = await db.WebsiteVisits.CountAsync();

        return Ok(new
        {
            uniqueVisitors,
            totalVisitors,
        });
    }
}

public class VisitCreateRequest
{
    public string ClientKey { get; set; } = "";
    public string Path { get; set; } = "/";
}
