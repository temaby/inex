namespace inex.Services.Models.Records.Account;

public record AccountSummary : AccountResponse
{
    public decimal Value { get; init; }
    public decimal ThisMonthNet { get; init; }
}
