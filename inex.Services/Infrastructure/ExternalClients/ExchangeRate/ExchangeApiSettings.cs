using System.ComponentModel.DataAnnotations;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class ExchangeApiSettings
{
    public const string SectionName = "ExchangeApiSettings";
    public string BaseUrl { get; set; } = string.Empty;
    [Required]
    public string ApiKey { get; set; } = string.Empty;
}
