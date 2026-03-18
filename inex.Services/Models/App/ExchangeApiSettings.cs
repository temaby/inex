using System.ComponentModel.DataAnnotations;

namespace inex.Services.Models.App;

public class ExchangeApiSettings
{
    [Required]
    public string ApiKey { get; set; } = string.Empty;
}
