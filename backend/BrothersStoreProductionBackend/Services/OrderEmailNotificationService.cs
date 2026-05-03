using System.Net;
using System.Net.Mail;
using System.Text;
using BrothersStoreApi.Entities;
using Microsoft.Extensions.Options;

namespace BrothersStoreApi.Services;

public interface IOrderEmailNotificationService
{
    Task SendOrderPlacedNotificationsAsync(Order order);
    Task SendOrderConfirmedNotificationAsync(Order order);
}

public sealed class OrderEmailNotificationService : IOrderEmailNotificationService
{
    private readonly SmtpOptions smtpOptions;
    private readonly AdminNotificationOptions adminOptions;
    private readonly PublicSiteOptions publicSiteOptions;
    private readonly ILogger<OrderEmailNotificationService> logger;

    public OrderEmailNotificationService(
        IOptions<SmtpOptions> smtpOptions,
        IOptions<AdminNotificationOptions> adminOptions,
        IOptions<PublicSiteOptions> publicSiteOptions,
        ILogger<OrderEmailNotificationService> logger)
    {
        this.smtpOptions = smtpOptions.Value;
        this.adminOptions = adminOptions.Value;
        this.publicSiteOptions = publicSiteOptions.Value;
        this.logger = logger;
    }

    public async Task SendOrderPlacedNotificationsAsync(Order order)
    {
        if (!CanSendEmails())
        {
            return;
        }

        await TrySendEmailAsync(
            order.CustomerEmail,
            $"Order received #{order.Id} - Brothers Store",
            BuildCustomerPlacedBody(order));

        var adminRecipients = adminOptions.Recipients
            .Where(email => !string.IsNullOrWhiteSpace(email))
            .Select(email => email.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (adminRecipients.Count == 0)
        {
            logger.LogInformation("Order {OrderId} was placed, but no admin email recipients are configured.", order.Id);
            return;
        }

        await TrySendEmailAsync(
            adminRecipients,
            $"New order placed #{order.Id} - Brothers Store",
            BuildAdminPlacedBody(order));
    }

    public async Task SendOrderConfirmedNotificationAsync(Order order)
    {
        if (!CanSendEmails())
        {
            return;
        }

        await TrySendEmailAsync(
            order.CustomerEmail,
            $"Order confirmed #{order.Id} - Brothers Store",
            BuildCustomerConfirmedBody(order));
    }

    private bool CanSendEmails()
    {
        if (!smtpOptions.Enabled)
        {
            logger.LogInformation("SMTP email notifications are disabled in configuration.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtpOptions.Host) ||
            string.IsNullOrWhiteSpace(smtpOptions.FromEmail))
        {
            logger.LogWarning("SMTP is enabled, but Host or FromEmail is missing. Email notifications were skipped.");
            return false;
        }

        return true;
    }

    private async Task TrySendEmailAsync(string recipient, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(recipient))
        {
            logger.LogWarning("Skipped email with subject {Subject} because recipient was empty.", subject);
            return;
        }

        await TrySendEmailAsync(new[] { recipient.Trim() }, subject, htmlBody);
    }

    private async Task TrySendEmailAsync(IEnumerable<string> recipients, string subject, string htmlBody)
    {
        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(smtpOptions.FromEmail, smtpOptions.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
            };

            foreach (var recipient in recipients.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                message.To.Add(recipient);
            }

            using var client = new SmtpClient(smtpOptions.Host, smtpOptions.Port)
            {
                EnableSsl = smtpOptions.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = string.IsNullOrWhiteSpace(smtpOptions.Username)
                    ? CredentialCache.DefaultNetworkCredentials
                    : new NetworkCredential(smtpOptions.Username, smtpOptions.Password),
            };

            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email with subject {Subject}.", subject);
        }
    }

    private string BuildCustomerPlacedBody(Order order)
    {
        return BuildEmailLayout(
            "Order received",
            $"""
            <p>Hi {WebUtility.HtmlEncode(order.CustomerName)},</p>
            <p>We received your order <strong>#{order.Id}</strong> and will start processing it shortly.</p>
            {BuildOrderSummary(order)}
            <p>Current status: <strong>{WebUtility.HtmlEncode(order.Status)}</strong></p>
            {BuildTrackOrderLink(order.Id)}
            <p>Thank you for shopping with Brothers Store.</p>
            """);
    }

    private string BuildCustomerConfirmedBody(Order order)
    {
        return BuildEmailLayout(
            "Order confirmed",
            $"""
            <p>Hi {WebUtility.HtmlEncode(order.CustomerName)},</p>
            <p>Your order <strong>#{order.Id}</strong> has been confirmed.</p>
            {BuildOrderSummary(order)}
            {BuildTrackOrderLink(order.Id)}
            <p>We will contact you if we need anything else before dispatch.</p>
            <p>Thank you for shopping with Brothers Store.</p>
            """);
    }

    private string BuildAdminPlacedBody(Order order)
    {
        return BuildEmailLayout(
            "New order placed",
            $"""
            <p>A new order has been placed on Brothers Store.</p>
            <p><strong>Order ID:</strong> #{order.Id}</p>
            <p><strong>Customer:</strong> {WebUtility.HtmlEncode(order.CustomerName)}</p>
            <p><strong>Email:</strong> {WebUtility.HtmlEncode(order.CustomerEmail)}</p>
            <p><strong>Mobile:</strong> {WebUtility.HtmlEncode(order.CustomerMobile)}</p>
            <p><strong>Payment:</strong> {WebUtility.HtmlEncode(order.PaymentMethod)}</p>
            <p><strong>Shipping address:</strong> {WebUtility.HtmlEncode(order.ShippingAddress)}</p>
            {BuildOrderSummary(order)}
            """);
    }

    private static string BuildOrderSummary(Order order)
    {
        var itemRows = new StringBuilder();

        foreach (var item in order.Items)
        {
            itemRows.Append(
                $"""
                <tr>
                    <td style="padding:8px;border:1px solid #d1d5db;">{WebUtility.HtmlEncode(item.ProductName)}</td>
                    <td style="padding:8px;border:1px solid #d1d5db;">{item.Quantity}</td>
                    <td style="padding:8px;border:1px solid #d1d5db;">Rs. {item.Price:0.##}</td>
                </tr>
                """);
        }

        return $"""
        <p><strong>Total:</strong> Rs. {order.TotalAmount:0.##}</p>
        <table style="border-collapse:collapse;width:100%;margin-top:12px;">
            <thead>
                <tr>
                    <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Product</th>
                    <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Qty</th>
                    <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Price</th>
                </tr>
            </thead>
            <tbody>
                {itemRows}
            </tbody>
        </table>
        """;
    }

    private string BuildTrackOrderLink(int orderId)
    {
        var baseUrl = publicSiteOptions.BaseUrl?.Trim().TrimEnd('/');

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return "";
        }

        var trackUrl = $"{baseUrl}/track-order/{orderId}";

        return $"""
        <div style="margin:20px 0 8px;">
            <a href="{WebUtility.HtmlEncode(trackUrl)}" style="display:inline-block;border-radius:12px;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:700;">
                Track your order
            </a>
        </div>
        <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">Track link: {WebUtility.HtmlEncode(trackUrl)}</p>
        """;
    }

    private string BuildEmailLayout(string title, string content)
    {
        var baseUrl = publicSiteOptions.BaseUrl?.Trim().TrimEnd('/');
        var logoUrl = string.IsNullOrWhiteSpace(publicSiteOptions.LogoUrl)
            ? (!string.IsNullOrWhiteSpace(baseUrl) ? $"{baseUrl}/bs_logo_hd.png" : "")
            : publicSiteOptions.LogoUrl.Trim();

        return $"""
        <div style="background:#f3f4f6;padding:24px 12px;font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 14px 38px rgba(15,23,42,0.08);">
                <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1f2937 100%);">
                    {(string.IsNullOrWhiteSpace(logoUrl) ? "<div style=\"color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.02em;\">BrotherStore</div>" : $"<img src=\"{WebUtility.HtmlEncode(logoUrl)}\" alt=\"BrotherStore\" style=\"display:block;max-width:220px;width:100%;height:auto;\" />")}
                </div>
                <div style="padding:28px;">
                    <h2 style="margin:0 0 18px;font-size:24px;line-height:1.2;">{WebUtility.HtmlEncode(title)}</h2>
                    {content}
                </div>
            </div>
        </div>
        """;
    }
}

public sealed class SmtpOptions
{
    public bool Enabled { get; set; }
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromEmail { get; set; } = "";
    public string FromName { get; set; } = "Brothers Store";
    public bool EnableSsl { get; set; } = true;
}

public sealed class AdminNotificationOptions
{
    public List<string> Recipients { get; set; } = new();
}

public sealed class PublicSiteOptions
{
    public string BaseUrl { get; set; } = "";
    public string LogoUrl { get; set; } = "";
}
