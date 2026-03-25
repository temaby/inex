using AutoMapper;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using inex.Services.Services;
using inex.Services.Tests.Helpers;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace inex.Services.Tests.Services;

/// <summary>
/// Unit tests for <see cref="ExchangeRateService"/>.
/// All database access and the external currency API provider are mocked — no I/O occurs.
/// </summary>
public class ExchangeRateServiceTests
{
    private readonly Mock<IInExUnitOfWork> _uowMock = new();
    private readonly Mock<IMapper> _mapperMock = new();
    private readonly Mock<IExchangeRateClient> _clientMock = new();
    private readonly Mock<IExchangeRateClient> _fallbackClientMock = new();
    private readonly Mock<IEditableRepository<ExchangeRate>> _exchangeRateRepoMock = new();
    private readonly Mock<IRepository<Currency>> _currencyRepoMock = new();
    private readonly Mock<IEditableRepository<User>> _userRepoMock = new();

    public ExchangeRateServiceTests()
    {
        // Wire UoW repository properties so each test only needs to configure
        // the data returned by each repo, not the property access itself.
        _uowMock.Setup(u => u.ExchangeRateRepository).Returns(_exchangeRateRepoMock.Object);
        _uowMock.Setup(u => u.CurrencyRepository).Returns(_currencyRepoMock.Object);
        _uowMock.Setup(u => u.UserRepository).Returns(_userRepoMock.Object);
    }

    // --- Helpers ---

    private ExchangeRateService CreateSut() =>
        new ExchangeRateService(_uowMock.Object, _mapperMock.Object, _clientMock.Object, _fallbackClientMock.Object, NullLogger<ExchangeRateService>.Instance);

    // AsAsyncQueryable() wraps a plain IEnumerable<T> so it satisfies both
    // IQueryable<T> (sync LINQ) and IAsyncEnumerable<T> (EF ToListAsync etc.).

    private static IQueryable<ExchangeRate> RatesFor(DateTime date, string from, params string[] toCodes) =>
        toCodes.Select(to => new ExchangeRate { FromCode = from, ToCode = to, Rate = 1m, Created = date.Date, IsTemporary = false })
               .AsAsyncQueryable();

    private static IQueryable<ExchangeRate> EmptyRates() =>
        Enumerable.Empty<ExchangeRate>().AsAsyncQueryable();

    private static IQueryable<Currency> CurrenciesFor(params string[] codes) =>
        codes.Select(c => new Currency { Key = c }).AsAsyncQueryable();

    // Currency navigation property must be pre-populated because ResolveBaseCurrency
    // calls .First(u => u.Id == userId).Currency.Key without a separate join.
    private static IQueryable<User> UsersFor(int id, string currencyKey) =>
        new List<User> { new User { Id = id, Currency = new Currency { Key = currencyKey } } }
            .AsAsyncQueryable();

    // --- Tests ---

    [Fact]
    public async Task Get_Range_WhenEndBeforeStart_ThrowsDataInvalidException()
    {
        var sut = CreateSut();
        var start = new DateTime(2026, 3, 10);
        var end = new DateTime(2026, 3, 5); // end before start — invalid range

        await Assert.ThrowsAsync<ValidationFailedException>(() => sut.Get(1, start, end));
    }

    [Fact]
    public async Task Get_SingleDate_WhenRatesAlreadyCached_DoesNotCallProvider()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        // Single-date delegates to the range overload which always calls ResolveTargetCurrencyCodes.
        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor(targetCode));

        // Cache already contains a non-temporary rate for this date — sync should be skipped.
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(RatesFor(pastDate, baseCurrency, targetCode));

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — provider must NOT have been called because rates were already present
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>()), Times.Never);
    }

    [Fact]
    public async Task Get_SingleDate_WhenProviderReturnsNull_DoesNotSave()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor("USD"));

        // No rates cached — service will call the provider.
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(EmptyRates());

        // Provider returns null (e.g. network error or unsupported date).
        _clientMock.Setup(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>()))
            .ReturnsAsync((ExchangeRateResponse?)null);

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — SaveAsync must NOT be called when provider returns no data
        _uowMock.Verify(u => u.SaveAsync(), Times.Never);
    }

    [Fact]
    public async Task Get_SingleDate_WhenToday_DoesNotCallProvider()
    {
        // Arrange
        // Today's rates cannot be fetched from the provider. Instead the service
        // creates temporary rates copied from the latest known date — no API call is made.
        var today = DateTime.UtcNow.Date;
        var baseCurrency = "EUR";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        // Range overload always calls ResolveTargetCurrencyCodes before the loop.
        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor("USD"));

        // No rates exist for today or any prior date — temporary creation is attempted but skipped gracefully.
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(EmptyRates());

        var sut = CreateSut();

        // Act
        await sut.Get(1, today);

        // Assert — the provider must never be reached for today's date
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>()), Times.Never);
    }

    [Fact]
    public async Task Get_SingleDate_WhenRatesMissing_CallsProviderAndSaves()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor(targetCode));

        // No rates cached — SyncRatesForDate will call the provider.
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        // Provider returns one rate for the requested date.
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    [targetCode] = new ExchangeDateData { Code = targetCode, Value = 1.2m }
                }
            });

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — provider was called and the new rate was persisted
        _clientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.ToCode == targetCode && !e.IsTemporary)), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenDateIsToday_CreatesTemporaryRatesFromLatest()
    {
        // Arrange
        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor(targetCode));

        // Yesterday has an actual rate; today has none.
        // LINQ-to-objects predicates inside CreateTemporaryRatesForTodayIfNeeded will correctly
        // return: Any(today) = false, latestDate = yesterday, latestRates = [yesterday's rate].
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(RatesFor(yesterday, baseCurrency, targetCode));

        var sut = CreateSut();

        // Act — range of [today, today] hits only the temporary-rate creation path
        await sut.Get(1, today, today);

        // Assert — a temporary copy of yesterday's rate was created for today
        _exchangeRateRepoMock.Verify(
            r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == today && e.IsTemporary && e.ToCode == targetCode)),
            Times.Once);
        _uowMock.Verify(u => u.SaveAsync(), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenTemporaryRatesExist_ReplacesWithActual()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor(targetCode));

        // Cache has a temporary rate — Count of non-temporary will be 0, triggering a provider fetch.
        var temporaryRate = new ExchangeRate { FromCode = baseCurrency, ToCode = targetCode, Rate = 1m, Created = pastDate, IsTemporary = true };
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(new[] { temporaryRate }.AsAsyncQueryable());

        // Provider returns the actual rate for the date.
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    [targetCode] = new ExchangeDateData { Code = targetCode, Value = 1.5m }
                }
            });

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate, pastDate);

        // Assert — existing temporary rate was updated in-place, not recreated
        _exchangeRateRepoMock.Verify(r => r.Update(It.Is<ExchangeRate>(e => !e.IsTemporary && e.Rate == 1.5m)), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.IsAny<ExchangeRate>()), Times.Never);
        _uowMock.Verify(u => u.SaveAsync(), Times.Once);
    }

    [Fact]
    public async Task Get_SingleDate_WhenPrimaryProviderFails_UsesFallbackProvider()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor(targetCode));

        // No rates cached — SyncRatesForDate will call the provider.
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        // Primary provider throws an exception (e.g., network error, rate limit)
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()))
            .ThrowsAsync(new HttpRequestException("Rate limit exceeded"));

        // Fallback provider returns valid data
        _fallbackClientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    [targetCode] = new ExchangeDateData { Code = targetCode, Value = 1.2m }
                }
            });

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — both providers were called, fallback succeeded
        _clientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()), Times.Once);
        _fallbackClientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.ToCode == targetCode && !e.IsTemporary && e.Rate == 1.2m)), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(), Times.Once);
    }

    [Fact]
    public async Task Get_SingleDate_WhenPrimaryReturnsNull_UsesFallbackProvider()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<User, object>>>()))
            .Returns(UsersFor(1, baseCurrency));

        _currencyRepoMock.Setup(r => r.Get(true, null))
            .Returns(CurrenciesFor(targetCode));

        // No rates cached
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        // Primary provider returns null or empty response
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()))
            .ReturnsAsync((ExchangeRateResponse?)null);

        // Fallback provider returns valid data
        _fallbackClientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    [targetCode] = new ExchangeDateData { Code = targetCode, Value = 1.15m }
                }
            });

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — both providers were called, fallback succeeded
        _clientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()), Times.Once);
        _fallbackClientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.ToCode == targetCode && !e.IsTemporary && e.Rate == 1.15m)), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(), Times.Once);
    }
}