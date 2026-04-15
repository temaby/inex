namespace inex.Services.Models.Records.Auth;

public record UpdateProfileRequest
{
    public string Username { get; init; } = string.Empty;
    public int CurrencyId { get; init; }
}
