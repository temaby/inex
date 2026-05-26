using System.Net.Http.Json;
using inex.Tests.Infrastructure;

namespace inex.Tests.Transactions;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class TransactionsControllerTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public TransactionsControllerTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Single_OwnerTransaction_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(client, "owner-get");

        var response = await client.GetAsync($"/api/transactions/{ids.TransactionId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Single_OtherUsersTransaction_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(userB, "other-get");

        var response = await userA.GetAsync($"/api/transactions/{ids.TransactionId}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Update_OwnerTransaction_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(client, "owner-put");

        var response = await client.PutAsJsonAsync($"/api/transactions/{ids.TransactionId}", new
        {
            id         = ids.TransactionId,
            accountId  = ids.AccountId,
            categoryId = ids.CategoryId,
            created    = DateTime.UtcNow,
            amount     = 25m,
            comment    = "updated #tag",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_OtherUsersTransaction_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(userB, "other-put");

        var response = await userA.PutAsJsonAsync($"/api/transactions/{ids.TransactionId}", new
        {
            id         = ids.TransactionId,
            accountId  = ids.AccountId,
            categoryId = ids.CategoryId,
            created    = DateTime.UtcNow,
            amount     = 25m,
            comment    = "attempted update",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Create_WithOtherUsersAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(userB, "other-create-account");
        int categoryId = await CreateCategoryAsync(userA, "own-create-category");

        var response = await userA.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = DateTime.UtcNow,
            amount  = 10m,
            comment = "attempted create",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Create_WithOtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(userA, "own-create-account");
        int categoryId = await CreateCategoryAsync(userB, "other-create-category");

        var response = await userA.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = DateTime.UtcNow,
            amount  = 10m,
            comment = "attempted create",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Update_WithOtherUsersAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(userA, "own-update-account");
        int otherAccountId = await CreateAccountAsync(userB, "other-update-account");

        var response = await userA.PutAsJsonAsync($"/api/transactions/{ids.TransactionId}", new
        {
            id         = ids.TransactionId,
            accountId  = otherAccountId,
            categoryId = ids.CategoryId,
            created    = DateTime.UtcNow,
            amount     = 25m,
            comment    = "attempted update",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Update_WithOtherUsersCategory_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(userA, "own-update-category");
        int otherCategoryId = await CreateCategoryAsync(userB, "other-update-category");

        var response = await userA.PutAsJsonAsync($"/api/transactions/{ids.TransactionId}", new
        {
            id         = ids.TransactionId,
            accountId  = ids.AccountId,
            categoryId = otherCategoryId,
            created    = DateTime.UtcNow,
            amount     = 25m,
            comment    = "attempted update",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Delete_OwnerTransaction_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(client, "owner-delete");

        var response = await client.DeleteAsync($"/api/transactions/{ids.TransactionId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Delete_OtherUsersTransaction_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(userB, "other-delete");

        var response = await userA.DeleteAsync($"/api/transactions/{ids.TransactionId}");

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    private Task<HttpClient> CreateAuthenticatedClientAsync() =>
        _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task<TransactionFixtureIds> CreateTransactionFixtureAsync(HttpClient client, string key)
    {
        int accountId = await CreateAccountAsync(client, $"{key}-account");
        int categoryId = await CreateCategoryAsync(client, $"{key}-category");
        int transactionId = await CreateTransactionAsync(client, accountId, categoryId);

        return new TransactionFixtureIds(accountId, categoryId, transactionId);
    }

    private static async Task<int> CreateAccountAsync(HttpClient client, string key)
    {
        var response = await client.PostAsJsonAsync("/api/accounts", new
        {
            key,
            name       = key,
            currencyId = 1,
            isEnabled  = true,
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
            name      = key,
            isEnabled = true,
            isSystem  = false,
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private static async Task<int> CreateTransactionAsync(HttpClient client, int accountId, int categoryId)
    {
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = DateTime.UtcNow,
            amount  = 10m,
            comment = "initial",
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private sealed record TransactionFixtureIds(int AccountId, int CategoryId, int TransactionId);
}
