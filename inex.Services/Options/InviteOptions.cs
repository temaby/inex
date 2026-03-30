using System.ComponentModel.DataAnnotations;

namespace inex.Services.Options;

public class InviteOptions
{
    public const string SectionName = "InviteOptions";

    [Required]
    [MinLength(8)]
    public string Token { get; set; } = string.Empty;
}
