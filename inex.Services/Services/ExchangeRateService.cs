using AutoMapper;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore;

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

    public ExchangeRateService(IInExUnitOfWork uowInEx, IMapper mapper, ICurrencyApiClient apiClient, ICurrencyApiClient fallbackClient) : base(uowInEx, mapper)
    {
        _apiClient = apiClient;
        _fallbackClient = fallbackClient;
    }

    #endregion Constructors

    #region Public Interface

    /// <summary>
    /// Returns exchange rates for every day in the inclusive range [<paramref name="start"/>, <paramref name="end"/>].
    /// Past dates are synced from the provider if not yet cached.
    /// Today's slot is filled with temporary rates copied from the latest available date.
    /// Future dates are silently skipped.
    /// </summary>
    /// <exception cref="InExException">Thrown when <paramref name="end"/> is before <paramref name="start"/>.</exception>
    public async Task<ResponseDataDTO<ExchangeRateDTO>> Get(int userId, DateTime start, DateTime end, string baseCurrency = "")
    {
        if (end < start)
        {
            throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.DataInvalid, MessageSeverity.Error) });
        }

        baseCurrency = ResolveBaseCurrency(userId, baseCurrency);
        IList<string> targetCurrencyCodes = await ResolveTargetCurrencyCodes(baseCurrency);

        DateTime startDate = start.Date;
        DateTime endDate = end.Date;
        DateTime today = DateTime.UtcNow.Date;
        endDate = endDate <= today ? endDate : today;

        for (DateTime effectiveDate = startDate; effectiveDate <= endDate; effectiveDate = effectiveDate.AddDays(1))
        {
            if (effectiveDate == today)
            {
                await CreateTemporaryRatesForTodayIfNeeded(userId, effectiveDate, baseCurrency);
                continue;
            }

            await SyncRatesForDate(userId, effectiveDate, baseCurrency, targetCurrencyCodes);
        }

        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created >= startDate && i.Created <= endDate && i.FromCode == baseCurrency);
        return BuildDataResponse<ExchangeRate, ExchangeRateDTO>(rates);
    }

    /// <summary>
    /// Returns exchange rates for a single <paramref name="date"/>.
    /// Delegates to the range overload with <c>start == end == date</c>.
    /// </summary>
    public Task<ResponseDataDTO<ExchangeRateDTO>> Get(int userId, DateTime date, string baseCurrency = "")
        => Get(userId, date, date, baseCurrency);

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
    private async Task<IList<string>> ResolveTargetCurrencyCodes(string baseCurrency)
    {
        return await DbInEx.CurrencyRepository.Get(true)
            .Where(i => i.Key != baseCurrency)
            .Select(i => i.Key)
            .ToListAsync();
    }

    /// <summary>
    /// Ensures actual (non-temporary) rates exist in the database for the given date.
    /// Skipped when the cache already has a full set of actual rates.
    /// Calls the provider and upserts the results if rates are missing or incomplete.
    /// </summary>
    private async Task SyncRatesForDate(int userId, DateTime date, string baseCurrency, IList<string> targetCurrencyCodes)
    {
        DateTime requestedDate = date.Date;

        int actualRatesCount = DbInEx.ExchangeRateRepository.Get(true)
            .Count(i => i.Created == requestedDate && i.FromCode == baseCurrency && !i.IsTemporary);

        if (actualRatesCount >= targetCurrencyCodes.Count)
        {
            return;
        }

        CurrencyApiResponse? response = await FetchRatesForDate(requestedDate, baseCurrency, targetCurrencyCodes);

        if (response?.Data is null || response.Data.Count == 0)
        {
            return;
        }

        bool hasChanges = await UpsertRatesForDate(userId, requestedDate, baseCurrency, response);

        if (hasChanges)
        {
            await DbInEx.SaveAsync();
        }
    }

    /// <summary>
    /// Calls the external currency API for the given date.
    /// If the primary provider fails or returns no data, attempts to use the fallback provider.
    /// Returns <see langword="null"/> when there are no target currencies to fetch or when both providers fail.
    /// </summary>
    private async Task<CurrencyApiResponse?> FetchRatesForDate(DateTime date, string baseCurrency, IList<string> targetCurrencyCodes)
    {
        if (targetCurrencyCodes.Count == 0)
        {
            return null;
        }

        // Try primary provider first
        try
        {
            var response = await _apiClient.GetRatesAsync(date.Date, baseCurrency, targetCurrencyCodes.ToArray());
            if (response?.Data is not null && response.Data.Count > 0)
            {
                return response;
            }
        }
        catch
        {
            // Log error in production - swallow for now and try fallback
        }

        // Try fallback provider
        try
        {
            return await _fallbackClient.GetRatesAsync(date.Date, baseCurrency, targetCurrencyCodes.ToArray());
        }
        catch
        {
            // Log error in production - swallow and return null
            return null;
        }
    }

    /// <summary>
    /// Inserts or updates exchange rates for the given date from the provider response.
    /// Existing temporary rates are overwritten with actual values.
    /// Returns <see langword="true"/> if any record was inserted or updated (caller must save).
    /// </summary>
    private async Task<bool> UpsertRatesForDate(int userId, DateTime date, string baseCurrency, CurrencyApiResponse response)
    {
        DateTime createdDate = date.Date;

        List<ExchangeRate> existingRates = DbInEx.ExchangeRateRepository.Get(false)
            .Where(i => i.Created == createdDate && i.FromCode == baseCurrency)
            .ToList();

        bool hasChanges = false;

        foreach (KeyValuePair<string, CurrencyData> item in response.Data)
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
                });

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
    private async Task CreateTemporaryRatesForTodayIfNeeded(int userId, DateTime date, string baseCurrency)
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
            });
        }

        if (latestRates.Count > 0)
        {
            await DbInEx.SaveAsync();
        }
    }

    #endregion Private Methods

    #region Private Fields

    private readonly ICurrencyApiClient _apiClient;
    private readonly ICurrencyApiClient _fallbackClient;

    #endregion Private Fields
}