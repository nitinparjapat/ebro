using System.Security.Claims;
using BrothersStoreApi.Data;
using BrothersStoreApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/users/me/addresses")]
[Authorize]
[EnableRateLimiting("write")]
public class UserAddressesController : ControllerBase
{
    private readonly AppDbContext db;

    public UserAddressesController(AppDbContext db)
    {
        this.db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var addresses = await db.Addresses
            .AsNoTracking()
            .Where(address => address.UserId == userId)
            .OrderByDescending(address => address.IsDefault)
            .ThenByDescending(address => address.Id)
            .ToListAsync();

        return Ok(addresses.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserAddressUpsertRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var addressCount = await db.Addresses.AsNoTracking().CountAsync(address => address.UserId == userId);
        if (addressCount >= 10)
        {
            return BadRequest(new { message = "You can save up to 10 addresses." });
        }

        var address = new Address
        {
            UserId = userId,
            Label = (request.Label ?? "").Trim(),
            IsDefault = request.IsDefault,
            FullName = (request.FullName ?? "").Trim(),
            Mobile = (request.Mobile ?? "").Trim(),
            AlternateMobile = (request.AlternateMobile ?? "").Trim(),
            Pincode = (request.Pincode ?? "").Trim(),
            AddressLine1 = (request.AddressLine1 ?? "").Trim(),
            AddressLine2 = (request.AddressLine2 ?? "").Trim(),
            Landmark = (request.Landmark ?? "").Trim(),
            City = (request.City ?? "").Trim(),
            State = (request.State ?? "").Trim(),
            Country = string.IsNullOrWhiteSpace(request.Country) ? "India" : request.Country.Trim(),

            // Legacy columns (keep in sync).
            Line1 = (request.AddressLine1 ?? "").Trim(),
            PostalCode = (request.Pincode ?? "").Trim(),
        };

        if (address.IsDefault)
        {
            await UnsetDefaultAsync(userId);
        }

        db.Addresses.Add(address);
        await db.SaveChangesAsync();

        if (!await db.Addresses.AsNoTracking().AnyAsync(item => item.UserId == userId && item.IsDefault))
        {
            address.IsDefault = true;
            await db.SaveChangesAsync();
        }

        return Ok(ToResponse(address));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserAddressUpsertRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var address = await db.Addresses.FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId);
        if (address == null)
        {
            return NotFound(new { message = "Address not found." });
        }

        address.Label = (request.Label ?? "").Trim();
        address.FullName = (request.FullName ?? "").Trim();
        address.Mobile = (request.Mobile ?? "").Trim();
        address.AlternateMobile = (request.AlternateMobile ?? "").Trim();
        address.Pincode = (request.Pincode ?? "").Trim();
        address.AddressLine1 = (request.AddressLine1 ?? "").Trim();
        address.AddressLine2 = (request.AddressLine2 ?? "").Trim();
        address.Landmark = (request.Landmark ?? "").Trim();
        address.City = (request.City ?? "").Trim();
        address.State = (request.State ?? "").Trim();
        address.Country = string.IsNullOrWhiteSpace(request.Country) ? "India" : request.Country.Trim();

        // Legacy columns (keep in sync).
        address.Line1 = address.AddressLine1;
        address.PostalCode = address.Pincode;

        if (request.IsDefault && !address.IsDefault)
        {
            await UnsetDefaultAsync(userId);
            address.IsDefault = true;
        }

        await db.SaveChangesAsync();
        return Ok(ToResponse(address));
    }

    [HttpPut("{id:int}/default")]
    public async Task<IActionResult> MakeDefault(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var address = await db.Addresses.FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId);
        if (address == null)
        {
            return NotFound(new { message = "Address not found." });
        }

        await UnsetDefaultAsync(userId);
        address.IsDefault = true;
        await db.SaveChangesAsync();

        return Ok(ToResponse(address));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var address = await db.Addresses.FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId);
        if (address == null)
        {
            return NotFound(new { message = "Address not found." });
        }

        var wasDefault = address.IsDefault;
        db.Addresses.Remove(address);
        await db.SaveChangesAsync();

        if (wasDefault)
        {
            var nextDefault = await db.Addresses
                .Where(item => item.UserId == userId)
                .OrderByDescending(item => item.Id)
                .FirstOrDefaultAsync();

            if (nextDefault != null)
            {
                nextDefault.IsDefault = true;
                await db.SaveChangesAsync();
            }
        }

        return Ok(new { deleted = true });
    }

    private async Task UnsetDefaultAsync(string userId)
    {
        var defaults = await db.Addresses.Where(item => item.UserId == userId && item.IsDefault).ToListAsync();
        if (defaults.Count == 0)
        {
            return;
        }

        foreach (var item in defaults)
        {
            item.IsDefault = false;
        }

        await db.SaveChangesAsync();
    }

    private static object ToResponse(Address address) => new
    {
        id = address.Id,
        label = address.Label,
        isDefault = address.IsDefault,
        fullName = address.FullName,
        mobile = address.Mobile,
        alternateMobile = address.AlternateMobile,
        pincode = address.Pincode,
        addressLine1 = address.AddressLine1,
        addressLine2 = address.AddressLine2,
        landmark = address.Landmark,
        city = address.City,
        state = address.State,
        country = address.Country,
    };
}

public class UserAddressUpsertRequest
{
    public string? Label { get; set; }
    public bool IsDefault { get; set; }
    public string? FullName { get; set; }
    public string? Mobile { get; set; }
    public string? AlternateMobile { get; set; }
    public string? Pincode { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? Landmark { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
}

