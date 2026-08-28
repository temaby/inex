using System.Net.Http.Json;
using inex.Data;
using inex.Services.Models.Records.Transaction;
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
    public async Task Create_DateOnlyCreated_RoundTripsWithoutCalendarDateConversion()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "date-only-account");
        int categoryId = await CreateCategoryAsync(client, "date-only-category");
        var localCalendarDate = new DateTime(2026, 3, 29);
        const string localCalendarDateInput = "2026-03-29";

        var createResponse = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = localCalendarDateInput,
            amount = 25m,
            comment = "date-only",
        });
        createResponse.EnsureSuccessStatusCode();

        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        int transactionId = createBody.GetProperty("id").GetInt32();

        var getResponse = await client.GetAsync($"/api/transactions/{transactionId}");
        getResponse.EnsureSuccessStatusCode();

        var transaction = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(localCalendarDate, transaction.GetProperty("created").GetDateTime());
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
    public async Task CreateInternalTransfer_RecordsSignedUserOwnedTransactionAndExcludesCashFlowTotals()
    {
        var sender = await CreateAuthenticatedClientAsync();
        var recipient = await CreateAuthenticatedClientAsync();
        int senderAccountId = await CreateAccountAsync(sender, "internal-transfer-sender-account");
        int recipientAccountId = await CreateAccountAsync(recipient, "internal-transfer-recipient-account");

        var senderResponse = await sender.PostAsJsonAsync("/api/transactions/internal-transfer", new
        {
            accountId = senderAccountId,
            created = DateTime.UtcNow,
            amount = 25m,
            direction = "outgoing",
            comment = "sent to household",
        });
        var recipientResponse = await recipient.PostAsJsonAsync("/api/transactions/internal-transfer", new
        {
            accountId = recipientAccountId,
            created = DateTime.UtcNow,
            amount = 25m,
            direction = "incoming",
            comment = "received from household",
        });

        senderResponse.EnsureSuccessStatusCode();
        recipientResponse.EnsureSuccessStatusCode();

        var senderListResponse = await sender.GetAsync("/api/transactions?type=internalTransfer&pageSize=20&page=1");
        senderListResponse.EnsureSuccessStatusCode();
        var senderList = await senderListResponse.Content.ReadFromJsonAsync<JsonElement>();
        var senderTransaction = Assert.Single(senderList.GetProperty("data").EnumerateArray());
        Assert.Equal(senderAccountId, senderTransaction.GetProperty("accountId").GetInt32());
        Assert.Equal(-25m, senderTransaction.GetProperty("amount").GetDecimal());

        var senderSummaryResponse = await sender.GetAsync("/api/transactions/summary?type=internalTransfer");
        senderSummaryResponse.EnsureSuccessStatusCode();
        var senderSummary = await senderSummaryResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, senderSummary.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, senderSummary.GetProperty("typeCounts").GetProperty("internalTransfer").GetInt32());
        Assert.Equal(0, senderSummary.GetProperty("typeCounts").GetProperty("income").GetInt32());
        Assert.Equal(0, senderSummary.GetProperty("typeCounts").GetProperty("expense").GetInt32());
        Assert.Empty(senderSummary.GetProperty("currentScope").GetProperty("cashFlowBuckets").EnumerateArray());
        var senderCurrencySummary = Assert.Single(senderSummary.GetProperty("currencySummaries").EnumerateArray());
        Assert.Equal(0m, senderCurrencySummary.GetProperty("income").GetDecimal());
        Assert.Equal(0m, senderCurrencySummary.GetProperty("expense").GetDecimal());
        Assert.Equal(0m, senderCurrencySummary.GetProperty("net").GetDecimal());

        var recipientListResponse = await recipient.GetAsync("/api/transactions?type=internalTransfer&pageSize=20&page=1");
        recipientListResponse.EnsureSuccessStatusCode();
        var recipientList = await recipientListResponse.Content.ReadFromJsonAsync<JsonElement>();
        var recipientTransaction = Assert.Single(recipientList.GetProperty("data").EnumerateArray());
        Assert.Equal(recipientAccountId, recipientTransaction.GetProperty("accountId").GetInt32());
        Assert.Equal(25m, recipientTransaction.GetProperty("amount").GetDecimal());
    }

    [Fact]
    public async Task CreateInternalTransfer_WithOtherUsersAccount_Returns404Problem()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int otherAccountId = await CreateAccountAsync(userB, "other-internal-transfer-account");

        var response = await userA.PostAsJsonAsync("/api/transactions/internal-transfer", new
        {
            accountId = otherAccountId,
            created = DateTime.UtcNow,
            amount = 25m,
            direction = "outgoing",
        });

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(response);
    }

    [Fact]
    public async Task Create_WithInternalTransferCategory_Returns422()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "protected-system-category-account");
        int internalTransferCategoryId = await GetInternalTransferCategoryIdAsync(client);

        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId = internalTransferCategoryId,
            created = DateTime.UtcNow,
            amount = -25m,
            comment = "attempted hidden transaction",
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("system-category-transaction-create", body.GetProperty("rule").GetString());
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
    public async Task Summary_WithPaginationQuery_AggregatesFullFilteredScope()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "summary-pagination-account");
        int categoryId = await CreateCategoryAsync(client, "summary-pagination-category");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 100m, "paycheck #month");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, -30m, "groceries #month");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, -20m, "transport #month");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 999m, "different #other");

        var response = await client.GetAsync("/api/transactions/summary?tag=month&pageSize=1&page=1");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(3, body.GetProperty("totalCount").GetInt32());
        Assert.Equal(3, body.GetProperty("typeCounts").GetProperty("all").GetInt32());
        Assert.Equal(1, body.GetProperty("typeCounts").GetProperty("income").GetInt32());
        Assert.Equal(2, body.GetProperty("typeCounts").GetProperty("expense").GetInt32());
        Assert.Equal(0, body.GetProperty("typeCounts").GetProperty("transfer").GetInt32());

        var currencySummary = Assert.Single(body.GetProperty("currencySummaries").EnumerateArray());
        Assert.Equal("USD", currencySummary.GetProperty("currency").GetString());
        Assert.Equal(100m, currencySummary.GetProperty("income").GetDecimal());
        Assert.Equal(-50m, currencySummary.GetProperty("expense").GetDecimal());
        Assert.Equal(50m, currencySummary.GetProperty("net").GetDecimal());

        var currentScope = body.GetProperty("currentScope");
        Assert.Equal(3, currentScope.GetProperty("totalCount").GetInt32());
        var cashFlowBucket = Assert.Single(currentScope.GetProperty("cashFlowBuckets").EnumerateArray());
        Assert.Equal("USD", cashFlowBucket.GetProperty("currency").GetString());
        Assert.Equal(100m, cashFlowBucket.GetProperty("income").GetDecimal());
        Assert.Equal(-50m, cashFlowBucket.GetProperty("expense").GetDecimal());
        Assert.False(body.TryGetProperty("previousScope", out _));
    }

    [Fact]
    public async Task Summary_ReturnsComparableDateAndCurrencyBucketsWithAllNonDateFilters()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "comparable-summary-account");
        int categoryId = await CreateCategoryAsync(client, "comparable-summary-category");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 20m, "matching #period", new DateTime(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc));
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, -5m, "matching #period", new DateTime(2026, 3, 20, 8, 0, 0, DateTimeKind.Utc));
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 100m, "matching #period", new DateTime(2026, 4, 10, 8, 0, 0, DateTimeKind.Utc));
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, -30m, "matching #period", new DateTime(2026, 4, 20, 8, 0, 0, DateTimeKind.Utc));
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 999m, "outside #other", new DateTime(2026, 3, 15, 8, 0, 0, DateTimeKind.Utc));

        var response = await client.GetAsync("/api/transactions/summary?tag=period&search=MATCHING&startDate=2026-04-01T00%3A00%3A00&endDate=2026-04-30T23%3A59%3A59");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("USD", body.GetProperty("baseCurrency").GetString());
        Assert.Equal(2, body.GetProperty("currentScope").GetProperty("totalCount").GetInt32());
        Assert.Equal(2, body.GetProperty("currentScope").GetProperty("cashFlowBuckets").GetArrayLength());
        Assert.Equal("2026-04-01T00:00:00", body.GetProperty("currentScope").GetProperty("period").GetProperty("startDate").GetString());

        var previousScope = body.GetProperty("previousScope");
        Assert.Equal(2, previousScope.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, previousScope.GetProperty("cashFlowBuckets").GetArrayLength());
        Assert.Equal("2026-03-01T00:00:00", previousScope.GetProperty("period").GetProperty("startDate").GetString());
        Assert.Equal("2026-03-31T23:59:59.9999999", previousScope.GetProperty("period").GetProperty("endDate").GetString());
    }

    [Fact]
    public async Task Summary_ExcludesOtherUsersTransactions()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int accountA = await CreateAccountAsync(userA, "summary-own-account");
        int categoryA = await CreateCategoryAsync(userA, "summary-own-category");
        int accountB = await CreateAccountAsync(userB, "summary-other-account");
        int categoryB = await CreateCategoryAsync(userB, "summary-other-category");
        await CreateTransactionWithAmountAndCommentAsync(userA, accountA, categoryA, 25m, "own #scope");
        await CreateTransactionWithAmountAndCommentAsync(userB, accountB, categoryB, 100m, "other #scope");

        var response = await userA.GetAsync("/api/transactions/summary?tag=scope");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, body.GetProperty("totalCount").GetInt32());
        var currencySummary = Assert.Single(body.GetProperty("currencySummaries").EnumerateArray());
        Assert.Equal(25m, currencySummary.GetProperty("income").GetDecimal());
    }

    [Fact]
    public async Task ListAndSummary_SearchUseTheCompleteFilteredScopeBeforePagination()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "full-scope-account");
        int categoryId = await CreateCategoryAsync(client, "full-scope-category");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 100m, "Selected ledger item one");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, -40m, "Selected ledger item two");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 15m, "Selected ledger item three");
        await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 999m, "different scope");

        var listResponse = await client.GetAsync("/api/transactions?search=SELECTED%20LEDGER&pageSize=2&page=1");
        var summaryResponse = await client.GetAsync("/api/transactions/summary?search=SELECTED%20LEDGER");

        listResponse.EnsureSuccessStatusCode();
        summaryResponse.EnsureSuccessStatusCode();

        var list = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        var summary = await summaryResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, list.GetProperty("data").GetArrayLength());
        Assert.Equal(3, list.GetProperty("metadata").GetProperty("totalItems").GetInt32());
        Assert.Equal(3, summary.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, summary.GetProperty("typeCounts").GetProperty("income").GetInt32());
        Assert.Equal(1, summary.GetProperty("typeCounts").GetProperty("expense").GetInt32());
    }

    [Fact]
    public async Task Search_IsTrimmedCaseInsensitiveAndMatchesLedgerRelations()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "needle-account");
        int parentCategoryId = await CreateCategoryAsync(client, "needle-parent");
        int categoryId = await CreateCategoryAsync(client, "needle-category", parentCategoryId);
        int commentId = await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 10m, "needle-comment");
        int tagId = await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 10m, "tagged #needle-tag");
        int refId = await CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 10m, "referenced @needle-ref");
        await UpdateTransactionCommentAsync(client, tagId, accountId, categoryId, "tag relation only");
        await UpdateTransactionCommentAsync(client, refId, accountId, categoryId, "reference relation only");

        await AssertSearchContainsAsync(client, "  NEEDLE-COMMENT  ", commentId);
        await AssertSearchContainsAsync(client, "NEEDLE-TAG", tagId);
        await AssertSearchContainsAsync(client, "NEEDLE-REF", refId);
        await AssertSearchContainsAsync(client, "NEEDLE-ACCOUNT", commentId, tagId, refId);
        await AssertSearchContainsAsync(client, "NEEDLE-CATEGORY", commentId, tagId, refId);
        await AssertSearchContainsAsync(client, "NEEDLE-PARENT", commentId, tagId, refId);
        await AssertSearchContainsAsync(client, "USD", commentId, tagId, refId);

        var whitespaceResponse = await client.GetAsync("/api/transactions?search=%20%20%20&pageSize=20&page=1");
        whitespaceResponse.EnsureSuccessStatusCode();
        var whitespaceList = await whitespaceResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(3, whitespaceList.GetProperty("metadata").GetProperty("totalItems").GetInt32());
    }

    [Theory]
    [InlineData("all", 4, 1, 1, 2)]
    [InlineData("income", 1, 1, 0, 0)]
    [InlineData("expense", 1, 0, 1, 0)]
    [InlineData("transfer", 2, 0, 0, 2)]
    public async Task TypeFilter_UsesIncomeExpenseAndTransferSemantics(string type, int total, int income, int expense, int transfer)
    {
        var client = await CreateAuthenticatedClientAsync();
        int sourceAccountId = await CreateAccountAsync(client, "type-source");
        int destinationAccountId = await CreateAccountAsync(client, "type-destination");
        int categoryId = await CreateCategoryAsync(client, "type-category");
        await CreateTransactionWithAmountAndCommentAsync(client, sourceAccountId, categoryId, 10m, "income");
        await CreateTransactionWithAmountAndCommentAsync(client, sourceAccountId, categoryId, -5m, "expense");

        var transferResponse = await client.PostAsJsonAsync("/api/transactions/transfer", new
        {
            accountFromId = sourceAccountId,
            accountToId = destinationAccountId,
            created = DateTime.UtcNow,
            amountFrom = 7m,
            amountTo = 7m,
            comment = "transfer",
        });
        transferResponse.EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/transactions/summary?type={type}");
        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<JsonElement>();
        var counts = summary.GetProperty("typeCounts");
        Assert.Equal(total, summary.GetProperty("totalCount").GetInt32());
        Assert.Equal(total, counts.GetProperty("all").GetInt32());
        Assert.Equal(income, counts.GetProperty("income").GetInt32());
        Assert.Equal(expense, counts.GetProperty("expense").GetInt32());
        Assert.Equal(transfer, counts.GetProperty("transfer").GetInt32());

        if (type == "all")
        {
            var viewTypeCounts = summary.GetProperty("viewTypeCounts");
            Assert.Equal(total, viewTypeCounts.GetProperty("all").GetInt32());
            Assert.Equal(income, viewTypeCounts.GetProperty("income").GetInt32());
            Assert.Equal(expense, viewTypeCounts.GetProperty("expense").GetInt32());
            Assert.Equal(transfer, viewTypeCounts.GetProperty("transfer").GetInt32());
        }
    }

    [Fact]
    public async Task Summary_WithSelectedType_ReturnsViewCountsWithoutTheTypeCriterion()
    {
        var client = await CreateAuthenticatedClientAsync();
        int sourceAccountId = await CreateAccountAsync(client, "view-count-source");
        int destinationAccountId = await CreateAccountAsync(client, "view-count-destination");
        int categoryId = await CreateCategoryAsync(client, "view-count-category");
        await CreateTransactionWithAmountAndCommentAsync(client, sourceAccountId, categoryId, 10m, "income #view-scope");
        await CreateTransactionWithAmountAndCommentAsync(client, sourceAccountId, categoryId, -5m, "expense #view-scope");

        var transferResponse = await client.PostAsJsonAsync("/api/transactions/transfer", new
        {
            accountFromId = sourceAccountId,
            accountToId = destinationAccountId,
            created = DateTime.UtcNow,
            amountFrom = 7m,
            amountTo = 7m,
            comment = "transfer #view-scope",
        });
        transferResponse.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/transactions/summary?tag=view-scope&type=income");
        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(1, summary.GetProperty("currentScope").GetProperty("totalCount").GetInt32());
        var currentTypeCounts = summary.GetProperty("currentScope").GetProperty("typeCounts");
        Assert.Equal(1, currentTypeCounts.GetProperty("all").GetInt32());
        Assert.Equal(1, currentTypeCounts.GetProperty("income").GetInt32());

        var viewTypeCounts = summary.GetProperty("viewTypeCounts");
        Assert.Equal(4, viewTypeCounts.GetProperty("all").GetInt32());
        Assert.Equal(1, viewTypeCounts.GetProperty("income").GetInt32());
        Assert.Equal(1, viewTypeCounts.GetProperty("expense").GetInt32());
        Assert.Equal(2, viewTypeCounts.GetProperty("transfer").GetInt32());
    }

    [Fact]
    public async Task Search_ExcludesOtherUsersMatchingTransactions()
    {
        var userA = await CreateAuthenticatedClientAsync();
        var userB = await CreateAuthenticatedClientAsync();
        int ownAccountId = await CreateAccountAsync(userA, "own-search-account");
        int ownCategoryId = await CreateCategoryAsync(userA, "own-search-category");
        int otherAccountId = await CreateAccountAsync(userB, "other-search-account");
        int otherCategoryId = await CreateCategoryAsync(userB, "other-search-category");
        await CreateTransactionWithAmountAndCommentAsync(userA, ownAccountId, ownCategoryId, 10m, "shared-search-term");
        await CreateTransactionWithAmountAndCommentAsync(userB, otherAccountId, otherCategoryId, 100m, "shared-search-term");

        var response = await userA.GetAsync("/api/transactions/summary?search=shared-search-term");

        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, summary.GetProperty("totalCount").GetInt32());
        Assert.Equal(10m, Assert.Single(summary.GetProperty("currencySummaries").EnumerateArray()).GetProperty("income").GetDecimal());
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

    [Fact]
    public void ApplyFilters_WithTypeAndSearch_ProducesDatabaseSideSql()
    {
        var options = new DbContextOptionsBuilder<InExDbContext>()
            .UseMySql("Server=localhost;Database=inex;User=root;Password=password;", new MySqlServerVersion(new Version(8, 0, 0)))
            .Options;

        using var db = new InExDbContext(options);
        var query = TransactionService.ApplyFilters(db.Transactions, new TransactionFilterQuery
        {
            Type = "expense",
            Search = "Ledger",
        });

        string sql = query.ToQueryString();

        Assert.Contains("LOWER", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("transaction_tag_map", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("category", sql, StringComparison.OrdinalIgnoreCase);
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

    private static async Task<int> CreateCategoryAsync(HttpClient client, string key, int? parentId = null)
    {
        var response = await client.PostAsJsonAsync("/api/categories", new
        {
            key,
            name      = key,
            parentId,
            isEnabled = true,
            isSystem  = false,
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private static async Task<int> GetInternalTransferCategoryIdAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/categories?mode=ALL");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        JsonElement category = body.GetProperty("data").EnumerateArray()
            .Single(item => item.TryGetProperty("systemCode", out JsonElement systemCode)
                            && systemCode.GetString() == "internal-transfer");
        return category.GetProperty("id").GetInt32();
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

    private static Task<int> CreateTransactionWithCommentAsync(HttpClient client, int accountId, int categoryId, string comment)
        => CreateTransactionWithAmountAndCommentAsync(client, accountId, categoryId, 10m, comment);

    private static async Task<int> CreateTransactionWithAmountAndCommentAsync(HttpClient client, int accountId, int categoryId, decimal amount, string comment, DateTime? created = null)
    {
        var response = await client.PostAsJsonAsync("/api/transactions", new
        {
            accountId,
            categoryId,
            created = created ?? DateTime.UtcNow,
            amount,
            comment,
        });
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private static async Task AssertSearchContainsAsync(HttpClient client, string search, params int[] expectedIds)
    {
        var response = await client.GetAsync($"/api/transactions?search={Uri.EscapeDataString(search)}&pageSize=20&page=1");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var ids = body.GetProperty("data").EnumerateArray().Select(transaction => transaction.GetProperty("id").GetInt32());
        Assert.Equal(expectedIds.OrderBy(id => id), ids.OrderBy(id => id));
    }

    private static async Task UpdateTransactionCommentAsync(HttpClient client, int transactionId, int accountId, int categoryId, string comment)
    {
        var response = await client.PutAsJsonAsync($"/api/transactions/{transactionId}", new
        {
            id = transactionId,
            accountId,
            categoryId,
            created = DateTime.UtcNow,
            amount = 10m,
            comment,
        });
        response.EnsureSuccessStatusCode();
    }

    private sealed record TransactionFixtureIds(int AccountId, int CategoryId, int TransactionId);
}
