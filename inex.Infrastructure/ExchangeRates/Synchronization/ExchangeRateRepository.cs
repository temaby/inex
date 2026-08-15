using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Data.Repositories.Base;
using inex.Domain.ExchangeRates;
using DataExchangeRate = inex.Data.Models.ExchangeRate;
using Microsoft.EntityFrameworkCore;

namespace inex.Infrastructure.ExchangeRates.Synchronization;

/// <summary>Persists shared exchange-rate reference data used by a user's currency scope.</summary>
public sealed class ExchangeRateRepository : IExchangeRateRepository
{
    private readonly IInExUnitOfWork _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public ExchangeRateRepository(IInExUnitOfWork unitOfWork, TimeProvider timeProvider)
    {
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
    }

    public async Task<IReadOnlyCollection<ExchangeRate>> GetExistingAsync(
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        IReadOnlyCollection<DateOnly> dates,
        CancellationToken cancellationToken)
    {
        var normalizedQuotes = quoteCurrencyCodes
            .Select(currencyCode => currencyCode.ToUpperInvariant())
            .ToHashSet(StringComparer.Ordinal);
        var dateTimes = dates.Select(date => date.ToDateTime(TimeOnly.MinValue)).ToHashSet();

        if (normalizedQuotes.Count == 0 || dateTimes.Count == 0)
        {
            return Array.Empty<ExchangeRate>();
        }

        List<DataExchangeRate> rates = await _unitOfWork.ExchangeRateRepository
            .Get(true)
            .Where(rate => rate.FromCode == baseCurrencyCode
                && normalizedQuotes.Contains(rate.ToCode)
                && dateTimes.Contains(rate.Created))
            .ToListAsync(cancellationToken);

        return rates.Select(MapToDomain).ToList();
    }

    public async Task<IReadOnlyCollection<ExchangeRate>> GetLatestActualBeforeAsync(
        DateOnly beforeDate,
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        CancellationToken cancellationToken)
    {
        var normalizedQuotes = quoteCurrencyCodes
            .Select(currencyCode => currencyCode.ToUpperInvariant())
            .ToHashSet(StringComparer.Ordinal);

        if (normalizedQuotes.Count == 0)
        {
            return Array.Empty<ExchangeRate>();
        }

        List<DataExchangeRate> candidates = await _unitOfWork.ExchangeRateRepository
            .Get(true)
            .Where(rate => rate.Created < beforeDate.ToDateTime(TimeOnly.MinValue)
                && rate.FromCode == baseCurrencyCode
                && normalizedQuotes.Contains(rate.ToCode)
                && !rate.IsTemporary)
            .OrderByDescending(rate => rate.Created)
            .ToListAsync(cancellationToken);

        return candidates
            .GroupBy(rate => rate.ToCode, StringComparer.OrdinalIgnoreCase)
            .Select(group => MapToDomain(group.First()))
            .ToList();
    }

    public async Task UpsertRangeAsync(
        IReadOnlyCollection<ExchangeRate> exchangeRates,
        CancellationToken cancellationToken)
    {
        if (exchangeRates.Count == 0)
        {
            return;
        }

        var rateKeys = exchangeRates
            .Select(rate => CreateKey(rate.BaseCurrencyCode, rate.QuoteCurrencyCode, rate.Date))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var baseCurrencies = exchangeRates.Select(rate => rate.BaseCurrencyCode).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quoteCurrencies = exchangeRates.Select(rate => rate.QuoteCurrencyCode).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var dates = exchangeRates.Select(rate => rate.Date.ToDateTime(TimeOnly.MinValue)).Distinct().ToList();

        List<DataExchangeRate> existingRates = await _unitOfWork.ExchangeRateRepository
            .Get(false)
            .Where(rate => baseCurrencies.Contains(rate.FromCode)
                && quoteCurrencies.Contains(rate.ToCode)
                && dates.Contains(rate.Created))
            .ToListAsync(cancellationToken);

        var existingByKey = existingRates
            .Where(rate => rateKeys.Contains(CreateKey(rate.FromCode, rate.ToCode, DateOnly.FromDateTime(rate.Created))))
            .ToDictionary(rate => CreateKey(rate.FromCode, rate.ToCode, DateOnly.FromDateTime(rate.Created)), StringComparer.OrdinalIgnoreCase);
        DateTime now = _timeProvider.GetUtcNow().UtcDateTime;

        foreach (ExchangeRate rate in exchangeRates)
        {
            string key = CreateKey(rate.BaseCurrencyCode, rate.QuoteCurrencyCode, rate.Date);
            if (existingByKey.TryGetValue(key, out DataExchangeRate? existing))
            {
                existing.Rate = rate.Rate;
                existing.IsTemporary = rate.IsTemporary;
                existing.Updated = now;
                _unitOfWork.ExchangeRateRepository.Update(existing);
                continue;
            }

            await _unitOfWork.ExchangeRateRepository.CreateAsync(new DataExchangeRate
            {
                FromCode = rate.BaseCurrencyCode,
                ToCode = rate.QuoteCurrencyCode,
                Rate = rate.Rate,
                IsTemporary = rate.IsTemporary,
                Created = rate.Date.ToDateTime(TimeOnly.MinValue),
                Updated = now
            }, cancellationToken);
        }

        await _unitOfWork.SaveAsync(cancellationToken);
    }

    private static ExchangeRate MapToDomain(DataExchangeRate rate) => ExchangeRate.Create(
        rate.Id,
        rate.FromCode,
        rate.ToCode,
        DateOnly.FromDateTime(rate.Created),
        rate.Rate,
        rate.IsTemporary);

    private static string CreateKey(string baseCurrencyCode, string quoteCurrencyCode, DateOnly date) =>
        $"{date:yyyy-MM-dd}:{baseCurrencyCode.ToUpperInvariant()}:{quoteCurrencyCode.ToUpperInvariant()}";
}
