using System.ComponentModel.DataAnnotations;

namespace inex.Services.Options;

public class JwtOptions
{
    public const string SectionName = "JwtOptions";

    [Required]
    public string Issuer { get; set; } = string.Empty;

    [Required]
    public string Audience { get; set; } = string.Empty;

    [Required]
    [MinLength(32)]
    public string Secret { get; set; } = string.Empty;

    [Range(1, 1440)]
    public int AccessTokenExpiryMinutes { get; set; } = 15;

    [Range(1, 365)]
    public int RefreshTokenExpiryDays { get; set; } = 7;

    [Range(0, 300)]
    public int RefreshGraceWindowSeconds { get; set; } = 30;

    /// <summary>Access token lifetime in seconds — standard OAuth2 <c>expires_in</c> field.</summary>
    public int AccessTokenExpirySeconds => AccessTokenExpiryMinutes * 60;
}
