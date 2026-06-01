using System.ComponentModel.DataAnnotations;

namespace inex.Services.Infrastructure.ExternalClients.ExchangeRate;

public class NbrbApiSettings
{
    public const string SectionName = "NbrbApiSettings";

    [Required]
    public string BaseUrl { get; set; } = string.Empty;
}
