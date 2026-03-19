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

public class ExchangeRateService : Service, IExchangeRateService
{
    #region Constructors

    public ExchangeRateService(IInExUnitOfWork uowInEx, IMapper mapper, ICurrencyApiClient apiClient) : base(uowInEx, mapper)
    {
        _apiClient = apiClient;
    }

    #endregion Constructors

    #region Public Interface

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

        for (DateTime effectiveDate = startDate; effectiveDate <= endDate; effectiveDate = effectiveDate.AddDays(1))
        {
            if (effectiveDate > today)
            {
                break;
            }

            if (effectiveDate == today)
            {
                await CreateTemporaryRatesForTodayIfNeeded(userId, effectiveDate, baseCurrency);
                continue;
            }

            await SyncRatesForDate(userId, effectiveDate, baseCurrency, targetCurrencyCodes);
        }

        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created >= startDate && i.Created <= endDate);
        return BuildDataResponse<ExchangeRate, ExchangeRateDTO>(rates);
    }

    public async Task<ResponseDataDTO<ExchangeRateDTO>> Get(int userId, DateTime date, string baseCurrency = "")
    {
        baseCurrency = ResolveBaseCurrency(userId, baseCurrency);
        IList<string> targetCurrencyCodes = await ResolveTargetCurrencyCodes(baseCurrency);

        // provider does not support today's rates; use yesterday
        DateTime effectiveDate = date.Date == DateTime.UtcNow.Date ? date.Date.AddDays(-1) : date.Date;

        await SyncRatesForDate(userId, effectiveDate, baseCurrency, targetCurrencyCodes);

        IQueryable<ExchangeRate> rates = DbInEx.ExchangeRateRepository.Get(true).Where(i => i.Created == effectiveDate);
        return BuildDataResponse<ExchangeRate, ExchangeRateDTO>(rates);
    }

    #endregion Public Interface

    #region Private Methods

    private string ResolveBaseCurrency(int userId, string? baseCurrency)
    {
        if (string.IsNullOrEmpty(baseCurrency))
        {
            baseCurrency = DbInEx.UserRepository.Get(true, null, i => i.Currency).First(i => i.Id == userId).Currency.Key;
        }

        return baseCurrency;
    }

    private async Task<IList<string>> ResolveTargetCurrencyCodes(string baseCurrency)
    {
        return await DbInEx.CurrencyRepository.Get(true)
            .Where(i => i.Key != baseCurrency)
            .Select(i => i.Key)
            .ToListAsync();
    }

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

    private async Task<CurrencyApiResponse?> FetchRatesForDate(DateTime date, string baseCurrency, IList<string> targetCurrencyCodes)
    {
        if (targetCurrencyCodes.Count == 0)
        {
            return null;
        }

        return await _apiClient.GetRatesAsync(date.Date, baseCurrency, targetCurrencyCodes.ToArray());
    }

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

    private async Task CreateTemporaryRatesForTodayIfNeeded(int userId, DateTime date, string baseCurrency)
    {
        DateTime today = date.Date;

        bool ratesExist = DbInEx.ExchangeRateRepository.Get(true)
            .Any(i => i.Created == today && i.FromCode == baseCurrency);

        if (ratesExist)
        {
            return;
        }

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

    #endregion Private Fields
}