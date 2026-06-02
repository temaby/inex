using System.Net.Http.Json;
using inex.Tests.Infrastructure;

namespace inex.Tests.Reports;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class ReportsControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public ReportsControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SpendingHeatmap_AnonymousRequest_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/reports/spending-heatmap?start=2026-05-01&end=2026-05-02");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SpendingHeatmap_AuthenticatedRequest_ReturnsDailySpendRows()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "heatmap-account");
        int categoryId = await CreateCategoryAsync(client, "heatmap-category");
        await CreateTransactionAsync(client, accountId, categoryId, new DateTime(2026, 5, 2), -42m);

        var response = await client.GetAsync("/api/reports/spending-heatmap?start=2026-05-01&end=2026-05-03");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("USD", body.GetProperty("metadata").GetProperty("currency").GetString());

        var rows = body.GetProperty("data").EnumerateArray().ToList();
        Assert.Equal(3, rows.Count);
        Assert.Equal(0m, rows[0].GetProperty("totalSpend").GetDecimal());
        Assert.Equal(42m, rows[1].GetProperty("totalSpend").GetDecimal());
        Assert.Equal(0m, rows[2].GetProperty("totalSpend").GetDecimal());
        Assert.All(rows, row => Assert.Equal("USD", row.GetProperty("currency").GetString()));
    }

    [Fact]
    public async Task NetWorth_AnonymousRequest_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/reports/net-worth?months=12");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(61)]
    public async Task NetWorth_InvalidMonths_ReturnsValidationProblem(int months)
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync($"/api/reports/net-worth?months={months}");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(422, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("months", out _) || errors.TryGetProperty("Months", out _));
    }

    [Fact]
    public async Task NetWorth_AuthenticatedRequest_ReturnsMonthlyRows()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "net-worth-account");
        int categoryId = await CreateCategoryAsync(client, "net-worth-category");
        await CreateTransactionAsync(client, accountId, categoryId, DateTime.UtcNow.Date.AddDays(-2), 250m);

        var response = await client.GetAsync("/api/reports/net-worth?months=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var rows = body.GetProperty("data").EnumerateArray().ToList();

        Assert.Single(rows);
        Assert.Equal("USD", rows[0].GetProperty("currency").GetString());
        Assert.Equal(250m, rows[0].GetProperty("netWorth").GetDecimal());
        Assert.Matches(@"^\d{4}-\d{2}$", rows[0].GetProperty("month").GetString());
    }

    private Task<HttpClient> CreateAuthenticatedClientAsync() =>
        _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task<int> CreateAccountAsync(HttpClient client, string key)
    {
        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key,
            name = key,
            currencyId = 1,
            isEnabled = true,
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private static async Task<int> CreateCategoryAsync(HttpClient client, string key)
    {
        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key,
            name = key,
            isEnabled = true,
            isSystem = false,
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private static async Task CreateTransactionAsync(HttpClient client, int accountId, int categoryId, DateTime created, decimal amount)
    {
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created,
            amount,
            comment = "heatmap expense",
        });
        response.EnsureSuccessStatusCode();
    }
}
