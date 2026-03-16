namespace inex.Services.Models.Records.ExchangeRate;

public record ExchangeRateDTO
{
    public int Id { get; init; }
    public string CurrencyFrom { get; init; } = null!;
    public string CurrencyTo { get; init; } = null!;
    public DateTime Date { get; init; }
    public decimal Rate { get; init; }
    public bool IsTemporary { get; init; }
}