using System.ComponentModel.DataAnnotations;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class CurrencyApiSettings
{
    public const string SectionName = "CurrencyApiSettings";
    [Required]
    public string BaseUrl { get; set; } = string.Empty;
    [Required]
    public string ApiKey { get; set; } = string.Empty;
}
