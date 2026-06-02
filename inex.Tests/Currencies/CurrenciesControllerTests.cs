using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Tests.Currencies;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class CurrenciesControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public CurrenciesControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_AnonymousRequest_Returns200WithCurrencies()
    {
        await SeedCurrencyAsync("EUR", "Euro");
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/currencies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var currencies = body.EnumerateArray().ToList();
        Assert.Contains(currencies, currency =>
            currency.GetProperty("key").GetString() == "EUR" &&
            currency.GetProperty("name").GetString() == "Euro");
    }

    private async Task SeedCurrencyAsync(string key, string name)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        if (db.Set<Currency>().Any(currency => currency.Key == key))
        {
            return;
        }

        db.Set<Currency>().Add(new Currency
        {
            Key = key,
            Name = name,
            Created = DateTime.UtcNow,
            Updated = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
