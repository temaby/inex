using System.ComponentModel.DataAnnotations;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class FrankfurterApiSettings
{
    public const string SectionName = "FrankfurterApiSettings";

    [Required]
    public string BaseUrl { get; set; } = string.Empty;
}
