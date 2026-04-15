using System.Net.Http.Json;
using inex.Tests.Infrastructure;
using static inex.Tests.Infrastructure.InExWebApplicationFactory;

namespace inex.Tests.Validation;

/// <summary>
/// Verifies that FluentValidation rejects invalid request bodies with 422 Unprocessable Entity
/// and returns RFC 7807 Problem Details with type "/errors/validation-failed".
/// </summary>
[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class ValidationTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public ValidationTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<HttpClient> AuthenticatedClient() =>
        await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task AssertValidationError(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("/errors/validation-failed", body.GetProperty("type").GetString());
        Assert.Equal(422, body.GetProperty("status").GetInt32());
    }

    // ── Transactions ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Transaction_ZeroAmount_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId  = 1,
            categoryId = 1,
            created    = "2026-01-01",
            amount     = 0,
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Transaction_ZeroAccountId_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId  = 0,
            categoryId = 1,
            created    = "2026-01-01",
            amount     = 100,
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Transaction_ZeroCategoryId_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId  = 1,
            categoryId = 0,
            created    = "2026-01-01",
            amount     = 100,
        });
        await AssertValidationError(response);
    }

    // ── Transfers ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Transfer_SameAccounts_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/transactions/transfer", new
        {
            accountFromId = 1,
            accountToId   = 1,
            amountFrom    = 100,
            amountTo      = 100,
            created       = "2026-01-01",
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Transfer_ZeroAmountFrom_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/transactions/transfer", new
        {
            accountFromId = 1,
            accountToId   = 2,
            amountFrom    = 0,
            amountTo      = 100,
            created       = "2026-01-01",
        });
        await AssertValidationError(response);
    }

    // ── Accounts ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Account_EmptyName_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "ACC",
            name       = "",
            currencyId = 1,
            isEnabled  = true,
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Account_ZeroCurrencyId_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "ACC",
            name       = "My Account",
            currencyId = 0,
            isEnabled  = true,
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Account_EmptyKey_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "",
            name       = "My Account",
            currencyId = 1,
            isEnabled  = true,
        });
        await AssertValidationError(response);
    }

    // ── Budgets ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Budget_InvalidMonth_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/budgets", new
        {
            key   = "BDG",
            value = 500,
            year  = 2026,
            month = 13,
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Budget_NegativeValue_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/budgets", new
        {
            key   = "BDG",
            value = -1,
            year  = 2026,
            month = 6,
        });
        await AssertValidationError(response);
    }

    // ── Categories ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Category_EmptyKey_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key       = "",
            name      = "Food",
            isEnabled = true,
            isSystem  = false,
        });
        await AssertValidationError(response);
    }

    [Fact]
    public async Task Category_EmptyName_Returns422()
    {
        var client = await AuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key       = "FOOD",
            name      = "",
            isEnabled = true,
            isSystem  = false,
        });
        await AssertValidationError(response);
    }
}
