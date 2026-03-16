namespace inex.Services.Models.Records.Account;

public record AccountCreateDTO
{
    public int CurrencyId { get; init; }

    public string Key { get; init; } = null!;
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public bool IsEnabled { get; init; }
}