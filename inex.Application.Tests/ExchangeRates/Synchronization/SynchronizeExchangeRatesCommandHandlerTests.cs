using inex.Application.ExchangeRates.Synchronization;
using inex.Application.ExchangeRates.Synchronization.Interfaces;
using inex.Application.ExchangeRates.Synchronization.Models;
using inex.Application.ExchangeRates.Synchronization.Exceptions;
using inex.Domain.ExchangeRates;
using Moq;
using Xunit;

public sealed class SynchronizeExchangeRatesCommandHandlerTests
{
    [Fact]
    public async Task HandleAsync_WhenStartDateIsAfterEndDate_ThrowsValidationException()
    {
        var fixture = new HandlerFixture();
        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));

        var command = new SynchronizeExchangeRatesCommand(
            UserId: 1,
            StartDate: new DateOnly(2026, 8, 5),
            EndDate: new DateOnly(2026, 8, 4));

        var exception = await Assert.ThrowsAsync<SynchronizationValidationException>(
            () => handler.HandleAsync(command, CancellationToken.None));

        Assert.Equal("date_range.invalid_order", exception.Code);
    }

    [Fact]
    public async Task HandleAsync_WhenStartDateIsBeforeFirstSupportedDate_ThrowsValidationException()
    {
        var fixture = new HandlerFixture();
        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));

        var command = new SynchronizeExchangeRatesCommand(
            UserId: 1,
            StartDate: new DateOnly(2009, 12, 31),
            EndDate: new DateOnly(2026, 8, 4));

        var exception = await Assert.ThrowsAsync<SynchronizationValidationException>(
            () => handler.HandleAsync(command, CancellationToken.None));

        Assert.Equal("date_range.before_first_supported", exception.Code);
    }

    [Fact]
    public async Task HandleAsync_WhenEndDateIsInFuture_ThrowsValidationException()
    {
        var fixture = new HandlerFixture();
        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));

        var command = new SynchronizeExchangeRatesCommand(
            UserId: 1,
            StartDate: new DateOnly(2026, 8, 5),
            EndDate: new DateOnly(2026, 8, 7));

        var exception = await Assert.ThrowsAsync<SynchronizationValidationException>(
            () => handler.HandleAsync(command, CancellationToken.None));

        Assert.Equal("date_range.in_future", exception.Code);
    }

    [Fact]
    public async Task HandleAsync_WhenIntervalExceedsMaximum_ThrowsValidationException()
    {
        var fixture = new HandlerFixture();
        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));

        var command = new SynchronizeExchangeRatesCommand(
            UserId: 1,
            StartDate: new DateOnly(2026, 7, 1),
            EndDate: new DateOnly(2026, 8, 5));

        var exception = await Assert.ThrowsAsync<SynchronizationValidationException>(
            () => handler.HandleAsync(command, CancellationToken.None));

        Assert.Equal("date_range.too_long", exception.Code);
    }

    [Fact]
    public async Task HandleAsync_WhenAllHistoricalRatesAreCached_DoesNotCallProvider()
    {
        var fixture = new HandlerFixture();
        fixture.ScopeReader.Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", new[] { "EUR" }));

        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "EUR" })),
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[]
                {
                    new DateOnly(2026, 8, 1),
                    new DateOnly(2026, 8, 2)
                })),
                CancellationToken.None))
            .ReturnsAsync(new[]
            {
                ExchangeRate.Create(1, "USD", "EUR", new DateOnly(2026, 8, 1), 0.92m, false),
                ExchangeRate.Create(2, "USD", "EUR", new DateOnly(2026, 8, 2), 0.93m, false)
            });

        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));

        var command = new SynchronizeExchangeRatesCommand(
            UserId: 1,
            StartDate: new DateOnly(2026, 8, 1),
            EndDate: new DateOnly(2026, 8, 2));

        await handler.HandleAsync(command, CancellationToken.None);

        fixture.Provider.Verify(
            x => x.GetHistoricalRatesAsync(
                It.IsAny<IReadOnlyCollection<DateOnly>>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);

        fixture.Repository.Verify(
            x => x.UpsertRangeAsync(
                It.IsAny<IReadOnlyCollection<ExchangeRate>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenPartialHistoricalRatesAreCached_DoesSynchronizeMissingRates()
    {
        var date = new DateOnly(2026, 8, 1);
        var fixture = new HandlerFixture();

        fixture.ScopeReader
            .Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", new[] { "EUR", "PLN" }));

        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "EUR", "PLN" })),
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[] { date })), CancellationToken.None))
            .ReturnsAsync(new[]
            {
                ExchangeRate.Create(1, "USD", "EUR", date, 0.92m, false),
            });

        fixture.Provider
            .Setup(x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[] { date })),
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "PLN" })),
                CancellationToken.None))
            .ReturnsAsync(new[]
            {
                new ExchangeRateQuote("USD", "PLN", date, 4.5m),
            });

        fixture.Repository
            .Setup(x => x.UpsertRangeAsync(
                It.Is<IReadOnlyCollection<ExchangeRate>>(rates =>
                    rates.Count == 1 &&
                    rates.Single().BaseCurrencyCode == "USD" &&
                    rates.Single().QuoteCurrencyCode == "PLN" &&
                    rates.Single().Date == date &&
                    rates.Single().Rate == 4.5m &&
                    rates.Single().IsTemporary == false),
                CancellationToken.None))
            .Returns(Task.CompletedTask);

        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));
        await handler.HandleAsync(new SynchronizeExchangeRatesCommand(UserId: 1, StartDate: date, EndDate: date), CancellationToken.None);

        fixture.Provider.Verify(
            x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[] { date })),
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "PLN" })),
                CancellationToken.None
            ),
            Times.Once);

        fixture.Repository.Verify(
            x => x.UpsertRangeAsync(
                It.Is<IReadOnlyCollection<ExchangeRate>>(rates =>
                    rates.Count == 1 &&
                    rates.Single().BaseCurrencyCode == "USD" &&
                    rates.Single().QuoteCurrencyCode == "PLN" &&
                    rates.Single().Date == date &&
                    rates.Single().Rate == 4.5m &&
                    rates.Single().IsTemporary == false),
                CancellationToken.None),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WhenHistoricalRatesAreIncomplete_ThrowsProviderResponseException()
    {
        var date = new DateOnly(2026, 8, 1);
        var fixture = new HandlerFixture();

        fixture.ScopeReader
            .Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", new[] { "EUR", "PLN" }));

        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "EUR", "PLN" })),
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[] { date })), CancellationToken.None))
            .ReturnsAsync(new[]
            {
                ExchangeRate.Create(1, "USD", "EUR", date, 0.92m, false),
            });

        fixture.Provider
            .Setup(x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[] { date })),
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "PLN" })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRateQuote>());

        fixture.Repository
            .Setup(x => x.GetLatestActualBeforeAsync(
                date,
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "PLN" })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRate>());

        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));
        var exception = await Assert.ThrowsAsync<SynchronizationProviderResponseException>(() =>
            handler.HandleAsync(new SynchronizeExchangeRatesCommand(UserId: 1, StartDate: date, EndDate: date), CancellationToken.None));

        Assert.Equal("provider_response.incomplete", exception.Code);

        fixture.Provider.Verify(
            x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(x => x.SequenceEqual(new[] { date })),
                "USD",
                It.Is<IReadOnlyCollection<string>>(x => x.SequenceEqual(new[] { "PLN" })),
                CancellationToken.None
            ),
            Times.Once);

        fixture.Repository.Verify(
            x => x.UpsertRangeAsync(
                It.IsAny<IReadOnlyCollection<ExchangeRate>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenIntervalIsEqualToMaximum_CompletesSuccessfully()
    {
        var fixture = new HandlerFixture();
        fixture.ScopeReader.Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", Array.Empty<string>()));

        var handler = fixture.CreateHandler(new DateOnly(2026, 8, 6));

        var command = new SynchronizeExchangeRatesCommand(
            UserId: 1,
            StartDate: new DateOnly(2026, 7, 1),
            EndDate: new DateOnly(2026, 7, 31));

        await handler.HandleAsync(command, CancellationToken.None);
    }

    [Fact]
    public async Task HandleAsync_WhenTodayHasNoPriorActualRate_ThrowsTemporaryRateSourceException()
    {
        var today = new DateOnly(2026, 8, 6);
        var fixture = new HandlerFixture();
        fixture.ScopeReader
            .Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", ["EUR"]));
        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.Is<IReadOnlyCollection<string>>(currencies => currencies.SequenceEqual(new[] { "EUR" })),
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { today })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRate>());
        fixture.Repository
            .Setup(x => x.GetLatestActualBeforeAsync(
                today,
                "USD",
                It.Is<IReadOnlyCollection<string>>(currencies => currencies.SequenceEqual(new[] { "EUR" })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRate>());

        var exception = await Assert.ThrowsAsync<TemporaryRateSourceException>(() =>
            fixture.CreateHandler(today).HandleAsync(
                new SynchronizeExchangeRatesCommand(1, today, today),
                CancellationToken.None));

        Assert.Equal("temporary_rate.source_missing", exception.Code);
    }

    [Fact]
    public async Task HandleAsync_WhenProviderOmitsWeekend_CarriesForwardThePriorActualRate()
    {
        var friday = new DateOnly(2026, 8, 7);
        var saturday = friday.AddDays(1);
        var fixture = new HandlerFixture();
        fixture.ScopeReader
            .Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", new[] { "EUR" }));
        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.IsAny<IReadOnlyCollection<string>>(),
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { friday, saturday })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRate>());
        fixture.Provider
            .Setup(x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { friday, saturday })),
                "USD",
                It.IsAny<IReadOnlyCollection<string>>(),
                CancellationToken.None))
            .ReturnsAsync(new[] { new ExchangeRateQuote("USD", "EUR", friday, 0.92m) });
        fixture.Repository
            .Setup(x => x.UpsertRangeAsync(
                It.Is<IReadOnlyCollection<ExchangeRate>>(rates =>
                    rates.Count == 2
                    && rates.Any(rate => rate.Date == friday && rate.Rate == 0.92m && !rate.IsTemporary)
                    && rates.Any(rate => rate.Date == saturday && rate.Rate == 0.92m && !rate.IsTemporary)),
                CancellationToken.None))
            .Returns(Task.CompletedTask);

        await fixture.CreateHandler(new DateOnly(2026, 8, 10)).HandleAsync(
            new SynchronizeExchangeRatesCommand(1, friday, saturday),
            CancellationToken.None);

        fixture.Repository.Verify(
            x => x.GetLatestActualBeforeAsync(
                It.IsAny<DateOnly>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenProviderReturnsNoQuote_CarriesForwardCachedPriorActualRate()
    {
        var friday = new DateOnly(2026, 8, 7);
        var saturday = friday.AddDays(1);
        var fixture = new HandlerFixture();
        fixture.ScopeReader
            .Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", new[] { "EUR" }));
        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.IsAny<IReadOnlyCollection<string>>(),
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { saturday })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRate>());
        fixture.Provider
            .Setup(x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { saturday })),
                "USD",
                It.IsAny<IReadOnlyCollection<string>>(),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRateQuote>());
        fixture.Repository
            .Setup(x => x.GetLatestActualBeforeAsync(
                saturday,
                "USD",
                It.Is<IReadOnlyCollection<string>>(currencies => currencies.SequenceEqual(new[] { "EUR" })),
                CancellationToken.None))
            .ReturnsAsync(new[] { ExchangeRate.Create(1, "USD", "EUR", friday, 0.92m, false) });
        fixture.Repository
            .Setup(x => x.UpsertRangeAsync(
                It.Is<IReadOnlyCollection<ExchangeRate>>(rates =>
                    rates.Count == 1
                    && rates.Single().Date == saturday
                    && rates.Single().Rate == 0.92m
                    && !rates.Single().IsTemporary),
                CancellationToken.None))
            .Returns(Task.CompletedTask);

        await fixture.CreateHandler(new DateOnly(2026, 8, 10)).HandleAsync(
            new SynchronizeExchangeRatesCommand(1, saturday, saturday),
            CancellationToken.None);
    }

    [Fact]
    public async Task HandleAsync_WhenRangeIncludesYesterdayAndToday_CreatesActualAndTemporaryRatesTogether()
    {
        var today = new DateOnly(2026, 8, 6);
        var yesterday = today.AddDays(-1);
        var fixture = new HandlerFixture();
        fixture.ScopeReader
            .Setup(x => x.GetAsync(1, CancellationToken.None))
            .ReturnsAsync(new ExchangeRateUserScope("USD", new[] { "EUR" }));
        fixture.Repository
            .Setup(x => x.GetExistingAsync(
                "USD",
                It.IsAny<IReadOnlyCollection<string>>(),
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { yesterday, today })),
                CancellationToken.None))
            .ReturnsAsync(Array.Empty<ExchangeRate>());
        fixture.Provider
            .Setup(x => x.GetHistoricalRatesAsync(
                It.Is<IReadOnlyCollection<DateOnly>>(dates => dates.SequenceEqual(new[] { yesterday })),
                "USD",
                It.IsAny<IReadOnlyCollection<string>>(),
                CancellationToken.None))
            .ReturnsAsync(new[] { new ExchangeRateQuote("USD", "EUR", yesterday, 0.92m) });
        fixture.Repository
            .Setup(x => x.UpsertRangeAsync(
                It.Is<IReadOnlyCollection<ExchangeRate>>(rates =>
                    rates.Count == 2
                    && rates.Any(rate => rate.Date == yesterday && rate.Rate == 0.92m && !rate.IsTemporary)
                    && rates.Any(rate => rate.Date == today && rate.Rate == 0.92m && rate.IsTemporary)),
                CancellationToken.None))
            .Returns(Task.CompletedTask);

        await fixture.CreateHandler(today).HandleAsync(
            new SynchronizeExchangeRatesCommand(1, yesterday, today),
            CancellationToken.None);

        fixture.Repository.Verify(
            x => x.GetLatestActualBeforeAsync(
                It.IsAny<DateOnly>(),
                It.IsAny<string>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private sealed class HandlerFixture
    {
        public Mock<IHistoricalRateProvider> Provider { get; } = new(MockBehavior.Strict);
        public Mock<IExchangeRateUserScopeReader> ScopeReader { get; } = new(MockBehavior.Strict);
        public Mock<IExchangeRateRepository> Repository { get; } = new(MockBehavior.Strict);

        public SynchronizeExchangeRatesCommandHandler CreateHandler(DateOnly today)
        {
            return new SynchronizeExchangeRatesCommandHandler(
                Provider.Object,
                ScopeReader.Object,
                Repository.Object,
                new NoopSynchronizationLock(),
                timeProvider: new TestTimeProvider(today));
        }
    }

    private sealed class NoopSynchronizationLock : IExchangeRateSynchronizationLock
    {
        public Task<IDisposable> AcquireAsync(
            string baseCurrencyCode,
            IReadOnlyCollection<DateOnly> dates,
            CancellationToken cancellationToken) =>
            Task.FromResult<IDisposable>(new NoopReleaser());
    }

    private sealed class NoopReleaser : IDisposable
    {
        public void Dispose()
        {
        }
    }

    private sealed class TestTimeProvider : TimeProvider
    {
        private readonly DateOnly _today;

        public TestTimeProvider(DateOnly today)
        {
            _today = today;
        }

        public override DateTimeOffset GetUtcNow()
        {
            return new DateTimeOffset(_today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        }
    }
}
