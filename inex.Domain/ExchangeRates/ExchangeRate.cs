namespace inex.Domain.ExchangeRates;

public sealed class ExchangeRate
{
    public int Id { get; private set; }
    public string BaseCurrencyCode { get; private set; }
    public string QuoteCurrencyCode { get; private set; }
    public DateOnly Date { get; private set; }
    public decimal Rate { get; private set; }
    public bool IsTemporary { get; private set; }

    private ExchangeRate(int id, string baseCurrencyCode, string quoteCurrencyCode, DateOnly date, decimal rate, bool isTemporary)
    {
        Id = id;
        BaseCurrencyCode = baseCurrencyCode;
        QuoteCurrencyCode = quoteCurrencyCode;
        Date = date;
        Rate = rate;
        IsTemporary = isTemporary;
    }

    public static ExchangeRate Create(int id, string baseCurrencyCode, string quoteCurrencyCode, DateOnly date, decimal rate, bool isTemporary)
    {
        if (string.IsNullOrWhiteSpace(baseCurrencyCode))
            throw new ArgumentException("Base currency is required.");
        if (string.IsNullOrWhiteSpace(quoteCurrencyCode))
            throw new ArgumentException("Quote currency is required.");
        if (baseCurrencyCode.Equals(quoteCurrencyCode, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Base currency and quote currency cannot be the same.");
        if (date == default)
            throw new ArgumentException("Date is required.");
        if (rate <= 0)
            throw new ArgumentException("Rate must be a positive value.");

        return new ExchangeRate(id, baseCurrencyCode, quoteCurrencyCode, date, rate, isTemporary);
    }
}
