using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.ExternalClients.ExchangeRate;
using inex.Services.Services;
using inex.Services.Tests.Helpers;
using inex.Data;
using inex.Data.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Linq.Expressions;

namespace inex.Services.Tests.Services;

/// <summary>
/// Unit tests for <see cref="ExchangeRateService"/>.
/// All database access and the external currency API provider are mocked — no I/O occurs.
/// </summary>
public class ExchangeRateServiceTests
{
    private readonly Mock<IInExUnitOfWork> _uowMock = new();
    private readonly Mock<IExchangeRateClient> _clientMock = new();
    private readonly Mock<IExchangeRateClient> _fallbackClientMock = new();
    private readonly Mock<INbrbApiClient> _nbrbClientMock = new();
    private readonly Mock<IEditableRepository<ExchangeRate>> _exchangeRateRepoMock = new();
    private readonly Mock<IEditableRepository<Account>> _accountRepoMock = new();
    private readonly Mock<IRepository<AppUser>> _userRepoMock = new();
    private readonly FakeClock _clock = new(new DateTime(2026, 5, 31, 10, 0, 0, DateTimeKind.Utc));

    public ExchangeRateServiceTests()
    {
        // Wire UoW repository properties so each test only needs to configure
        // the data returned by each repo, not the property access itself.
        _uowMock.Setup(u => u.ExchangeRateRepository).Returns(_exchangeRateRepoMock.Object);
        _uowMock.Setup(u => u.AccountRepository).Returns(_accountRepoMock.Object);
        _uowMock.Setup(u => u.UserRepository).Returns(_userRepoMock.Object);
        _uowMock.Setup(u => u.SaveAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
    }

    // --- Helpers ---

    private ExchangeRateService CreateSut() =>
        new ExchangeRateService(_uowMock.Object, _clientMock.Object, _fallbackClientMock.Object, _nbrbClientMock.Object, NullLogger<ExchangeRateService>.Instance, _clock, SharedSynchronizationLock.Instance);

    private sealed class SharedSynchronizationLock : IExchangeRateSynchronizationLock
    {
        internal static readonly SemaphoreSlim Semaphore = new(1, 1);

        public static SharedSynchronizationLock Instance { get; } = new();

        public async Task<IDisposable> AcquireAsync(
            string baseCurrencyCode,
            IReadOnlyCollection<DateOnly> dates,
            CancellationToken cancellationToken)
        {
            await Semaphore.WaitAsync(cancellationToken);
            return new Releaser();
        }
    }

    private sealed class Releaser : IDisposable
    {
        public void Dispose()
        {
            SharedSynchronizationLock.Semaphore.Release();
        }
    }

    // AsAsyncQueryable() wraps a plain IEnumerable<T> so it satisfies both
    // IQueryable<T> (sync LINQ) and IAsyncEnumerable<T> (EF ToListAsync etc.).

    private static IQueryable<ExchangeRate> RatesFor(DateTime date, string from, params string[] toCodes) =>
        toCodes.Select(to => new ExchangeRate { FromCode = from, ToCode = to, Rate = 1m, Created = date.Date, IsTemporary = false })
               .AsAsyncQueryable();

    private static IQueryable<ExchangeRate> EmptyRates() =>
        Enumerable.Empty<ExchangeRate>().AsAsyncQueryable();

    // Accounts with populated Currency navigation — used to set up ResolveTargetCurrencyCodes.
    private static IQueryable<Account> AccountsFor(int userId, params string[] currencyCodes) =>
        currencyCodes.Select(c => new Account { UserId = userId, IsEnabled = true, Currency = new Currency { Key = c } })
                     .AsAsyncQueryable();

    private static IQueryable<Account> AccountsFor(int userId, params (string CurrencyCode, bool IsEnabled)[] accounts) =>
        accounts.Select(account => new Account { UserId = userId, IsEnabled = account.IsEnabled, Currency = new Currency { Key = account.CurrencyCode } })
                .AsAsyncQueryable();

    private static IQueryable<Account> EmptyAccounts() =>
        Enumerable.Empty<Account>().AsAsyncQueryable();

    // Currency navigation property must be pre-populated because ResolveBaseCurrency
    // calls .First(u => u.Id == userId).Currency.Key without a separate join.
    private static IQueryable<AppUser> AppUsersFor(int id, string currencyKey) =>
        new List<AppUser> { new AppUser { Id = id, Currency = new Currency { Key = currencyKey } } }
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

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        // Single-date delegates to the range overload which always calls ResolveTargetCurrencyCodes.
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));

        // Cache already contains a non-temporary rate for this date — sync should be skipped.
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(RatesFor(pastDate, baseCurrency, targetCode));

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — provider must NOT have been called because rates were already present
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_SingleDate_WhenProviderReturnsNull_DoesNotSave()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, "USD"));

        // No rates cached — service will call the provider.
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(EmptyRates());

        // Provider returns empty (e.g. network error or unsupported date).
        _clientMock.Setup(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — SaveAsync must NOT be called when provider returns no data
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_SingleDate_WhenToday_DoesNotCallProvider()
    {
        // Arrange
        // Today's rates cannot be fetched from the provider. Instead the service
        // creates temporary rates copied from the latest known date — no API call is made.
        var today = _clock.UtcNow.Date;
        var baseCurrency = "EUR";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        // Range overload always calls ResolveTargetCurrencyCodes before the loop.
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, "USD"));

        // No rates exist for today or any prior date — temporary creation is attempted but skipped gracefully.
        _exchangeRateRepoMock.Setup(r => r.Get(true, null))
            .Returns(EmptyRates());

        var sut = CreateSut();

        // Act
        await sut.Get(1, today);

        // Assert — the provider must never be reached for today's date
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_SingleDate_WhenRatesMissing_CallsProviderAndSaves()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));

        // No rates cached — SyncRatesForDate will call the provider.
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        // Frankfurter (called first) returns one rate for the requested date.
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [pastDate] = new ExchangeRateResponse
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        [targetCode] = new ExchangeDateData { Code = targetCode, Value = 1.2m }
                    }
                }
            });

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate);

        // Assert — Frankfurter was called and the new rate was persisted
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.ToCode == targetCode && !e.IsTemporary), It.IsAny<CancellationToken>()), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenDateIsToday_CreatesTemporaryRatesFromLatest()
    {
        // Arrange
        var today = _clock.UtcNow.Date;
        var yesterday = today.AddDays(-1);
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));

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
            r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == today && e.IsTemporary && e.ToCode == targetCode), It.IsAny<CancellationToken>()),
            Times.Once);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenTemporaryRatesExist_ReplacesWithActual()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15); // any past date, not today
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));

        // Cache has a temporary rate — Count of non-temporary will be 0, triggering a provider fetch.
        var temporaryRate = new ExchangeRate { FromCode = baseCurrency, ToCode = targetCode, Rate = 1m, Created = pastDate, IsTemporary = true };
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(new[] { temporaryRate }.AsAsyncQueryable());

        // Frankfurter (called first) returns the actual rate for the date.
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [pastDate] = new ExchangeRateResponse
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        [targetCode] = new ExchangeDateData { Code = targetCode, Value = 1.5m }
                    }
                }
            });

        var sut = CreateSut();

        // Act
        await sut.Get(1, pastDate, pastDate);

        // Assert — existing temporary rate was updated in-place, not recreated
        _exchangeRateRepoMock.Verify(r => r.Update(It.Is<ExchangeRate>(e => !e.IsTemporary && e.Rate == 1.5m)), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()), Times.Never);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_SingleDate_WhenFrankfurterFails_CurrencyApiHandlesRequest()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));

        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        // Frankfurter (called first for range) throws — e.g. network error
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Service unavailable"));

        // CurrencyAPI supplements via per-date GetRatesAsync
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
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

        // Assert — Frankfurter was attempted; CurrencyAPI handled the uncovered currency
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.ToCode == targetCode && !e.IsTemporary && e.Rate == 1.2m), It.IsAny<CancellationToken>()), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_SingleDate_WhenFrankfurterReturnsEmpty_CurrencyApiHandlesRequest()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";
        var targetCode = "USD";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));

        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        // Frankfurter returns no data for this date (e.g. not in its coverage)
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());

        // CurrencyAPI supplements via per-date GetRatesAsync
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
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

        // Assert — Frankfurter was called but returned nothing; CurrencyAPI filled the gap
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.ToCode == targetCode && !e.IsTemporary && e.Rate == 1.15m), It.IsAny<CancellationToken>()), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenBynRubPath_UsesNbrbAndPersistsScaleAwareRate()
    {
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "BYN";
        var targetCode = "RUB";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        _nbrbClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, targetCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [pastDate] = new()
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        [targetCode] = new() { Code = targetCode, Value = 31.25m }
                    }
                }
            });

        var sut = CreateSut();

        await sut.Get(1, pastDate, pastDate);

        _nbrbClientMock.Verify(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, targetCode, It.IsAny<CancellationToken>()), Times.Once);
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.FromCode == baseCurrency && e.ToCode == targetCode && e.Rate == 31.25m && !e.IsTemporary), It.IsAny<CancellationToken>()), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenRubBynPath_UsesNbrbDirectly()
    {
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "RUB";
        var targetCode = "BYN";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());

        _nbrbClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, targetCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [pastDate] = new()
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        [targetCode] = new() { Code = targetCode, Value = 0.032m }
                    }
                }
            });

        var sut = CreateSut();

        await sut.Get(1, pastDate, pastDate, baseCurrency);

        _nbrbClientMock.Verify(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, targetCode, It.IsAny<CancellationToken>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.FromCode == baseCurrency && e.ToCode == targetCode && e.Rate == 0.032m), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenNbrbOmitsDate_CarriesForwardPriorRubRate()
    {
        var priorDate = new DateTime(2026, 3, 14);
        var requestedDate = new DateTime(2026, 3, 15);
        var baseCurrency = "BYN";
        var targetCode = "RUB";
        var priorRate = new ExchangeRate { FromCode = baseCurrency, ToCode = targetCode, Rate = 30m, Created = priorDate, IsTemporary = false };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(new[] { priorRate }.AsAsyncQueryable());
        _nbrbClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, targetCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());

        var sut = CreateSut();

        await sut.Get(1, requestedDate, requestedDate);

        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == requestedDate && e.ToCode == targetCode && e.Rate == 30m && !e.IsTemporary), It.IsAny<CancellationToken>()), Times.Once);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenNbrbFailsWithoutPriorRate_LeavesBynRubUnfetched()
    {
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "BYN";
        var targetCode = "RUB";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, targetCode));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());
        _nbrbClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, targetCode, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("NBRB unavailable"));

        var sut = CreateSut();

        await sut.Get(1, pastDate, pastDate);

        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()), Times.Never);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Never);
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_Range_WhenNonBynRubCurrenciesRequested_KeepsFrankfurterCurrencyApiChain()
    {
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, "USD", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(EmptyRates());
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.Is<string[]>(a => a.Contains("USD") && a.Contains("BYN")), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [pastDate] = new()
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        ["USD"] = new() { Code = "USD", Value = 1.2m }
                    }
                }
            });
        _clientMock.Setup(c => c.GetRatesAsync(pastDate, baseCurrency, It.Is<string[]>(a => a.SequenceEqual(new[] { "BYN" })), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    ["BYN"] = new() { Code = "BYN", Value = 3.5m }
                }
            });

        var sut = CreateSut();

        await sut.Get(1, pastDate, pastDate);

        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _nbrbClientMock.Verify(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_Range_WhenFrankfurterHasUsdAndNbrbOmitsRub_PersistsUsdAndCarriesRubIndependently()
    {
        var priorDate = new DateTime(2026, 3, 14);
        var requestedDate = new DateTime(2026, 3, 15);
        var baseCurrency = "BYN";
        var priorRubRate = new ExchangeRate { FromCode = baseCurrency, ToCode = "RUB", Rate = 30m, Created = priorDate, IsTemporary = false };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<System.Linq.Expressions.Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, "USD", "RUB"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(new[] { priorRubRate }.AsAsyncQueryable());
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.Is<string[]>(a => a.SequenceEqual(new[] { "USD" })), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [requestedDate] = new()
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        ["USD"] = new() { Code = "USD", Value = 0.31m }
                    }
                }
            });
        _nbrbClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, "RUB", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());

        var sut = CreateSut();

        await sut.Get(1, requestedDate, requestedDate);

        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == requestedDate && e.ToCode == "USD" && e.Rate == 0.31m), It.IsAny<CancellationToken>()), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == requestedDate && e.ToCode == "RUB" && e.Rate == 30m), It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// Regression test for the cache-completeness bug:
    ///   Before the fix, <c>ResolveTargetCurrencyCodes</c> returned every seeded currency (e.g. EUR, USD, BYR).
    ///   BYR (a legacy currency) is never returned by any provider and has no prior rate, so the required
    ///   row count for cache completeness was never reached, and the external provider was called on every
    ///   dashboard refresh.
    ///
    ///   After the fix the target set is narrowed to currencies in the user's <em>enabled</em> accounts.
    ///   A user with only a USD account therefore has target count = 1.  Once that single rate is saved the
    ///   date is considered fully cached, and a subsequent call for the same date must not hit the provider.
    /// </summary>
    [Fact]
    public async Task Get_SecondCall_WhenUnavailableSeededCurrencyAbsentFromUserAccounts_DoesNotRetryProvider()
    {
        // Arrange
        var pastDate = new DateTime(2026, 3, 15);
        var baseCurrency = "EUR";
        var accountCurrency = "USD"; // user has one enabled account in USD — no BYR account

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));

        // User's only enabled account is USD.  BYR (the unsupported seeded currency) is absent.
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>())) 
            .Returns(AccountsFor(1, accountCurrency));

        // First call: no rates cached yet, so the provider will be called.
        // CreateAsync mutates the in-memory list so the second call observes the cached row.
        var rates = new List<ExchangeRate>();
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _exchangeRateRepoMock.Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()))
            .Callback<ExchangeRate, CancellationToken>((rate, _) => rates.Add(rate))
            .ReturnsAsync((Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ExchangeRate>)null!);

        _fallbackClientMock
            .Setup(c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [pastDate] = new ExchangeRateResponse
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        [accountCurrency] = new ExchangeDateData { Code = accountCurrency, Value = 1.1m }
                    }
                }
            });

        var sut = CreateSut();

        // Act — first call fetches and caches the USD rate.
        await sut.Get(1, pastDate);

        // Act — second call for the same date.
        await sut.Get(1, pastDate);

        // Assert — provider was called exactly once (first call only); the second call found the
        // date already complete because USD (the sole target) was cached after the first call.
        _fallbackClientMock.Verify(
            c => c.GetRatesForRangeAsync(pastDate, pastDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Single(rates);
        Assert.Equal(accountCurrency, rates.Single().ToCode);
    }

    [Fact]
    public async Task Get_Range_WhenPastTemporaryRowsExistAndProviderOmitsDate_PromotesLatestCarryForwardRatesPerTarget()
    {
        var olderPriorDate = new DateTime(2026, 5, 1);
        var latestEurDate = new DateTime(2026, 5, 2);
        var requestedDate = new DateTime(2026, 5, 3);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>
        {
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.85m, Created = olderPriorDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = latestEurDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "BYN", Rate = 3.1m, Created = olderPriorDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.8m, Created = requestedDate, IsTemporary = true },
            new() { FromCode = baseCurrency, ToCode = "BYN", Rate = 3.0m, Created = requestedDate, IsTemporary = true }
        };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());
        _clientMock.Setup(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExchangeRateResponse?)null);

        var sut = CreateSut();

        await sut.Get(1, requestedDate, requestedDate, baseCurrency);

        _exchangeRateRepoMock.Verify(r => r.Update(It.Is<ExchangeRate>(e => e.Created == requestedDate && e.ToCode == "EUR" && e.Rate == 0.9m && !e.IsTemporary)), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.Update(It.Is<ExchangeRate>(e => e.Created == requestedDate && e.ToCode == "BYN" && e.Rate == 3.1m && !e.IsTemporary)), Times.Once);
        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == requestedDate), It.IsAny<CancellationToken>()), Times.Never);
        _uowMock.Verify(u => u.SaveAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_SecondCall_WhenPastTemporaryRowsWereCarriedForward_DoesNotRetryProvider()
    {
        var priorDate = new DateTime(2026, 5, 1);
        var requestedDate = new DateTime(2026, 5, 3);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>
        {
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = priorDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.8m, Created = requestedDate, IsTemporary = true }
        };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());
        _clientMock.Setup(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExchangeRateResponse?)null);

        var sut = CreateSut();

        await sut.Get(1, requestedDate, requestedDate, baseCurrency);
        await sut.Get(1, requestedDate, requestedDate, baseCurrency);

        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.False(rates.Single(r => r.Created == requestedDate && r.ToCode == "EUR").IsTemporary);
    }

    [Fact]
    public async Task Get_Range_WhenRowCountMatchesButTargetMissing_FetchesMissingTarget()
    {
        var priorDate = new DateTime(2026, 5, 1);
        var requestedDate = new DateTime(2026, 5, 2);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>
        {
            new() { FromCode = baseCurrency, ToCode = "BYN", Rate = 3.1m, Created = priorDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = requestedDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "PLN", Rate = 4.0m, Created = requestedDate, IsTemporary = false }
        };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());
        _clientMock.Setup(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExchangeRateResponse?)null);
        _exchangeRateRepoMock.Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()))
            .Callback<ExchangeRate, CancellationToken>((rate, _) => rates.Add(rate))
            .ReturnsAsync((Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ExchangeRate>)null!);

        var sut = CreateSut();

        await sut.Get(1, requestedDate, requestedDate, baseCurrency);
        await sut.Get(1, requestedDate, requestedDate, baseCurrency);

        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == requestedDate && e.ToCode == "BYN" && e.Rate == 3.1m && !e.IsTemporary), It.IsAny<CancellationToken>()), Times.Once);
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.Is<string[]>(targets => targets.SequenceEqual(new[] { "BYN" })), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Get_Range_WhenByrAccountDisabled_DoesNotRequireByrCoverage()
    {
        var requestedDate = new DateTime(2026, 5, 2);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>
        {
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = requestedDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "BYR", Rate = 2.9m, Created = requestedDate, IsTemporary = true }
        };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, ("EUR", true), ("BYR", false)));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());

        var sut = CreateSut();

        await sut.Get(1, requestedDate, requestedDate, baseCurrency);

        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_Range_WhenMissingDatesAreSparse_DoesNotCallCurrencyApiForCompleteInteriorDates()
    {
        var start = new DateTime(2026, 5, 1);
        var end = new DateTime(2026, 5, 10);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>();

        foreach (var date in Enumerable.Range(0, 10).Select(offset => start.AddDays(offset)))
        {
            rates.Add(new ExchangeRate { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = date, IsTemporary = false });
            if (date != start && date != end)
            {
                rates.Add(new ExchangeRate { FromCode = baseCurrency, ToCode = "BYN", Rate = 3.1m, Created = date, IsTemporary = false });
            }
        }

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DateTime requestedStart, DateTime requestedEnd, string _, string[] _, CancellationToken _) =>
                EnumerateDatesForTest(requestedStart, requestedEnd).ToDictionary(
                    date => date,
                    date => new ExchangeRateResponse
                    {
                        Data = new Dictionary<string, ExchangeDateData>
                        {
                            ["EUR"] = new() { Code = "EUR", Value = 0.9m }
                        }
                    }));
        _clientMock.Setup(c => c.GetRatesAsync(It.IsAny<DateTime>(), baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DateTime date, string _, string[] targets, CancellationToken _) => new ExchangeRateResponse
            {
                Data = targets.ToDictionary(target => target, target => new ExchangeDateData { Code = target, Value = 3.1m })
            });

        var sut = CreateSut();

        await sut.Get(1, start, end, baseCurrency);

        _clientMock.Verify(c => c.GetRatesAsync(start, baseCurrency, It.Is<string[]>(targets => targets.SequenceEqual(new[] { "BYN" })), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(end, baseCurrency, It.Is<string[]>(targets => targets.SequenceEqual(new[] { "BYN" })), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(It.Is<DateTime>(date => date > start && date < end), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_Range_WhenFrankfurterOmitsMissingHoliday_DoesNotCallCurrencyApiForOmittedDate()
    {
        var tradingDate = new DateTime(2026, 5, 1);
        var omittedDate = new DateTime(2026, 5, 2);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>();

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _exchangeRateRepoMock.Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()))
            .Callback<ExchangeRate, CancellationToken>((rate, _) => rates.Add(rate))
            .ReturnsAsync((Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ExchangeRate>)null!);
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(tradingDate, omittedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>
            {
                [tradingDate] = new()
                {
                    Data = new Dictionary<string, ExchangeDateData>
                    {
                        ["EUR"] = new() { Code = "EUR", Value = 0.9m }
                    }
                }
            });
        _clientMock.Setup(c => c.GetRatesAsync(tradingDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    ["BYN"] = new() { Code = "BYN", Value = 3.1m }
                }
            });

        var sut = CreateSut();

        await sut.Get(1, tradingDate, omittedDate, baseCurrency);

        _clientMock.Verify(c => c.GetRatesAsync(tradingDate, baseCurrency, It.Is<string[]>(targets => targets.SequenceEqual(new[] { "BYN" })), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(omittedDate, It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_Range_WhenTodayHasPartialTemporaryCoverage_FillsMissingTargetFromLatestActual()
    {
        var today = _clock.UtcNow.Date;
        var priorDate = today.AddDays(-1);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>
        {
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = priorDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "BYN", Rate = 3.1m, Created = priorDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = today, IsTemporary = true }
        };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _exchangeRateRepoMock.Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()))
            .Callback<ExchangeRate, CancellationToken>((rate, _) => rates.Add(rate))
            .ReturnsAsync((Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ExchangeRate>)null!);

        var sut = CreateSut();

        await sut.Get(1, today, today, baseCurrency);

        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == today && e.ToCode == "BYN" && e.Rate == 3.1m && e.IsTemporary), It.IsAny<CancellationToken>()), Times.Once);
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_Range_WhenTodayMissingTargetHasOlderPriorRate_FillsFromLatestPriorRatePerTarget()
    {
        var today = _clock.UtcNow.Date;
        var yesterday = today.AddDays(-1);
        var olderDate = today.AddDays(-3);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>
        {
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = yesterday, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "BYN", Rate = 3.1m, Created = olderDate, IsTemporary = false },
            new() { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = today, IsTemporary = true }
        };

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() => rates.AsAsyncQueryable());
        _exchangeRateRepoMock.Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()))
            .Callback<ExchangeRate, CancellationToken>((rate, _) => rates.Add(rate))
            .ReturnsAsync((Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ExchangeRate>)null!);

        var sut = CreateSut();

        await sut.Get(1, today, today, baseCurrency);

        _exchangeRateRepoMock.Verify(r => r.CreateAsync(It.Is<ExchangeRate>(e => e.Created == today && e.ToCode == "BYN" && e.Rate == 3.1m && e.IsTemporary), It.IsAny<CancellationToken>()), Times.Once);
        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
        _clientMock.Verify(c => c.GetRatesAsync(It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Get_ConcurrentCalls_ForSameMissingRange_RechecksCacheBeforeProviderCalls()
    {
        var requestedDate = new DateTime(2026, 5, 2);
        var baseCurrency = "USD";
        var rates = new List<ExchangeRate>();
        var ratesGate = new object();

        _userRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<AppUser, object>>>()))
            .Returns(AppUsersFor(1, baseCurrency));
        _accountRepoMock.Setup(r => r.Get(true, null, It.IsAny<Expression<Func<Account, object>>>()))
            .Returns(AccountsFor(1, "EUR", "BYN"));
        _exchangeRateRepoMock.Setup(r => r.Get(It.IsAny<bool>(), null))
            .Returns(() =>
            {
                lock (ratesGate)
                {
                    return rates.ToList().AsAsyncQueryable();
                }
            });
        _exchangeRateRepoMock.Setup(r => r.CreateAsync(It.IsAny<ExchangeRate>(), It.IsAny<CancellationToken>()))
            .Callback<ExchangeRate, CancellationToken>((rate, _) =>
            {
                lock (ratesGate)
                {
                    rates.Add(rate);
                }
            })
            .ReturnsAsync((Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ExchangeRate>)null!);
        _fallbackClientMock.Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(50);
                return new Dictionary<DateTime, ExchangeRateResponse>
                {
                    [requestedDate] = new()
                    {
                        Data = new Dictionary<string, ExchangeDateData>
                        {
                            ["EUR"] = new() { Code = "EUR", Value = 0.9m }
                        }
                    }
                };
            });
        _clientMock.Setup(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateResponse
            {
                Data = new Dictionary<string, ExchangeDateData>
                {
                    ["BYN"] = new() { Code = "BYN", Value = 3.1m }
                }
            });

        var sut = CreateSut();

        await Task.WhenAll(
            sut.Get(1, requestedDate, requestedDate, baseCurrency),
            sut.Get(1, requestedDate, requestedDate, baseCurrency),
            sut.Get(1, requestedDate, requestedDate, baseCurrency));

        _fallbackClientMock.Verify(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        _clientMock.Verify(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        var requestedDateRates = rates
            .Where(rate => rate.Created == requestedDate && rate.FromCode == baseCurrency)
            .ToList();
        Assert.Equal(new[] { "BYN", "EUR" }, requestedDateRates.Select(rate => rate.ToCode).OrderBy(code => code));
        Assert.All(requestedDateRates, rate => Assert.False(rate.IsTemporary));
        Assert.Equal(requestedDateRates.Count, requestedDateRates.Select(rate => rate.ToCode).Distinct().Count());
    }

    [Fact]
    public async Task Get_WithRealUnitOfWork_WhenPastTemporaryRowsArePromoted_SecondCallDoesNotRetryProvider()
    {
        var priorDate = new DateTime(2026, 5, 1);
        var requestedDate = new DateTime(2026, 5, 3);
        var baseCurrency = "USD";
        var databaseName = Guid.NewGuid().ToString();
        await using (var seedDb = CreateContext(databaseName))
        {
            await SeedExchangeRateContext(seedDb, baseCurrency, priorDate, requestedDate);
        }

        var fallbackClient = new Mock<IExchangeRateClient>();
        var currencyApiClient = new Mock<IExchangeRateClient>();
        var nbrbClient = new Mock<INbrbApiClient>();

        fallbackClient
            .Setup(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<DateTime, ExchangeRateResponse>());
        currencyApiClient
            .Setup(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ExchangeRateResponse?)null);

        await using (var firstCallDb = CreateContext(databaseName))
        {
            var sut = new ExchangeRateService(
                new InExUnitOfWork(firstCallDb),
                currencyApiClient.Object,
                fallbackClient.Object,
                nbrbClient.Object,
                NullLogger<ExchangeRateService>.Instance,
                _clock,
                SharedSynchronizationLock.Instance);
            await sut.Get(1, requestedDate, requestedDate, baseCurrency);
        }

        await using (var secondCallDb = CreateContext(databaseName))
        {
            var sut = new ExchangeRateService(
                new InExUnitOfWork(secondCallDb),
                currencyApiClient.Object,
                fallbackClient.Object,
                nbrbClient.Object,
                NullLogger<ExchangeRateService>.Instance,
                _clock,
                SharedSynchronizationLock.Instance);
            await sut.Get(1, requestedDate, requestedDate, baseCurrency);
        }

        await using var assertionDb = CreateContext(databaseName);
        var promotedRate = await assertionDb.ExchangeRates.AsNoTracking().SingleAsync(rate => rate.Created == requestedDate && rate.FromCode == baseCurrency && rate.ToCode == "EUR");
        Assert.Equal(0.9m, promotedRate.Rate);
        Assert.False(promotedRate.IsTemporary);
        fallbackClient.Verify(c => c.GetRatesForRangeAsync(requestedDate, requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
        currencyApiClient.Verify(c => c.GetRatesAsync(requestedDate, baseCurrency, It.IsAny<string[]>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    private static IEnumerable<DateTime> EnumerateDatesForTest(DateTime start, DateTime end)
    {
        for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    private static InExDbContext CreateContext() =>
        CreateContext(Guid.NewGuid().ToString());

    private static InExDbContext CreateContext(string databaseName) =>
        new(new DbContextOptionsBuilder<InExDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options);

    private static async Task SeedExchangeRateContext(InExDbContext db, string baseCurrency, DateTime priorDate, DateTime requestedDate)
    {
        var usd = new Currency { Id = 1, Key = baseCurrency, Name = baseCurrency, Created = DateTime.UtcNow, Updated = DateTime.UtcNow };
        var eur = new Currency { Id = 2, Key = "EUR", Name = "EUR", Created = DateTime.UtcNow, Updated = DateTime.UtcNow };
        var user = new AppUser { Id = 1, UserName = "exchange-test", CurrencyId = usd.Id, Currency = usd };
        var account = new Account { Id = 1, UserId = user.Id, User = user, CurrencyId = eur.Id, Currency = eur, IsEnabled = true, Key = "eur", Name = "EUR" };

        db.Currencies.AddRange(usd, eur);
        db.Users.Add(user);
        db.Accounts.Add(account);
        db.ExchangeRates.AddRange(
            new ExchangeRate { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.9m, Created = priorDate, IsTemporary = false, CreatedBy = user.Id },
            new ExchangeRate { FromCode = baseCurrency, ToCode = "EUR", Rate = 0.8m, Created = requestedDate, IsTemporary = true, CreatedBy = user.Id });
        await db.SaveChangesAsync();
    }
}
