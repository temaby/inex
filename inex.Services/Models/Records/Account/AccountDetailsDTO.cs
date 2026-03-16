namespace inex.Services.Models.Records.Account;

public record AccountDetailsDTO : AccountUpdateDTO
{
    public string Currency { get; init; } = null!;
}