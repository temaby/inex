using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Application.ExchangeRates.Synchronization.Models;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Microsoft.Extensions.Logging;
using ExchangeApiResponse = inex.Services.Infrastructure.ExternalClients.ExchangeRate.ExchangeRateResponse;

namespace inex.Infrastructure.ExchangeRates.Synchronization;

/// <summary>Obtains manual synchronization quotes exclusively from CurrencyAPI.</summary>
public sealed class HistoricalRateProvider : IHistoricalRateProvider
{
    private readonly CurrencyApiClient _currencyApiClient;
    private readonly ILogger<HistoricalRateProvider> _logger;

    public HistoricalRateProvider(
        CurrencyApiClient currencyApiClient,
        ILogger<HistoricalRateProvider> logger)
    {
        _currencyApiClient = currencyApiClient;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<ExchangeRateQuote>> GetHistoricalRatesAsync(
        IReadOnlyCollection<DateOnly> dates,
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        CancellationToken cancellationToken)
    {
        var normalizedDates = dates.Distinct().OrderBy(date => date).ToList();
        var normalizedQuotes = quoteCurrencyCodes
            .Select(currencyCode => currencyCode.ToUpperInvariant())
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var quotes = new Dictionary<string, ExchangeRateQuote>(StringComparer.OrdinalIgnoreCase);

        foreach (DateOnly date in normalizedDates)
        {
            if (normalizedQuotes.Count == 0)
            {
                continue;
            }

            ExchangeApiResponse? currencyApiRates;
            try
            {
                currencyApiRates = await _currencyApiClient.GetRatesAsync(
                    date.ToDateTime(TimeOnly.MinValue),
                    baseCurrencyCode,
                    normalizedQuotes.ToArray(),
                    cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "CurrencyAPI fetch failed for {Date} with base {BaseCurrencyCode}.",
                    date,
                    baseCurrencyCode);
                continue;
            }

            if (currencyApiRates is not null)
            {
                AddQuotes(quotes, date.ToDateTime(TimeOnly.MinValue), baseCurrencyCode, currencyApiRates, normalizedQuotes);
            }
        }

        return quotes.Values.ToList();
    }

    private static void AddQuotes(
        IDictionary<string, ExchangeRateQuote> destination,
        DateTime date,
        string baseCurrencyCode,
        ExchangeApiResponse response,
        IReadOnlyCollection<string> requestedTargets)
    {
        DateOnly dateOnly = DateOnly.FromDateTime(date);
        foreach ((string currencyCode, ExchangeDateData value) in response.Data)
        {
            if (!requestedTargets.Contains(currencyCode, StringComparer.OrdinalIgnoreCase) || value.Value <= 0)
            {
                continue;
            }

            string normalizedCurrencyCode = currencyCode.ToUpperInvariant();
            destination[CreateKey(dateOnly, normalizedCurrencyCode)] = new ExchangeRateQuote(
                baseCurrencyCode,
                normalizedCurrencyCode,
                dateOnly,
                value.Value);
        }
    }

    private static string CreateKey(DateOnly date, string quoteCurrencyCode) =>
        $"{date:yyyy-MM-dd}:{quoteCurrencyCode.ToUpperInvariant()}";
}
