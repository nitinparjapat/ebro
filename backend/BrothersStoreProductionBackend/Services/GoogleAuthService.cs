using System.Net.Http.Json;

namespace BrothersStoreApi.Services;

public interface IGoogleAuthService
{
    Task<GoogleTokenResponse?> VerifyTokenAsync(string idToken);
}

public class GoogleAuthService : IGoogleAuthService
{
    private readonly HttpClient httpClient;
    private readonly IConfiguration configuration;
    private readonly string googleTokenValidationUrl = "https://www.googleapis.com/oauth2/v1/tokeninfo";

    public GoogleAuthService(HttpClient client, IConfiguration config)
    {
        httpClient = client;
        configuration = config;
    }

    public async Task<GoogleTokenResponse?> VerifyTokenAsync(string idToken)
    {
        try
        {
            var url = $"{googleTokenValidationUrl}?id_token={idToken}";
            var response = await httpClient.GetAsync(url);
            
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<GoogleTokenResponse>();
            }

            return null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error verifying Google token: {ex.Message}");
            return null;
        }
    }
}

public class GoogleTokenResponse
{
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? Picture { get; set; }
    public string? Aud { get; set; }
    public string? GivenName { get; set; }
    public string? FamilyName { get; set; }
}
