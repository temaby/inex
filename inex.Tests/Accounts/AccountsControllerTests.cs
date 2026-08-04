using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Tests.Accounts;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class AccountsControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public AccountsControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── GET /api/accounts ────────────────────────────────────────────────────

    [Fact]
    public async Task List_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/accounts?mode=ALL");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task List_Authenticated_Returns200()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.GetAsync("/api/accounts?mode=ALL");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task DetailsForList_ForeignTransactionOnOwnedAccount_DoesNotAffectBalance()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(userA, "balance-owner-account");
        int inactiveAccountId = await CreateAccountAsync(userA, "balance-inactive-account", isEnabled: false);
        int foreignCategoryId = await CreateCategoryAsync(userB, "balance-foreign-category");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            var ownedAccount = await db.Accounts.SingleAsync(account => account.Id == accountId);
            var foreignCategory = await db.Categories.SingleAsync(category => category.Id == foreignCategoryId);
            var now = DateTime.UtcNow;

            db.Transactions.Add(new Transaction
            {
                AccountId = ownedAccount.Id,
                CategoryId = foreignCategory.Id,
                UserId = foreignCategory.UserId,
                Value = 125m,
                Created = now,
                Updated = now,
                CreatedBy = foreignCategory.UserId,
                UpdatedBy = foreignCategory.UserId,
            });
            await db.SaveChangesAsync();
        }

        var response = await userA.GetAsync($"/api/accounts/details?mode=active&ids[0]={accountId}&ids[1]={inactiveAccountId}");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var summary = Assert.Single(body.GetProperty("data").EnumerateArray());
        Assert.Equal(accountId, summary.GetProperty("id").GetInt32());
        Assert.Equal(0m, summary.GetProperty("value").GetDecimal());
        Assert.Equal(0m, summary.GetProperty("thisMonthNet").GetDecimal());
    }

    // ── POST /api/accounts ────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidAccount_Returns200WithId()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key         = "savings",
            name        = "Savings",
            description = "My savings account",
            currencyId  = 1,
            isEnabled   = true,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("id").GetInt32() > 0);
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "savings",
            name       = "Savings",
            currencyId = 1,
            isEnabled  = true,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/accounts/{id} ────────────────────────────────────────────────

    [Fact]
    public async Task Single_OtherUsersAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateAccountAsync(userB, "other-get");

        var response = await userA.GetAsync($"/api/accounts/{id}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Update_ExistingAccount_Returns200WithUpdatedName()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        // Create
        var createResponse = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "original",
            name       = "Original",
            currencyId = 1,
            isEnabled  = true,
        });
        createResponse.EnsureSuccessStatusCode();
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int id = createBody.GetProperty("id").GetInt32();

        // Update
        var updateResponse = await client.PutAsJsonAsync($"/api/accounts/{id}", new
        {
            id,
            key        = "original",
            name       = "Renamed",
            currencyId = 1,
            isEnabled  = true,
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var body = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed", body.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Update_OtherUsersAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateAccountAsync(userB, "other-put");

        var response = await userA.PutAsJsonAsync($"/api/accounts/{id}", new
        {
            id,
            key        = "other-put",
            name       = "Attempted Rename",
            currencyId = 1,
            isEnabled  = true,
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    // ── DELETE /api/accounts/{id} ─────────────────────────────────────────────

    [Fact]
    public async Task Delete_ExistingAccount_Returns200()
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

        var createResponse = await client.PostAsJsonAsync("/api/accounts", new
        {
            key        = "to-delete",
            name       = "ToDelete",
            currencyId = 1,
            isEnabled  = true,
        });
        createResponse.EnsureSuccessStatusCode();
        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int id = body.GetProperty("id").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/accounts/{id}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_OtherUsersAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int id = await CreateAccountAsync(userB, "other-delete");

        var response = await userA.DeleteAsync($"/api/accounts/{id}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Delete_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync("/api/accounts/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private Task<HttpClient> CreateAuthenticatedClientAsync() =>
        _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task<int> CreateAccountAsync(HttpClient client, string key, bool isEnabled = true)
    {
        var createResponse = await client.PostAsJsonAsync("/api/accounts", new
        {
            key,
            name       = key,
            currencyId = 1,
            isEnabled,
        });
        createResponse.EnsureSuccessStatusCode();

        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
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
}
