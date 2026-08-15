using inex.Application.ExchangeRates.Synchronization.Exceptions;
using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Domain.ExchangeRates;

namespace inex.Application.ExchangeRates.Synchronization;

public sealed record SynchronizeExchangeRatesCommand(
    int UserId,
    DateOnly StartDate,
    DateOnly EndDate);

public sealed class SynchronizeExchangeRatesCommandHandler
{
    private readonly IHistoricalRateProvider _historicalRateProvider;
    private readonly IExchangeRateUserScopeReader _exchangeRateUserScopeReader;
    private readonly IExchangeRateRepository _exchangeRateRepository;
    private readonly IExchangeRateSynchronizationLock _synchronizationLock;
    private readonly TimeProvider _timeProvider;

    public SynchronizeExchangeRatesCommandHandler(
        IHistoricalRateProvider historicalRateProvider,
        IExchangeRateUserScopeReader exchangeRateUserScopeReader,
        IExchangeRateRepository exchangeRateRepository,
        IExchangeRateSynchronizationLock synchronizationLock,
        TimeProvider timeProvider)
    {
        _historicalRateProvider = historicalRateProvider;
        _exchangeRateUserScopeReader = exchangeRateUserScopeReader;
        _exchangeRateRepository = exchangeRateRepository;
        _synchronizationLock = synchronizationLock;
        _timeProvider = timeProvider;
    }

    public async Task HandleAsync(SynchronizeExchangeRatesCommand request, CancellationToken cancellationToken)
    {
        DateOnly today = DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);
        Validate(request, today);

        var userScope = await _exchangeRateUserScopeReader.GetAsync(request.UserId, cancellationToken);
        if (userScope.QuoteCurrencyCodes.Count == 0)
        {
            return;
        }

        IReadOnlyCollection<DateOnly> datesInRange = GetDatesInRange(request.StartDate, request.EndDate);
        List<DateOnly> historicalDates = datesInRange.Where(date => date < today).ToList();
        bool includesToday = datesInRange.Contains(today);

        using IDisposable synchronizationLock = await _synchronizationLock.AcquireAsync(
            userScope.BaseCurrencyCode,
            datesInRange,
            cancellationToken);
        IReadOnlyCollection<ExchangeRate> existingRates = await _exchangeRateRepository.GetExistingAsync(
            userScope.BaseCurrencyCode,
            userScope.QuoteCurrencyCodes,
            datesInRange,
            cancellationToken);

        List<ExchangeRate> historicalRatesToPersist = await SynchronizeHistoricalRatesAsync(
            historicalDates,
            userScope.BaseCurrencyCode,
            userScope.QuoteCurrencyCodes,
            existingRates,
            cancellationToken);

        List<ExchangeRate> todayRatesToPersist = includesToday
            ? await CreateTemporaryTodayRatesAsync(
                today,
                userScope.BaseCurrencyCode,
                userScope.QuoteCurrencyCodes,
                existingRates,
                historicalRatesToPersist,
                cancellationToken)
            : [];

        if (historicalRatesToPersist.Count == 0 && todayRatesToPersist.Count == 0)
        {
            return;
        }

        await _exchangeRateRepository.UpsertRangeAsync(
            historicalRatesToPersist.Concat(todayRatesToPersist).ToList(),
            cancellationToken);
    }

    private async Task<List<ExchangeRate>> SynchronizeHistoricalRatesAsync(
        IReadOnlyCollection<DateOnly> historicalDates,
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        IReadOnlyCollection<ExchangeRate> existingRates,
        CancellationToken cancellationToken)
    {
        if (historicalDates.Count == 0)
        {
            return [];
        }

        var actualRates = existingRates.Where(rate => !rate.IsTemporary).ToList();
        var actualRateKeys = actualRates
            .Select(rate => CreateRateKey(rate.Date, rate.QuoteCurrencyCode))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingTargetsByDate = historicalDates
            .OrderBy(date => date)
            .Select(date => new
            {
                Date = date,
                Targets = quoteCurrencyCodes
                    .Where(currencyCode => !actualRateKeys.Contains(CreateRateKey(date, currencyCode)))
                    .ToList()
            })
            .Where(item => item.Targets.Count > 0)
            .ToList();

        if (missingTargetsByDate.Count == 0)
        {
            return [];
        }

        IReadOnlyCollection<DateOnly> missingDates = missingTargetsByDate.Select(item => item.Date).ToList();
        IReadOnlyCollection<string> missingTargetCurrencies = missingTargetsByDate
            .SelectMany(item => item.Targets)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var expectedRateKeys = missingTargetsByDate
            .SelectMany(item => item.Targets.Select(currencyCode => CreateRateKey(item.Date, currencyCode)))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        IReadOnlyCollection<Models.ExchangeRateQuote> providerQuotes = await _historicalRateProvider.GetHistoricalRatesAsync(
            missingDates,
            baseCurrencyCode,
            missingTargetCurrencies,
            cancellationToken);

        var requestDateSet = missingDates.ToHashSet();
        bool hasInvalidQuote = providerQuotes.Any(quote =>
            !quote.BaseCurrencyCode.Equals(baseCurrencyCode, StringComparison.OrdinalIgnoreCase)
            || !requestDateSet.Contains(quote.Date)
            || !missingTargetCurrencies.Contains(quote.QuoteCurrencyCode, StringComparer.OrdinalIgnoreCase)
            || quote.Rate <= 0);
        bool hasDuplicates = providerQuotes
            .GroupBy(quote => CreateRateKey(quote.Date, quote.QuoteCurrencyCode), StringComparer.OrdinalIgnoreCase)
            .Any(group => group.Count() > 1);

        if (hasInvalidQuote || hasDuplicates)
        {
            throw new SynchronizationProviderResponseException(
                "provider_response.invalid",
                "Provider returned invalid exchange-rate data.");
        }

        var providerQuotesByKey = providerQuotes
            .Where(quote => expectedRateKeys.Contains(CreateRateKey(quote.Date, quote.QuoteCurrencyCode)))
            .ToDictionary(
                quote => CreateRateKey(quote.Date, quote.QuoteCurrencyCode),
                StringComparer.OrdinalIgnoreCase);
        var ratesToPersist = new List<ExchangeRate>();

        foreach (var missingDate in missingTargetsByDate)
        {
            foreach (string targetCurrencyCode in missingDate.Targets)
            {
                string key = CreateRateKey(missingDate.Date, targetCurrencyCode);
                if (providerQuotesByKey.TryGetValue(key, out Models.ExchangeRateQuote? providerQuote))
                {
                    ratesToPersist.Add(CreateActualRate(providerQuote));
                    continue;
                }

                ExchangeRate? priorRate = FindPriorActualRate(
                    missingDate.Date,
                    targetCurrencyCode,
                    actualRates.Concat(ratesToPersist));
                if (priorRate is null)
                {
                    priorRate = (await _exchangeRateRepository.GetLatestActualBeforeAsync(
                            missingDate.Date,
                            baseCurrencyCode,
                            [targetCurrencyCode],
                            cancellationToken))
                        .SingleOrDefault();
                }

                if (priorRate is null)
                {
                    throw new SynchronizationProviderResponseException(
                        "provider_response.incomplete",
                        "Provider did not return an exchange rate and no prior actual rate is available.");
                }

                ratesToPersist.Add(ExchangeRate.Create(
                    id: 0,
                    baseCurrencyCode,
                    targetCurrencyCode,
                    missingDate.Date,
                    priorRate.Rate,
                    isTemporary: false));
            }
        }

        return ratesToPersist;
    }

    private async Task<List<ExchangeRate>> CreateTemporaryTodayRatesAsync(
        DateOnly today,
        string baseCurrencyCode,
        IReadOnlyCollection<string> quoteCurrencyCodes,
        IReadOnlyCollection<ExchangeRate> existingRates,
        IReadOnlyCollection<ExchangeRate> historicalRatesToPersist,
        CancellationToken cancellationToken)
    {
        var existingTodayRateKeys = existingRates
            .Where(rate => rate.Date == today)
            .Select(rate => CreateRateKey(today, rate.QuoteCurrencyCode))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        List<string> missingTodayCurrencies = quoteCurrencyCodes
            .Where(currencyCode => !existingTodayRateKeys.Contains(CreateRateKey(today, currencyCode)))
            .ToList();

        if (missingTodayCurrencies.Count == 0)
        {
            return [];
        }

        var sourceRates = existingRates
            .Where(rate => rate.Date < today && !rate.IsTemporary)
            .Concat(historicalRatesToPersist)
            .Where(rate => rate.Date < today && !rate.IsTemporary)
            .ToList();
        var temporaryRates = new List<ExchangeRate>();

        foreach (string targetCurrencyCode in missingTodayCurrencies)
        {
            ExchangeRate? priorRate = FindPriorActualRate(today, targetCurrencyCode, sourceRates);
            if (priorRate is null)
            {
                priorRate = (await _exchangeRateRepository.GetLatestActualBeforeAsync(
                        today,
                        baseCurrencyCode,
                        [targetCurrencyCode],
                        cancellationToken))
                    .SingleOrDefault();
            }

            if (priorRate is null
                || !priorRate.BaseCurrencyCode.Equals(baseCurrencyCode, StringComparison.OrdinalIgnoreCase)
                || priorRate.Rate <= 0)
            {
                throw new TemporaryRateSourceException(
                    "temporary_rate.source_missing",
                    "No prior actual exchange rate was found for a requested currency.");
            }

            temporaryRates.Add(ExchangeRate.Create(
                id: 0,
                baseCurrencyCode,
                targetCurrencyCode,
                today,
                priorRate.Rate,
                isTemporary: true));
        }

        return temporaryRates;
    }

    private static ExchangeRate CreateActualRate(Models.ExchangeRateQuote quote) => ExchangeRate.Create(
        id: 0,
        quote.BaseCurrencyCode,
        quote.QuoteCurrencyCode,
        quote.Date,
        quote.Rate,
        isTemporary: false);

    private static ExchangeRate? FindPriorActualRate(
        DateOnly beforeDate,
        string quoteCurrencyCode,
        IEnumerable<ExchangeRate> rates) =>
        rates
            .Where(rate => rate.Date < beforeDate
                && !rate.IsTemporary
                && rate.QuoteCurrencyCode.Equals(quoteCurrencyCode, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(rate => rate.Date)
            .FirstOrDefault();

    private static string CreateRateKey(DateOnly date, string quoteCurrencyCode) =>
        $"{date:yyyy-MM-dd}:{quoteCurrencyCode.ToUpperInvariant()}";

    private static IReadOnlyCollection<DateOnly> GetDatesInRange(DateOnly startDate, DateOnly endDate)
    {
        var dates = new List<DateOnly>();
        for (DateOnly date = startDate; date <= endDate; date = date.AddDays(1))
        {
            dates.Add(date);
        }

        return dates;
    }

    private static void Validate(SynchronizeExchangeRatesCommand command, DateOnly today)
    {
        const int maxIntervalDays = 31;
        DateOnly firstSupportedDate = new(2010, 1, 1);

        if (command.StartDate > command.EndDate)
        {
            throw new SynchronizationValidationException("date_range.invalid_order", "Start date cannot be greater than end date.");
        }

        if (command.StartDate < firstSupportedDate)
        {
            throw new SynchronizationValidationException("date_range.before_first_supported", "Start date cannot be less than 2010-01-01.");
        }

        if (command.EndDate > today)
        {
            throw new SynchronizationValidationException("date_range.in_future", "End date cannot be greater than the current date.");
        }

        int intervalDays = command.EndDate.DayNumber - command.StartDate.DayNumber + 1;
        if (intervalDays > maxIntervalDays)
        {
            throw new SynchronizationValidationException("date_range.too_long", $"Date range cannot exceed {maxIntervalDays} days.");
        }
    }

}
