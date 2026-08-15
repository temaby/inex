using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Application.ExchangeRates.Synchronization.Models;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using Microsoft.Extensions.Logging;
using ExchangeApiResponse = inex.Services.Infrastructure.ExternalClients.ExchangeRate.ExchangeRateResponse;

namespace inex.Infrastructure.ExchangeRates.Synchronization;

/// <summary>Adapts the existing provider chain to the synchronization application contract.</summary>
public sealed class HistoricalRateProvider : IHistoricalRateProvider
{
    private readonly CurrencyApiClient _currencyApiClient;
    private readonly FrankfurterApiClient _frankfurterApiClient;
    private readonly INbrbApiClient _nbrbApiClient;
    private readonly ILogger<HistoricalRateProvider> _logger;

    public HistoricalRateProvider(
        CurrencyApiClient currencyApiClient,
        FrankfurterApiClient frankfurterApiClient,
        INbrbApiClient nbrbApiClient,
        ILogger<HistoricalRateProvider> logger)
    {
        _currencyApiClient = currencyApiClient;
        _frankfurterApiClient = frankfurterApiClient;
        _nbrbApiClient = nbrbApiClient;
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

        foreach ((DateOnly start, DateOnly end) in GetContiguousRanges(normalizedDates))
        {
            IReadOnlyCollection<DateOnly> rangeDates = GetDatesInRange(start, end);
            string[] nbrbTargets = normalizedQuotes
                .Where(currencyCode => IsBynRubPath(baseCurrencyCode, currencyCode))
                .ToArray();
            string[] standardTargets = normalizedQuotes
                .Where(currencyCode => !nbrbTargets.Contains(currencyCode, StringComparer.OrdinalIgnoreCase))
                .ToArray();

            if (standardTargets.Length > 0)
            {
                Dictionary<DateTime, ExchangeApiResponse> frankfurterRates;
                try
                {
                    frankfurterRates = await _frankfurterApiClient.GetRatesForRangeAsync(
                        start.ToDateTime(TimeOnly.MinValue),
                        end.ToDateTime(TimeOnly.MinValue),
                        baseCurrencyCode,
                        standardTargets,
                        cancellationToken);
                }
                catch (Exception exception)
                {
                    _logger.LogWarning(
                        exception,
                        "Frankfurter range fetch failed for {StartDate} through {EndDate} with base {BaseCurrencyCode}.",
                        start,
                        end,
                        baseCurrencyCode);
                    frankfurterRates = new Dictionary<DateTime, ExchangeApiResponse>();
                }

                foreach ((DateTime date, ExchangeApiResponse response) in frankfurterRates)
                {
                    AddQuotes(quotes, date, baseCurrencyCode, response, standardTargets);
                }

                foreach (DateOnly date in rangeDates)
                {
                    string[] uncoveredTargets = standardTargets
                        .Where(targetCurrency => !quotes.ContainsKey(CreateKey(date, targetCurrency)))
                        .ToArray();

                    if (uncoveredTargets.Length == 0)
                    {
                        continue;
                    }

                    ExchangeApiResponse? currencyApiRates;
                    try
                    {
                        currencyApiRates = await _currencyApiClient.GetRatesAsync(
                            date.ToDateTime(TimeOnly.MinValue),
                            baseCurrencyCode,
                            uncoveredTargets,
                            cancellationToken);
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
                        AddQuotes(quotes, date.ToDateTime(TimeOnly.MinValue), baseCurrencyCode, currencyApiRates, uncoveredTargets);
                    }
                }
            }

            foreach (string targetCurrency in nbrbTargets)
            {
                Dictionary<DateTime, ExchangeApiResponse> nbrbRates;
                try
                {
                    nbrbRates = await _nbrbApiClient.GetRatesForRangeAsync(
                        start.ToDateTime(TimeOnly.MinValue),
                        end.ToDateTime(TimeOnly.MinValue),
                        baseCurrencyCode,
                        targetCurrency,
                        cancellationToken);
                }
                catch (Exception exception)
                {
                    _logger.LogWarning(
                        exception,
                        "NBRB range fetch failed for {StartDate} through {EndDate} with base {BaseCurrencyCode} and target {TargetCurrencyCode}.",
                        start,
                        end,
                        baseCurrencyCode,
                        targetCurrency);
                    continue;
                }

                foreach ((DateTime date, ExchangeApiResponse response) in nbrbRates)
                {
                    AddQuotes(quotes, date, baseCurrencyCode, response, [targetCurrency]);
                }
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

    private static IEnumerable<(DateOnly Start, DateOnly End)> GetContiguousRanges(IReadOnlyList<DateOnly> dates)
    {
        if (dates.Count == 0)
        {
            yield break;
        }

        DateOnly rangeStart = dates[0];
        DateOnly previous = dates[0];
        for (int index = 1; index < dates.Count; index++)
        {
            DateOnly current = dates[index];
            if (current == previous.AddDays(1))
            {
                previous = current;
                continue;
            }

            yield return (rangeStart, previous);
            rangeStart = current;
            previous = current;
        }

        yield return (rangeStart, previous);
    }

    private static IReadOnlyCollection<DateOnly> GetDatesInRange(DateOnly start, DateOnly end)
    {
        var result = new List<DateOnly>();
        for (DateOnly date = start; date <= end; date = date.AddDays(1))
        {
            result.Add(date);
        }

        return result;
    }

    private static bool IsBynRubPath(string baseCurrencyCode, string quoteCurrencyCode) =>
        string.Equals(baseCurrencyCode, "BYN", StringComparison.OrdinalIgnoreCase)
        && string.Equals(quoteCurrencyCode, "RUB", StringComparison.OrdinalIgnoreCase)
        || string.Equals(baseCurrencyCode, "RUB", StringComparison.OrdinalIgnoreCase)
        && string.Equals(quoteCurrencyCode, "BYN", StringComparison.OrdinalIgnoreCase);

    private static string CreateKey(DateOnly date, string quoteCurrencyCode) =>
        $"{date:yyyy-MM-dd}:{quoteCurrencyCode.ToUpperInvariant()}";
}
