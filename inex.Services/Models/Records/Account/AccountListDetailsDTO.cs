namespace inex.Services.Models.Records.Account;

public record AccountListDetailsDTO : AccountDetailsDTO
{
    public decimal Value { get; init; }
}