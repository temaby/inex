using System.Net.Http.Json;
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
}
