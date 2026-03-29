using System.ComponentModel.DataAnnotations;

namespace inex.Services.Models.Records.Auth;

public record RegisterRequest
{
    [Required]
    [MaxLength(256)]
    public string Username { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; init; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; init; } = string.Empty;
}
