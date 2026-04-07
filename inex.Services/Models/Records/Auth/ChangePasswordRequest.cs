using System.ComponentModel.DataAnnotations;

namespace inex.Services.Models.Records.Auth;

public record ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string NewPassword { get; init; } = string.Empty;
}
