namespace inex.Application.ExchangeRates.Synchronization.Models;

public sealed record ExchangeRateQuote(
    string BaseCurrencyCode,
    string QuoteCurrencyCode,
    DateOnly Date,
    decimal Rate);
