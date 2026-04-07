using System.ComponentModel.DataAnnotations;

namespace inex.Services.Models.Records.Auth;

public record UpdateProfileRequest
{
    [Required]
    [MaxLength(256)]
    public string Username { get; init; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue)]
    public int CurrencyId { get; init; }
}
