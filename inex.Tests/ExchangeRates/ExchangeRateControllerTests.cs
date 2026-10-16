using System.Net.Http.Json;
using inex.Services.Services.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.ExchangeRate;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection.Extensions;
using inex.Data;
using inex.Data.Models;
using inex.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Tests.ExchangeRates;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class ExchangeRateControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public ExchangeRateControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetDateRates_AnonymousRequest_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/exchange/rates/2026-05-01");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Synchronize_AnonymousRequest_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/exchange/rates/synchronize", new
        {
            startDate = "2026-08-01",
            endDate = "2026-08-01"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Synchronize_InvalidDateRange_ReturnsValidationProblemDetails()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PostAsJsonAsync("/api/exchange/rates/synchronize", new
        {
            startDate = "2026-08-02",
            endDate = "2026-08-01"
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("/errors/validation-failed", body.GetProperty("type").GetString());
        Assert.Contains("date_range.invalid_order", body.GetProperty("errors").EnumerateArray().Select(error => error.GetString()));
    }

    [Fact]
    public async Task Synchronize_AuthenticatedUserWithoutEnabledAccounts_ReturnsNoContent()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var response = await client.PostAsJsonAsync("/api/exchange/rates/synchronize", new
        {
            startDate = today,
            endDate = today
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Synchronize_TodayWithoutPriorActualRate_ReturnsStableProblemCode()
    {
        string email = $"{Guid.NewGuid()}@example.com";
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: email,
            username: $"user-{Guid.NewGuid():N}");
        await SeedEnabledEuroAccountAsync(email);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var response = await client.PostAsJsonAsync("/api/exchange/rates/synchronize", new
        {
            startDate = today,
            endDate = today
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("/errors/domain-rule", body.GetProperty("type").GetString());
        Assert.Equal("temporary_rate.source_missing", body.GetProperty("rule").GetString());
    }

    [Fact]
    public async Task GetDateRates_AuthenticatedRequest_ReturnsCachedRates()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");
        var rateDate = new DateTime(2026, 5, 1);
        await SeedCurrencyAndRateAsync(rateDate);

        var response = await client.GetAsync("/api/exchange/rates/2026-05-01");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var rates = body.GetProperty("data").EnumerateArray().ToList();
        var eurRate = Assert.Single(rates, rate => rate.GetProperty("currencyTo").GetString() == "EUR");
        Assert.Equal("USD", eurRate.GetProperty("currencyFrom").GetString());
        Assert.Equal(0.92m, eurRate.GetProperty("rate").GetDecimal());
        Assert.False(eurRate.GetProperty("isTemporary").GetBoolean());
        Assert.Equal(rateDate, eurRate.GetProperty("date").GetDateTime().Date);
    }

    [Fact]
    public async Task GetRange_AnonymousRequest_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/exchange/rates/range?startDate=2026-05-01&endDate=2026-05-02");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?startDate=2026-05-01")]
    [InlineData("?endDate=2026-05-02")]
    public async Task GetRange_MissingDates_ReturnsValidationProblemDetails(string query)
    {
        var client = await _factory.CreateAuthenticatedClientAsync($"{Guid.NewGuid()}@example.com", $"user-{Guid.NewGuid():N}");
        var response = await client.GetAsync($"/api/exchange/rates/range{query}");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.TryGetProperty("errors", out _));
    }

    [Fact]
    public async Task GetRange_ReversedDates_ReturnsValidationProblemDetails()
    {
        var client = await _factory.CreateAuthenticatedClientAsync($"{Guid.NewGuid()}@example.com", $"user-{Guid.NewGuid():N}");
        var response = await client.GetAsync("/api/exchange/rates/range?startDate=2026-05-02&endDate=2026-05-01");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("/errors/validation-failed", body.GetProperty("type").GetString());
    }

    [Fact]
    public async Task GetRange_UsesPrincipalAndRangeServiceIncludingLongFutureRange()
    {
        string email = $"{Guid.NewGuid()}@example.com";
        var authenticated = await _factory.CreateAuthenticatedClientAsync(email, $"user-{Guid.NewGuid():N}");
        using var scope = _factory.Services.CreateScope();
        int userId = scope.ServiceProvider.GetRequiredService<InExDbContext>().Set<AppUser>().Single(user => user.Email == email).Id;
        var service = new RangeServiceStub();
        var start = new DateTime(2026, 1, 1);
        var end = DateTime.UtcNow.Date.AddMonths(1);

        using var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.Replace(ServiceDescriptor.Singleton<IExchangeRateService>(service))));
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = authenticated.DefaultRequestHeaders.Authorization;

        var response = await client.GetAsync($"/api/exchange/rates/range?startDate={start:yyyy-MM-dd}&endDate={end:yyyy-MM-dd}&linkedUserId=999&userId=999");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Empty(body.GetProperty("data").EnumerateArray());
        Assert.Equal((userId, start, end), service.Request);
        Assert.Equal((userId, start, end), service.CachedRequest);
        Assert.True(service.Token.CanBeCanceled);
    }

    [Fact]
    public async Task GetRange_ExcludesExpiredTemporaryRatesWithoutEnabledCurrencyAccounts()
    {
        var client = await _factory.CreateAuthenticatedClientAsync($"{Guid.NewGuid()}@example.com", $"user-{Guid.NewGuid():N}");
        var date = new DateTime(2025, 3, 15);
        await SeedCurrencyAndRateAsync(date);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            db.Set<ExchangeRate>().Single(rate => rate.Created == date && rate.ToCode == "EUR").IsTemporary = true;
            await db.SaveChangesAsync();
        }

        var response = await client.GetAsync("/api/exchange/rates/range?startDate=2025-03-15&endDate=2025-03-15");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Empty(body.GetProperty("data").EnumerateArray());
    }

    private sealed class RangeServiceStub : IExchangeRateService
    {
        public (int UserId, DateTime Start, DateTime End)? Request { get; private set; }
        public CancellationToken Token { get; private set; }
        public (int UserId, DateTime Start, DateTime End)? CachedRequest { get; private set; }

        public Task<ListResponse<ExchangeRateResponse>> Get(int userId, DateTime start, DateTime end, string baseCurrency = "", CancellationToken ct = default)
        {
            Request = (userId, start, end);
            Token = ct;
            return Task.FromResult(new ListResponse<ExchangeRateResponse>());
        }

        public Task<ListResponse<ExchangeRateResponse>> Get(int userId, DateTime date, string baseCurrency = "", CancellationToken ct = default)
            => throw new InvalidOperationException("Single-date retrieval must not be used for ranges.");

        public Task<ListResponse<ExchangeRateResponse>> GetCached(int userId, DateTime start, DateTime end, string baseCurrency = "", CancellationToken ct = default)
        {
            Assert.Equal((userId, start, end), Request);
            Assert.Equal(ct, Token);
            CachedRequest = (userId, start, end);
            return Task.FromResult(new ListResponse<ExchangeRateResponse>());
        }
    }

    private async Task SeedCurrencyAndRateAsync(DateTime rateDate)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();

        if (!db.Set<Currency>().Any(currency => currency.Key == "EUR"))
        {
            db.Set<Currency>().Add(new Currency
            {
                Key = "EUR",
                Name = "Euro",
                Created = DateTime.UtcNow,
                Updated = DateTime.UtcNow,
            });
        }

        if (!db.Set<ExchangeRate>().Any(rate =>
                rate.Created == rateDate &&
                rate.FromCode == "USD" &&
                rate.ToCode == "EUR"))
        {
            db.Set<ExchangeRate>().Add(new ExchangeRate
            {
                FromCode = "USD",
                ToCode = "EUR",
                Rate = 0.92m,
                IsTemporary = false,
                Created = rateDate,
                Updated = rateDate,
            });
        }

        await db.SaveChangesAsync();
    }

    private async Task SeedEnabledEuroAccountAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        Currency? euro = db.Set<Currency>().SingleOrDefault(currency => currency.Key == "EUR");
        if (euro is null)
        {
            euro = new Currency
            {
                Key = "EUR",
                Name = "Euro",
                Created = DateTime.UtcNow,
                Updated = DateTime.UtcNow,
            };
            db.Set<Currency>().Add(euro);
        }

        AppUser user = db.Set<AppUser>().Single(user => user.Email == email);
        db.Set<Account>().Add(new Account
        {
            Key = "synchronization-eur",
            Name = "Synchronization EUR",
            UserId = user.Id,
            Currency = euro,
            IsEnabled = true,
            Created = DateTime.UtcNow,
            Updated = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();
    }
}
