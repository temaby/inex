namespace inex.Services.Models.Records.Account;

public record AccountResponse : UpdateAccountRequest
{
    public string Currency { get; init; } = null!;
}
