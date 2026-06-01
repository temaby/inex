using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using inex.Services.Models.Mappers;
using inex.Services.Models.Records.Data;
using ExchangeRateResponse = inex.Services.Models.Records.ExchangeRate.ExchangeRateResponse;
using ExchangeApiResponse = inex.Services.Infrastructure.ExternalClients.ExchangeRate.ExchangeRateResponse;
using inex.Services.Services.Base;
using inex.Services.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace inex.Services.Services;

/// <summary>
/// Handles retrieval and synchronization of exchange rates.
/// Rates for past dates are fetched on-demand from the external currency API and cached in the database.
/// Rates for today are never fetched from the provider (live rates are unsupported);
/// instead, a temporary copy of the latest known rates is created as a placeholder.
/// Supports multiple currency API providers with automatic fallback for resilience.
/// </summary>
public class ExchangeRateService : Service, IExchangeRateService
{
    #region Constructors

    public ExchangeRateService(
        IInExUnitOfWork uowInEx,
        IExchangeRateClient apiClient,
        IExchangeRateClient fallbackClient,
        INbrbApiClient nbrbClient,
        ILogger<ExchangeRateService> logger,
        IClock clock) : base(uowInEx)
    {
        _apiClient = apiClient;
        _fallbackClient = fallbackClient;
        _nbrbClient = nbrbClient;
        _logger = logger;
        _clock = clock;
    }

    #endregion Constructors

    #region Public Interface

    /// <summary>
    /// Returns exchange rates for every day in the inclusive range [<paramref name="start"/>, <paramref name="end"/>].
    /// Past dates are synced from the provider if not yet cached.
    /// Today's slot is filled with temporary rates copied from the latest available date.
    /// Future dates are silently skipped.
    /// </summary>
    /// <exception cref="ValidationFailedException">Thrown when <paramref name="end"/> is before <paramref name="start"/>.</exception>
    public async Task<ListResponse<ExchangeRateResponse>> Get(int userId, DateTime start, DateTime end, string baseCurrency = "", CancellationToken ct = default)
    {
        if (end < start)
        {
            throw new ValidationFailedException("End date must be on or after start date.");
        }

        baseCurrency = ResolveBaseCurrency(userId, baseCurrency);
        IList<string> targetCurrencyCodes = await ResolveTargetCurrencyCodes(baseCurrency, ct);

        DateTime startDate = start.Date;
        DateTime endDate = end.Date;
        DateTime today = _clock.UtcNow.Date;
        endDate = endDate <= today ? endDate : today;

        // One query to find which dates already have a full set of actual rates cached.
        var cachedDates = (await DbInEx.ExchangeRateRepository.Get(true)
            .Where(r => r.Created >= startDate && r.Created < today
                     && r.FromCode == baseCurrency && !r.IsTemporary)
            .GroupBy(r => r.Created)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(ct))
            .Where(x => x.Count >= targetCurrencyCodes.Count)
            .Select(x => x.Date)
            .ToHashSet();

        var missingDates = Enumerable
            .Range(0, (endDate - startDate).Days + 1)
            .Select(i => startDate.AddDays(i))
            .Where(d => d < today && !cachedDates.Contains(d))
            .ToList();

        if (missingDates.Count > 0)
        {
            var rangeStart = missingDates.Min();
            var rangeEnd   = missingDates.Max();
            var rangeRates = await FetchRatesForRange(rangeStart, rangeEnd, baseCurrency, targetCurrencyCodes.ToArray(), ct);

            bool hasChanges = false;
            var missingDatesSet = missingDates.ToHashSet();
            foreach (var (date, response) in rangeRates)
            {
                if (!missingDatesSet.Contains(date)) continue;
                hasChanges |= await UpsertRatesForDate(userId, date, baseCurrency, response, ct);
            }

            if (hasChanges)
                await DbInEx.SaveAsync(ct);

            // Carry forward missing currencies for non-trading days or partial provider data.
            bool hasCarryForwardChanges = false;
            foreach (var date in missingDates.OrderBy(d => d))
            {
                hasCarryForwardChanges |= await CarryForwardMissingRatesFromPriorDay(userId, date, baseCurrency, targetCurrencyCodes, ct);
            }

            if (hasCarryForwardChanges)
                await DbInEx.SaveAsync(ct);
        }

        if (endDate >= today)
            await CreateTemporaryRatesForTodayIfNeeded(userId, today, baseCurrency, ct);

        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created >= startDate && i.Created <= endDate && i.FromCode == baseCurrency);
        return BuildDataResponse<ExchangeRate, ExchangeRateResponse>(rates, ExchangeRateMapper.ToResponse);
    }

    /// <summary>
    /// Returns exchange rates for a single <paramref name="date"/>.
    /// Delegates to the range overload with <c>start == end == date</c>.
    /// </summary>
    public Task<ListResponse<ExchangeRateResponse>> Get(int userId, DateTime date, string baseCurrency = "", CancellationToken ct = default)
        => Get(userId, date, date, baseCurrency, ct);

    #endregion Public Interface

    #region Private Methods

    /// <summary>
    /// Returns the base currency for the given user.
    /// Falls back to the user's profile currency when <paramref name="baseCurrency"/> is empty.
    /// </summary>
    private string ResolveBaseCurrency(int userId, string? baseCurrency)
    {
        if (string.IsNullOrEmpty(baseCurrency))
        {
            baseCurrency = DbInEx.UserRepository.Get(true, null, i => i.Currency).First(i => i.Id == userId).Currency.Key;
        }

        return baseCurrency;
    }

    /// <summary>
    /// Returns all currency codes that are not the base currency — these are the target codes
    /// for which rates will be fetched.
    /// </summary>
    private async Task<IList<string>> ResolveTargetCurrencyCodes(string baseCurrency, CancellationToken ct = default)
    {
        return await DbInEx.CurrencyRepository.Get(true)
            .Where(i => i.Key != baseCurrency)
            .Select(i => i.Key)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Fetches exchange rates for the given date range using a two-pass merge strategy:
    /// 1. Frankfurter range call — one HTTP request, covers ECB currencies (EUR, PLN, …).
    /// 2. CurrencyAPI per-date — called only for currencies Frankfurter did not return (e.g. BYN),
    ///    and only for trading days present in Frankfurter's response; non-trading days are handled
    ///    by the carry-forward logic in the caller.
    /// If Frankfurter fails entirely, falls back to CurrencyAPI day-by-day for all currencies.
    /// </summary>
    private async Task<Dictionary<DateTime, ExchangeApiResponse>> FetchRatesForRange(
        DateTime start, DateTime end, string baseCurrency, string[] targetCurrencies, CancellationToken ct = default)
    {
        var nbrbTargetCurrencies = targetCurrencies
            .Where(targetCurrency => IsBynRubPath(baseCurrency, targetCurrency))
            .ToArray();

        var standardTargetCurrencies = targetCurrencies
            .Where(targetCurrency => !nbrbTargetCurrencies.Contains(targetCurrency, StringComparer.OrdinalIgnoreCase))
            .ToArray();

        // Pass 1: Frankfurter range call (single HTTP request).
        var result = new Dictionary<DateTime, ExchangeApiResponse>();
        if (standardTargetCurrencies.Length > 0)
        {
            try
            {
                result = await _fallbackClient.GetRatesForRangeAsync(start, end, baseCurrency, standardTargetCurrencies, ct)
                         ?? new Dictionary<DateTime, ExchangeApiResponse>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Frankfurter range fetch failed for {Start}..{End}/{BaseCurrency}.", start, end, baseCurrency);
            }

            // Pass 2: supplement currencies not returned by Frankfurter (e.g. BYN) via CurrencyAPI.
            var coveredCurrencies = result.Values
                .SelectMany(r => r.Data.Keys)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var uncoveredCurrencies = standardTargetCurrencies
                .Where(c => !coveredCurrencies.Contains(c))
                .ToArray();

            if (uncoveredCurrencies.Length > 0)
            {
                // Only iterate dates Frankfurter returned (trading days); weekends/holidays get carry-forward.
                // If Frankfurter returned nothing at all, fall back to all dates in range.
                var datesToFetch = result.Count > 0
                    ? result.Keys.ToList()
                    : Enumerable.Range(0, (end.Date - start.Date).Days + 1).Select(i => start.Date.AddDays(i)).ToList();

                foreach (var date in datesToFetch)
                {
                    try
                    {
                        var singleDay = await _apiClient.GetRatesAsync(date, baseCurrency, uncoveredCurrencies, ct);
                        if (singleDay?.Data?.Count > 0)
                        {
                            MergeRates(result, date, singleDay);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "CurrencyAPI fetch failed for {Date}/{BaseCurrency}/{Currencies}.", date, baseCurrency, string.Join(",", uncoveredCurrencies));
                    }
                }
            }
        }

        foreach (var nbrbTargetCurrency in nbrbTargetCurrencies)
        {
            try
            {
                var nbrbRates = await _nbrbClient.GetRatesForRangeAsync(start, end, baseCurrency, nbrbTargetCurrency, ct)
                                ?? new Dictionary<DateTime, ExchangeApiResponse>();

                foreach (var (date, response) in nbrbRates)
                {
                    MergeRates(result, date, response);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "NBRB range fetch failed for {Start}..{End}/{BaseCurrency}/{TargetCurrency}.", start, end, baseCurrency, nbrbTargetCurrency);
            }
        }

        return result;
    }

    private static void MergeRates(Dictionary<DateTime, ExchangeApiResponse> result, DateTime date, ExchangeApiResponse response)
    {
        if (result.TryGetValue(date.Date, out var existing))
        {
            foreach (var kvp in response.Data)
                existing.Data[kvp.Key] = kvp.Value;
        }
        else
        {
            result[date.Date] = response;
        }
    }

    /// <summary>
    /// Inserts or updates exchange rates for the given date from the provider response.
    /// Existing temporary rates are overwritten with actual values.
    /// Returns <see langword="true"/> if any record was inserted or updated (caller must save).
    /// </summary>
    private async Task<bool> UpsertRatesForDate(int userId, DateTime date, string baseCurrency, ExchangeApiResponse response, CancellationToken ct = default)
    {
        DateTime createdDate = date.Date;

        List<ExchangeRate> existingRates = DbInEx.ExchangeRateRepository.Get(false)
            .Where(i => i.Created == createdDate && i.FromCode == baseCurrency)
            .ToList();

        bool hasChanges = false;

        foreach (KeyValuePair<string, ExchangeDateData> item in response.Data)
        {
            string toCode = string.IsNullOrWhiteSpace(item.Value.Code) ? item.Key : item.Value.Code;
            decimal value = item.Value.Value;

            ExchangeRate? existingRate = existingRates.FirstOrDefault(i => i.ToCode == toCode);

            if (existingRate is null)
            {
                await DbInEx.ExchangeRateRepository.CreateAsync(new ExchangeRate()
                {
                    FromCode = baseCurrency,
                    ToCode = toCode,
                    Rate = value,
                    IsTemporary = false,
                    CreatedBy = userId,
                    Created = createdDate
                }, ct);

                hasChanges = true;
                continue;
            }

            if (existingRate.Rate != value || existingRate.IsTemporary)
            {
                existingRate.Rate = value;
                existingRate.IsTemporary = false;
                DbInEx.ExchangeRateRepository.Update(existingRate);

                hasChanges = true;
            }
        }

        return hasChanges;
    }

    /// <summary>
    /// Creates temporary placeholder rates for today if none exist yet,
    /// by copying the most recent available rates from a prior date and marking them as temporary.
    /// Does nothing when rates already exist for today, or when no prior rates are found.
    /// </summary>
    private async Task CreateTemporaryRatesForTodayIfNeeded(int userId, DateTime date, string baseCurrency, CancellationToken ct = default)
    {
        DateTime today = date.Date;

        bool ratesExist = DbInEx.ExchangeRateRepository.Get(true)
            .Any(i => i.Created == today && i.FromCode == baseCurrency);

        if (ratesExist)
        {
            return;
        }

        // Find the most recent date before today that has rates for this base currency.
        DateTime? latestDate = DbInEx.ExchangeRateRepository.Get(true)
            .Where(i => i.Created < today && i.FromCode == baseCurrency)
            .OrderByDescending(i => i.Created)
            .Select(i => (DateTime?)i.Created)
            .FirstOrDefault();

        if (!latestDate.HasValue)
        {
            return;
        }

        List<ExchangeRate> latestRates = DbInEx.ExchangeRateRepository.Get(true)
            .Where(i => i.Created == latestDate.Value && i.FromCode == baseCurrency)
            .ToList();

        foreach (ExchangeRate rate in latestRates)
        {
            await DbInEx.ExchangeRateRepository.CreateAsync(new ExchangeRate()
            {
                FromCode = rate.FromCode,
                ToCode = rate.ToCode,
                Rate = rate.Rate,
                IsTemporary = true,
                CreatedBy = userId,
                Created = today
            }, ct);
        }

        if (latestRates.Count > 0)
        {
            await DbInEx.SaveAsync(ct);
        }
    }

    /// <summary>
    /// Copies rates from the nearest prior trading day into <paramref name="date"/> when the external API
    /// returned no data (weekends, public holidays). Stored as non-temporary so the date is treated as
    /// fully cached and not re-queried on subsequent calls.
    /// Returns <see langword="true"/> if any records were created (caller must save).
    /// </summary>
    private async Task<bool> CarryForwardMissingRatesFromPriorDay(int userId, DateTime date, string baseCurrency, IList<string> targetCurrencyCodes, CancellationToken ct = default)
    {
        var existingTargetCodes = DbInEx.ExchangeRateRepository.Get(true)
            .Where(r => r.Created == date.Date && r.FromCode == baseCurrency)
            .Select(r => r.ToCode)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missingTargetCodes = targetCurrencyCodes
            .Where(targetCode => !existingTargetCodes.Contains(targetCode))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (missingTargetCodes.Count == 0) return false;

        var priorRates = DbInEx.ExchangeRateRepository.Get(true)
            .Where(r => r.Created < date.Date && r.FromCode == baseCurrency && !r.IsTemporary)
            .OrderByDescending(r => r.Created)
            .Where(r => missingTargetCodes.Contains(r.ToCode))
            .GroupBy(r => r.ToCode)
            .Select(g => g.First())
            .ToList();

        foreach (var rate in priorRates)
        {
            await DbInEx.ExchangeRateRepository.CreateAsync(new ExchangeRate
            {
                FromCode = rate.FromCode,
                ToCode = rate.ToCode,
                Rate = rate.Rate,
                IsTemporary = false,
                CreatedBy = userId,
                Created = date.Date
            }, ct);
        }

        return priorRates.Count > 0;
    }

    private static bool IsBynRubPath(string baseCurrency, string targetCurrency) =>
        string.Equals(baseCurrency, "BYN", StringComparison.OrdinalIgnoreCase)
        && string.Equals(targetCurrency, "RUB", StringComparison.OrdinalIgnoreCase)
        || string.Equals(baseCurrency, "RUB", StringComparison.OrdinalIgnoreCase)
        && string.Equals(targetCurrency, "BYN", StringComparison.OrdinalIgnoreCase);

    #endregion Private Methods

    #region Private Fields

    private readonly IExchangeRateClient _apiClient;
    private readonly IExchangeRateClient _fallbackClient;
    private readonly INbrbApiClient _nbrbClient;
    private readonly ILogger<ExchangeRateService> _logger;
    private readonly IClock _clock;

    #endregion Private Fields
}
