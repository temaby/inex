namespace inex.Services.Models.Records.Auth;

public record RegisterRequest
{
    public string Username { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string InviteToken { get; init; } = string.Empty;
    public int CurrencyId { get; init; }
}
