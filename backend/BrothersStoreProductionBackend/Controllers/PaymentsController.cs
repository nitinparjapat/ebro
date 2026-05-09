using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BrothersStoreApi.Data;
using BrothersStoreApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BrothersStoreApi.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly IHttpClientFactory httpClientFactory;
    private readonly RazorpayOptions razorpayOptions;

    public PaymentsController(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IOptions<RazorpayOptions> razorpayOptions
    )
    {
        this.db = db;
        this.httpClientFactory = httpClientFactory;
        this.razorpayOptions = razorpayOptions.Value;

        // Support both Razorpay__KeyId style and RAZORPAY_KEY_ID style env vars.
        // Never expose the secret to the frontend.
        this.razorpayOptions.KeyId = string.IsNullOrWhiteSpace(this.razorpayOptions.KeyId)
            ? Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID")?.Trim() ?? ""
            : this.razorpayOptions.KeyId;

        this.razorpayOptions.KeySecret = string.IsNullOrWhiteSpace(this.razorpayOptions.KeySecret)
            ? Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET")?.Trim() ?? ""
            : this.razorpayOptions.KeySecret;

        this.razorpayOptions.MerchantName = string.IsNullOrWhiteSpace(this.razorpayOptions.MerchantName)
            ? Environment.GetEnvironmentVariable("RAZORPAY_MERCHANT_NAME")?.Trim() ?? "Brothers Store"
            : this.razorpayOptions.MerchantName;
    }

    [HttpPost("razorpay/order")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> CreateRazorpayOrder([FromBody] RazorpayOrderRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "";
        var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "";

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(razorpayOptions.KeyId) || string.IsNullOrWhiteSpace(razorpayOptions.KeySecret))
        {
            return StatusCode(StatusCodes.Status501NotImplemented, new { message = "Online payments are not configured." });
        }

        var cartItems = await (
            from cartItem in db.CartItems
            join product in db.Products on cartItem.ProductId equals product.Id
            where cartItem.UserId == userId
            select new
            {
                cartItem.ProductId,
                cartItem.Quantity,
                ProductName = product.Name,
                product.Price,
            }
        ).ToListAsync();

        if (cartItems.Count == 0)
        {
            return BadRequest(new { message = "Your cart is empty." });
        }

        var hasPreviousOrders = await db.Orders
            .AsNoTracking()
            .AnyAsync(order => order.CustomerEmail == userEmail);

        var originalTotalAmount = cartItems.Sum(item => item.Price * item.Quantity);
        var firstOrderDiscountAmount = !hasPreviousOrders ? Math.Min(50m, originalTotalAmount) : 0m;
        var subtotalAfterFirstDiscount = Math.Max(0m, originalTotalAmount - firstOrderDiscountAmount);

        var totalQuantity = cartItems.Sum(item => item.Quantity);
        var prepaidDiscountAmount = Math.Min(totalQuantity * 30m, subtotalAfterFirstDiscount);
        var finalTotalAmount = Math.Max(0m, subtotalAfterFirstDiscount - prepaidDiscountAmount);

        var amountInPaise = (int)Math.Round(finalTotalAmount * 100m, MidpointRounding.AwayFromZero);
        if (amountInPaise < 100)
        {
            return BadRequest(new { message = "Minimum payable amount is Rs. 1." });
        }

        var receipt = $"bs_{Guid.NewGuid():N}".Substring(0, 18);

        var payload = new
        {
            amount = amountInPaise,
            currency = "INR",
            receipt,
            payment_capture = 1,
            notes = new Dictionary<string, string?>
            {
                ["userId"] = userId,
                ["email"] = userEmail,
            },
        };

        var client = httpClientFactory.CreateClient();
        var basicAuth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{razorpayOptions.KeyId}:{razorpayOptions.KeySecret}"));
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", basicAuth);

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(httpRequest);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Unable to contact payment gateway.", detail = ex.Message });
        }

        var rawResponse = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Payment gateway error.", detail = rawResponse });
        }

        using var doc = JsonDocument.Parse(rawResponse);
        var orderId = doc.RootElement.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;

        if (string.IsNullOrWhiteSpace(orderId))
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Invalid payment gateway response." });
        }

        return Ok(new
        {
            keyId = razorpayOptions.KeyId,
            merchantName = razorpayOptions.MerchantName,
            razorpayOrderId = orderId,
            amount = amountInPaise,
            currency = "INR",
            customer = new
            {
                name = request.CustomerName?.Trim() ?? userName,
                email = request.CustomerEmail?.Trim() ?? userEmail,
                contact = request.CustomerMobile?.Trim() ?? "",
            },
            pricing = new
            {
                originalTotalAmount,
                firstOrderDiscountAmount,
                prepaidDiscountAmount,
                finalTotalAmount,
            }
        });
    }

    // Compatibility endpoint for simple integrations.
    // Mirrors Razorpay docs: create order -> return { order_id, amount, currency }.
    [HttpPost("/api/create-order")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> CreateOrderCompat([FromBody] RazorpayCompatCreateOrderRequest request)
    {
        var result = await CreateRazorpayOrder(new RazorpayOrderRequest
        {
            CustomerName = request.CustomerName,
            CustomerEmail = request.CustomerEmail,
            CustomerMobile = request.CustomerMobile,
        });

        if (result is not OkObjectResult okResult || okResult.Value == null)
        {
            return result;
        }

        // Extract subset expected by docs.
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(okResult.Value));
        var root = json.RootElement;
        var orderId = root.GetProperty("razorpayOrderId").GetString() ?? "";
        var amount = root.GetProperty("amount").GetInt32();
        var currency = root.GetProperty("currency").GetString() ?? "INR";

        return Ok(new
        {
            order_id = orderId,
            amount,
            currency,
        });
    }

    [HttpPost("razorpay/verify")]
    [EnableRateLimiting("write")]
    public IActionResult VerifyRazorpaySignature([FromBody] RazorpayVerifyRequest request)
    {
        if (string.IsNullOrWhiteSpace(razorpayOptions.KeySecret))
        {
            return StatusCode(StatusCodes.Status501NotImplemented, new { message = "Online payments are not configured." });
        }

        if (string.IsNullOrWhiteSpace(request.RazorpayOrderId)
            || string.IsNullOrWhiteSpace(request.RazorpayPaymentId)
            || string.IsNullOrWhiteSpace(request.RazorpaySignature))
        {
            return BadRequest(new { message = "Missing payment verification data." });
        }

        var payload = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
        var expectedSignature = ComputeHmacSha256Hex(razorpayOptions.KeySecret, payload);

        if (!FixedTimeEquals(expectedSignature, request.RazorpaySignature))
        {
            return BadRequest(new { message = "Payment verification failed." });
        }

        return Ok(new { verified = true });
    }

    // Compatibility endpoint for simple integrations.
    // Mirrors Razorpay docs: verify signature -> return success only when matched.
    [HttpPost("/api/verify-payment")]
    [EnableRateLimiting("write")]
    public IActionResult VerifyPaymentCompat([FromBody] RazorpayCompatVerifyRequest request)
    {
        return VerifyRazorpaySignature(new RazorpayVerifyRequest
        {
            RazorpayOrderId = request.RazorpayOrderId ?? request.Razorpay_Order_Id ?? "",
            RazorpayPaymentId = request.RazorpayPaymentId ?? request.Razorpay_Payment_Id ?? "",
            RazorpaySignature = request.RazorpaySignature ?? "",
        });
    }

    private static string ComputeHmacSha256Hex(string secret, string payload)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        var builder = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
        {
            builder.Append(b.ToString("x2"));
        }
        return builder.ToString();
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var aBytes = Encoding.UTF8.GetBytes(a ?? "");
        var bBytes = Encoding.UTF8.GetBytes(b ?? "");
        return CryptographicOperations.FixedTimeEquals(aBytes, bBytes);
    }
}

public class RazorpayOrderRequest
{
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerMobile { get; set; }
}

public class RazorpayVerifyRequest
{
    public string RazorpayOrderId { get; set; } = "";
    public string RazorpayPaymentId { get; set; } = "";
    public string RazorpaySignature { get; set; } = "";
}

public class RazorpayCompatCreateOrderRequest
{
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerMobile { get; set; }
}

public class RazorpayCompatVerifyRequest
{
    public string? RazorpayOrderId { get; set; }
    public string? RazorpayPaymentId { get; set; }
    public string? Razorpay_Order_Id { get; set; }
    public string? Razorpay_Payment_Id { get; set; }
    public string? RazorpaySignature { get; set; }
}
