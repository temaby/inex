namespace inex.Services.Models.Records.ExchangeRate;

public sealed record SynchronizeExchangeRatesRequest(
    DateOnly StartDate,
    DateOnly EndDate);
