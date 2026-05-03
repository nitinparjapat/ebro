using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory httpClientFactory;

    public LocationsController(IHttpClientFactory httpClientFactory)
    {
        this.httpClientFactory = httpClientFactory;
    }

    [HttpGet("pincode/{pincode}")]
    public async Task<IActionResult> LookupPincode(string pincode)
    {
        var cleanPincode = new string((pincode ?? "").Where(char.IsDigit).ToArray());

        if (cleanPincode.Length != 6)
        {
            return BadRequest(new { message = "Enter a valid 6 digit pincode." });
        }

        var client = httpClientFactory.CreateClient();
        using var response = await client.GetAsync($"https://api.postalpincode.in/pincode/{cleanPincode}");

        if (!response.IsSuccessStatusCode)
        {
            return StatusCode(502, new { message = "Unable to verify this pincode right now." });
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync();
        var payload = await JsonSerializer.DeserializeAsync<List<PostalPincodeResponse>>(responseStream, JsonOptions);
        var result = payload?.FirstOrDefault();
        var firstPostOffice = result?.PostOffice?.FirstOrDefault();

        if (!string.Equals(result?.Status, "Success", StringComparison.OrdinalIgnoreCase) ||
            firstPostOffice == null)
        {
            return NotFound(new { message = "No city or state found for this pincode." });
        }

        return Ok(new
        {
            pincode = cleanPincode,
            city = firstPostOffice.District?.Trim() ?? "",
            state = firstPostOffice.State?.Trim() ?? "",
            postOffice = firstPostOffice.Name?.Trim() ?? "",
        });
    }
}

public sealed class PostalPincodeResponse
{
    public string Status { get; set; } = "";
    public string Message { get; set; } = "";
    public List<PostalPincodePostOffice> PostOffice { get; set; } = new();
}

public sealed class PostalPincodePostOffice
{
    public string Name { get; set; } = "";
    public string District { get; set; } = "";
    public string State { get; set; } = "";
}
