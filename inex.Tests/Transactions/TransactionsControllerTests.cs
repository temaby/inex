using System.Net.Http.Json;
using inex.Data;
using inex.Services.Services;
using inex.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

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
    public async Task CreateTransfer_WithOtherUsersSourceAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int otherSourceAccountId = await CreateAccountAsync(userB, "other-transfer-source-account");
        int ownDestinationAccountId = await CreateAccountAsync(userA, "own-transfer-destination-account");

        var response = await userA.PostAsJsonAsync("/api/transactions/transfer", new
        {
            accountFromId = otherSourceAccountId,
            accountToId   = ownDestinationAccountId,
            created       = DateTime.UtcNow,
            amountFrom    = 10m,
            amountTo      = 10m,
            comment       = "attempted transfer source",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task CreateTransfer_WithOtherUsersDestinationAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int ownSourceAccountId = await CreateAccountAsync(userA, "own-transfer-source-account");
        int otherDestinationAccountId = await CreateAccountAsync(userB, "other-transfer-destination-account");

        var response = await userA.PostAsJsonAsync("/api/transactions/transfer", new
        {
            accountFromId = ownSourceAccountId,
            accountToId   = otherDestinationAccountId,
            created       = DateTime.UtcNow,
            amountFrom    = 10m,
            amountTo      = 10m,
            comment       = "attempted transfer destination",
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

    [Fact]
    public async Task Filter_ByTag_ReturnOnlyMatchingTransactions()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "filter-tag-account");
        int categoryId = await CreateCategoryAsync(client, "filter-tag-category");
        int expectedId = await CreateTransactionWithCommentAsync(client, accountId, categoryId, "weekly shop #groceries");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "weekly shop #other");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "weekly shop");

        var response = await client.GetAsync("/api/transactions?tag=groceries&pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data").EnumerateArray().ToList();
        var transaction = Assert.Single(data);
        Assert.Equal(expectedId, transaction.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Filter_ByRef_ReturnOnlyMatchingTransactions()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "filter-ref-account");
        int categoryId = await CreateCategoryAsync(client, "filter-ref-category");
        int expectedId = await CreateTransactionWithCommentAsync(client, accountId, categoryId, "paid back @alice");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "paid back @bob");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "paid back");

        var response = await client.GetAsync("/api/transactions?ref=alice&pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data").EnumerateArray().ToList();
        var transaction = Assert.Single(data);
        Assert.Equal(expectedId, transaction.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Filter_ByTagAndRef_Combined_ReturnsOnlyMatchingTransactions()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "filter-combined-account");
        int categoryId = await CreateCategoryAsync(client, "filter-combined-category");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "tagged only #groceries");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "ref only @alice");
        int expectedId = await CreateTransactionWithCommentAsync(client, accountId, categoryId, "both #groceries @alice");

        var response = await client.GetAsync("/api/transactions?tag=groceries&ref=alice&pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data").EnumerateArray().ToList();
        var transaction = Assert.Single(data);
        Assert.Equal(expectedId, transaction.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Filter_ByTag_WithPagination_CountReflectsFilteredTotal()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "filter-pagination-account");
        int categoryId = await CreateCategoryAsync(client, "filter-pagination-category");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "food 1 #food");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "food 2 #food");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "food 3 #food");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "plain 1");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "plain 2");

        var response = await client.GetAsync("/api/transactions?tag=food&pageSize=2&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(3, body.GetProperty("metadata").GetProperty("totalItems").GetInt32());
        Assert.Equal(2, body.GetProperty("data").EnumerateArray().Count());
    }

    [Fact]
    public async Task List_WithMultipleAccountIds_ReturnsOnlyMatchingTransactions()
    {
        var client = await CreateAuthenticatedClientAsync();
        int firstAccountId = await CreateAccountAsync(client, "filter-multi-account-1");
        int secondAccountId = await CreateAccountAsync(client, "filter-multi-account-2");
        int otherAccountId = await CreateAccountAsync(client, "filter-multi-account-other");
        int categoryId = await CreateCategoryAsync(client, "filter-multi-account-category");
        int firstId = await CreateTransactionWithCommentAsync(client, firstAccountId, categoryId, "first account");
        int secondId = await CreateTransactionWithCommentAsync(client, secondAccountId, categoryId, "second account");
        await CreateTransactionWithCommentAsync(client, otherAccountId, categoryId, "other account");

        var response = await client.GetAsync($"/api/transactions?accountId={firstAccountId}&accountId={secondAccountId}&pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data").EnumerateArray().ToList();
        Assert.Equal(2, data.Count);
        Assert.All(data, transaction => Assert.Contains(transaction.GetProperty("accountId").GetInt32(), new[] { firstAccountId, secondAccountId }));
        Assert.Contains(data, transaction => transaction.GetProperty("id").GetInt32() == firstId);
        Assert.Contains(data, transaction => transaction.GetProperty("id").GetInt32() == secondId);
    }

    [Fact]
    public async Task List_IncludesAccountCurrency()
    {
        var client = await CreateAuthenticatedClientAsync();
        var ids = await CreateTransactionFixtureAsync(client, "list-account-currency");

        var response = await client.GetAsync("/api/transactions?pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var transaction = Assert.Single(body.GetProperty("data").EnumerateArray(), item => item.GetProperty("id").GetInt32() == ids.TransactionId);
        Assert.Equal("USD", transaction.GetProperty("accountCurrency").GetString());
    }

    [Fact]
    public async Task List_WithUrlEncodedTag_ReturnsMatchingTransactions()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "filter-encoded-tag-account");
        int categoryId = await CreateCategoryAsync(client, "filter-encoded-tag-category");
        int expectedId = await CreateTransactionWithCommentAsync(client, accountId, categoryId, "coffee #café");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "coffee #cafe");

        var response = await client.GetAsync("/api/transactions?tag=caf%C3%A9&pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data").EnumerateArray().ToList();
        var transaction = Assert.Single(data);
        Assert.Equal(expectedId, transaction.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task List_WithMultipleTagFilters_ReturnsTransactionsMatchingAll()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "filter-multi-tag-account");
        int categoryId = await CreateCategoryAsync(client, "filter-multi-tag-category");
        int expectedId = await CreateTransactionWithCommentAsync(client, accountId, categoryId, "dinner #food #family");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "dinner #food");
        await CreateTransactionWithCommentAsync(client, accountId, categoryId, "dinner #family");

        var response = await client.GetAsync("/api/transactions?tag=food&tag=family&pageSize=20&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = body.GetProperty("data").EnumerateArray().ToList();
        var transaction = Assert.Single(data);
        Assert.Equal(expectedId, transaction.GetProperty("id").GetInt32());
    }

    [Fact]
    public void ApplyFilters_ByTagAndRef_ProducesDatabaseSideSql()
    {
        var options = new DbContextOptionsBuilder<InExDbContext>()
            .UseMySql("Server=localhost;Database=inex;User=root;Password=password;", new MySqlServerVersion(new Version(8, 0, 0)))
            .Options;

        using var db = new InExDbContext(options);
        var query = TransactionService.ApplyFilters(db.Transactions, new Dictionary<string, string>
        {
            ["tags"] = "groceries",
            ["refs"] = "alice",
        });

        string sql = query.ToQueryString();

        Assert.Contains("EXISTS", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("transaction_tag_map", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("`key`", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("tag_type", sql, StringComparison.OrdinalIgnoreCase);
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

    private static async Task<int> CreateTransactionWithCommentAsync(HttpClient client, int accountId, int categoryId, string comment)
    {
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = DateTime.UtcNow,
            amount  = 10m,
            comment,
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private sealed record TransactionFixtureIds(int AccountId, int CategoryId, int TransactionId);
}
