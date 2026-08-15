namespace inex.Application.ExchangeRates.Synchronization.Models;

public sealed record ExchangeRateUserScope(
    string BaseCurrencyCode,
    IReadOnlyCollection<string> QuoteCurrencyCodes);
