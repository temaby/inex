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
using inex.Application.ExchangeRates.Synchronization.Interfaces;
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
        IClock clock,
        IExchangeRateSynchronizationLock synchronizationLock) : base(uowInEx)
    {
        _apiClient = apiClient;
        _fallbackClient = fallbackClient;
        _nbrbClient = nbrbClient;
        _logger = logger;
        _clock = clock;
        _synchronizationLock = synchronizationLock;
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
        IList<string> targetCurrencyCodes = await ResolveTargetCurrencyCodes(userId, baseCurrency, ct);
        targetCurrencyCodes = targetCurrencyCodes
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(currencyCode => currencyCode, StringComparer.OrdinalIgnoreCase)
            .ToList();

        DateTime startDate = start.Date;
        DateTime endDate = end.Date;
        DateTime today = _clock.UtcNow.Date;
        endDate = endDate <= today ? endDate : today;

        var pastDates = EnumerateDates(startDate, endDate)
            .Where(d => d < today)
            .ToList();

        if (pastDates.Count > 0 && targetCurrencyCodes.Count > 0)
            await SynchronizeMissingRates(userId, pastDates, baseCurrency, targetCurrencyCodes, ct);

        if (endDate >= today)
            await CreateTemporaryRatesForTodayIfNeeded(userId, today, baseCurrency, targetCurrencyCodes, ct);

        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created >= startDate && i.Created <= endDate && i.FromCode == baseCurrency);
        return BuildDataResponse<ExchangeRate, ExchangeRateResponse>(rates, ExchangeRateMapper.ToResponse);
    }

    /// <summary>
    /// Returns exchange rates for a single <paramref name="date"/>.
    /// Delegates to the range overload with <c>start == end == date</c>.
    /// </summary>
    public Task<ListResponse<ExchangeRateResponse>> Get(int userId, DateTime date, string baseCurrency = "", CancellationToken ct = default)
        => Get(userId, date, date, baseCurrency, ct);

    /// <summary>Returns only already-recorded rates and never contacts a provider or repairs the cache.</summary>
    public async Task<ListResponse<ExchangeRateResponse>> GetCached(int userId, DateTime start, DateTime end, string baseCurrency = "", CancellationToken ct = default)
    {
        if (end < start)
        {
            throw new ValidationFailedException("End date must be on or after start date.");
        }

        baseCurrency = ResolveBaseCurrency(userId, baseCurrency);
        DateTime startDate = start.Date;
        DateTime endDate = end.Date;
        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true)
            .Where(rate => rate.Created >= startDate
                && rate.Created <= endDate
                && rate.FromCode == baseCurrency
                && !rate.IsTemporary);

        List<ExchangeRate> cachedRates = await rates
            .OrderBy(rate => rate.Created)
            .ThenBy(rate => rate.ToCode)
            .ToListAsync(ct);

        return new ListResponse<ExchangeRateResponse>
        {
            Data = cachedRates.Select(ExchangeRateMapper.ToResponse).ToList()
        };
    }

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
    /// Returns currency codes used in the user's enabled accounts, excluding the base currency.
    /// Only currencies actually in use are fetched from providers, preventing legacy or
    /// unsupported seeded currencies from keeping dates permanently uncached.
    /// </summary>
    private async Task<IList<string>> ResolveTargetCurrencyCodes(int userId, string baseCurrency, CancellationToken ct = default)
    {
        return await DbInEx.AccountRepository.Get(true, null, a => a.Currency)
            .Where(a => a.UserId == userId && a.IsEnabled && a.Currency.Key != baseCurrency)
            .Select(a => a.Currency.Key)
            .Distinct()
            .ToListAsync(ct);
    }

    private async Task SynchronizeMissingRates(
        int userId,
        IReadOnlyCollection<DateTime> candidateDates,
        string baseCurrency,
        IList<string> targetCurrencyCodes,
        CancellationToken ct = default)
    {
        var initialMissingTargetsByDate = await GetMissingTargetsByDate(candidateDates, baseCurrency, targetCurrencyCodes, ct);
        if (initialMissingTargetsByDate.Count == 0)
        {
            return;
        }

        using IDisposable synchronizationLock = await _synchronizationLock.AcquireAsync(
            baseCurrency,
            initialMissingTargetsByDate.Keys.Select(DateOnly.FromDateTime).ToList(),
            ct);
        // Another request may have populated the cache while this request was waiting.
        var missingTargetsByDate = await GetMissingTargetsByDate(candidateDates, baseCurrency, targetCurrencyCodes, ct);
        if (missingTargetsByDate.Count == 0)
        {
            return;
        }

        bool hasProviderChanges = false;
            foreach (var range in GetContiguousRanges(missingTargetsByDate.Keys))
            {
                var rangeMissingTargetsByDate = missingTargetsByDate
                    .Where(item => item.Key >= range.Start && item.Key <= range.End)
                    .ToDictionary(item => item.Key, item => (IReadOnlySet<string>)item.Value);
                var rangeTargetCodes = rangeMissingTargetsByDate.Values
                    .SelectMany(targets => targets)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                var rangeRates = await FetchRatesForRange(range.Start, range.End, baseCurrency, rangeTargetCodes, rangeMissingTargetsByDate, ct);

                foreach (var (date, response) in rangeRates)
                {
                    if (!rangeMissingTargetsByDate.TryGetValue(date.Date, out var missingTargetCodes))
                    {
                        continue;
                    }

                    hasProviderChanges |= await UpsertRatesForDate(userId, date, baseCurrency, response, missingTargetCodes, ct);
                }
            }

            if (hasProviderChanges)
                await DbInEx.SaveAsync(ct);

            // Carry forward missing currencies for non-trading days or partial provider data.
            missingTargetsByDate = await GetMissingTargetsByDate(candidateDates, baseCurrency, targetCurrencyCodes, ct);
            bool hasCarryForwardChanges = false;
            foreach (var (date, missingTargetCodes) in missingTargetsByDate.OrderBy(item => item.Key))
            {
                hasCarryForwardChanges |= await CarryForwardMissingRatesFromPriorDay(userId, date, baseCurrency, missingTargetCodes.ToList(), ct);
            }

            if (hasCarryForwardChanges)
                await DbInEx.SaveAsync(ct);
    }

    private async Task<Dictionary<DateTime, HashSet<string>>> GetMissingTargetsByDate(
        IReadOnlyCollection<DateTime> dates,
        string baseCurrency,
        IList<string> targetCurrencyCodes,
        CancellationToken ct = default)
    {
        var normalizedDates = dates
            .Select(d => d.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();
        var normalizedTargets = targetCurrencyCodes
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedDates.Count == 0 || normalizedTargets.Count == 0)
        {
            return new Dictionary<DateTime, HashSet<string>>();
        }

        var cachedRates = await DbInEx.ExchangeRateRepository.Get(true)
            .Where(r => normalizedDates.Contains(r.Created)
                     && r.FromCode == baseCurrency
                     && !r.IsTemporary
                     && normalizedTargets.Contains(r.ToCode))
            .Select(r => new { r.Created, r.ToCode })
            .ToListAsync(ct);

        var cachedTargetsByDate = cachedRates
            .GroupBy(r => r.Created.Date)
            .ToDictionary(
                group => group.Key,
                group => group.Select(r => r.ToCode).ToHashSet(StringComparer.OrdinalIgnoreCase));

        var missingTargetsByDate = new Dictionary<DateTime, HashSet<string>>();
        foreach (var date in normalizedDates)
        {
            cachedTargetsByDate.TryGetValue(date, out var cachedTargets);
            var missingTargets = normalizedTargets
                .Where(targetCode => cachedTargets is null || !cachedTargets.Contains(targetCode))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (missingTargets.Count > 0)
            {
                missingTargetsByDate[date] = missingTargets;
            }
        }

        return missingTargetsByDate;
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
        DateTime start,
        DateTime end,
        string baseCurrency,
        string[] targetCurrencies,
        IReadOnlyDictionary<DateTime, IReadOnlySet<string>>? requiredTargetsByDate = null,
        CancellationToken ct = default)
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
            var datesToFetch = GetCurrencyApiFallbackDates(start, end, result, requiredTargetsByDate);

            foreach (var date in datesToFetch)
            {
                var requiredStandardCurrencies = requiredTargetsByDate is not null
                    ? requiredTargetsByDate[date]
                        .Where(targetCurrency => standardTargetCurrencies.Contains(targetCurrency, StringComparer.OrdinalIgnoreCase))
                        .ToArray()
                    : standardTargetCurrencies;

                if (requiredStandardCurrencies.Length == 0)
                {
                    continue;
                }

                var coveredCurrencies = result.TryGetValue(date.Date, out var dateResponse)
                    ? dateResponse.Data.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase)
                    : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var uncoveredCurrencies = requiredStandardCurrencies
                    .Where(c => !coveredCurrencies.Contains(c))
                    .ToArray();

                if (uncoveredCurrencies.Length == 0)
                {
                    continue;
                }

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
    private async Task<bool> UpsertRatesForDate(
        int userId,
        DateTime date,
        string baseCurrency,
        ExchangeApiResponse response,
        IReadOnlySet<string>? requiredTargetCodes = null,
        CancellationToken ct = default)
    {
        DateTime createdDate = date.Date;
        var requiredTargets = requiredTargetCodes is null
            ? null
            : new HashSet<string>(requiredTargetCodes, StringComparer.OrdinalIgnoreCase);

        List<ExchangeRate> existingRates = DbInEx.ExchangeRateRepository.Get(false)
            .Where(i => i.Created == createdDate && i.FromCode == baseCurrency)
            .ToList();

        bool hasChanges = false;

        foreach (KeyValuePair<string, ExchangeDateData> item in response.Data)
        {
            string toCode = string.IsNullOrWhiteSpace(item.Value.Code) ? item.Key : item.Value.Code;
            decimal value = item.Value.Value;

            if (requiredTargets is not null && !requiredTargets.Contains(toCode))
            {
                continue;
            }

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
    private async Task CreateTemporaryRatesForTodayIfNeeded(int userId, DateTime date, string baseCurrency, IList<string> targetCurrencyCodes, CancellationToken ct = default)
    {
        DateTime today = date.Date;
        using IDisposable synchronizationLock = await _synchronizationLock.AcquireAsync(
            baseCurrency,
            [DateOnly.FromDateTime(today)],
            ct);
        List<ExchangeRate> existingRates = DbInEx.ExchangeRateRepository.Get(true)
                .Where(i => i.Created == today && i.FromCode == baseCurrency)
                .ToList();
            var existingTargetCodes = existingRates
                .Select(rate => rate.ToCode)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingTargetCodes = targetCurrencyCodes
                .Where(targetCode => !existingTargetCodes.Contains(targetCode))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (existingRates.Count > 0 && missingTargetCodes.Count == 0)
            {
                return;
            }

            List<ExchangeRate> latestRates = DbInEx.ExchangeRateRepository.Get(true)
                .Where(i => i.Created < today
                         && i.FromCode == baseCurrency
                         && !i.IsTemporary
                         && missingTargetCodes.Contains(i.ToCode))
                .OrderByDescending(i => i.Created)
                .GroupBy(i => i.ToCode)
                .Select(g => g.First())
                .ToList();

            if (existingRates.Count == 0 && missingTargetCodes.Count == 0)
            {
                missingTargetCodes = latestRates
                    .Select(rate => rate.ToCode)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
            }

            foreach (ExchangeRate rate in latestRates.Where(rate => missingTargetCodes.Contains(rate.ToCode)))
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

            if (latestRates.Any(rate => missingTargetCodes.Contains(rate.ToCode)))
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
        List<ExchangeRate> existingRates = DbInEx.ExchangeRateRepository.Get(false)
            .Where(r => r.Created == date.Date && r.FromCode == baseCurrency)
            .ToList();

        var existingActualTargetCodes = existingRates
            .Where(r => !r.IsTemporary)
            .Select(r => r.ToCode)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missingTargetCodes = targetCurrencyCodes
            .Where(targetCode => !existingActualTargetCodes.Contains(targetCode))
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
            var existingRate = existingRates.FirstOrDefault(r => string.Equals(r.ToCode, rate.ToCode, StringComparison.OrdinalIgnoreCase));
            if (existingRate is null)
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

                continue;
            }

            if (existingRate.Rate != rate.Rate || existingRate.IsTemporary)
            {
                existingRate.Rate = rate.Rate;
                existingRate.IsTemporary = false;
                DbInEx.ExchangeRateRepository.Update(existingRate);
            }
        }

        return priorRates.Count > 0;
    }

    private static IEnumerable<DateTime> EnumerateDates(DateTime start, DateTime end)
    {
        if (end < start)
        {
            yield break;
        }

        for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    private static IEnumerable<(DateTime Start, DateTime End)> GetContiguousRanges(IEnumerable<DateTime> dates)
    {
        DateTime? rangeStart = null;
        DateTime? previous = null;

        foreach (var date in dates.Select(d => d.Date).Distinct().OrderBy(d => d))
        {
            if (rangeStart is null)
            {
                rangeStart = date;
                previous = date;
                continue;
            }

            if (previous!.Value.AddDays(1) == date)
            {
                previous = date;
                continue;
            }

            yield return (rangeStart.Value, previous.Value);
            rangeStart = date;
            previous = date;
        }

        if (rangeStart.HasValue && previous.HasValue)
        {
            yield return (rangeStart.Value, previous.Value);
        }
    }

    private static List<DateTime> GetCurrencyApiFallbackDates(
        DateTime start,
        DateTime end,
        IReadOnlyDictionary<DateTime, ExchangeApiResponse> providerResult,
        IReadOnlyDictionary<DateTime, IReadOnlySet<string>>? requiredTargetsByDate)
    {
        if (requiredTargetsByDate is null)
        {
            return providerResult.Count > 0
                ? providerResult.Keys.OrderBy(d => d).ToList()
                : EnumerateDates(start, end).ToList();
        }

        if (providerResult.Count == 0)
        {
            return requiredTargetsByDate.Keys.OrderBy(d => d).ToList();
        }

        var providerDates = providerResult.Keys.ToHashSet();
        return requiredTargetsByDate.Keys
            .Where(providerDates.Contains)
            .OrderBy(d => d)
            .ToList();
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
    private readonly IExchangeRateSynchronizationLock _synchronizationLock;

    #endregion Private Fields
}
