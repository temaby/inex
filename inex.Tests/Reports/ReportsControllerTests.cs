using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
    public async Task CategoryReport_AuthenticatedRequestReturnsInternalTransferSummaryOutsideOrdinaryTotals()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "internal-transfer-report-account");
        int categoryId = await CreateCategoryAsync(client, "internal-transfer-report-category");
        DateTime today = DateTime.UtcNow.Date;
        await CreateTransactionAsync(client, accountId, categoryId, today, 100m);
        await CreateTransactionAsync(client, accountId, categoryId, today, -25m);
        await CreateInternalTransferAsync(client, accountId, today, 70m, "incoming");
        await CreateInternalTransferAsync(client, accountId, today, 30m, "outgoing");

        var response = await client.GetAsync($"/api/reports/category?filter=Start:{today:yyyy-MM-dd};End:{today:yyyy-MM-dd};");

        response.EnsureSuccessStatusCode();
        JsonElement metadata = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("metadata");
        JsonElement internalTransfers = metadata.GetProperty("internalTransfers");
        Assert.Equal(100m, metadata.GetProperty("totalIncome").GetDecimal());
        Assert.Equal(25m, metadata.GetProperty("totalOutcome").GetDecimal());
        Assert.Equal(70m, internalTransfers.GetProperty("amountReceived").GetDecimal());
        Assert.Equal(30m, internalTransfers.GetProperty("amountSent").GetDecimal());
        Assert.Equal(40m, internalTransfers.GetProperty("netChange").GetDecimal());
        Assert.Equal(2, internalTransfers.GetProperty("transactionCount").GetInt32());
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

    [Fact]
    public async Task Reports_ActiveMasterReadsLinkedDataWhileDefaultRemainsOwnScope()
    {
        var masterClient = await CreateAuthenticatedClientAsync();
        var linkedClient = await CreateAuthenticatedClientAsync();
        int masterId = await GetCurrentUserIdAsync(masterClient);
        int linkedId = await GetCurrentUserIdAsync(linkedClient);
        int masterAccountId = await CreateAccountAsync(masterClient, "master-report-account");
        int linkedAccountId = await CreateAccountAsync(linkedClient, "linked-report-account");
        int masterCategoryId = await CreateCategoryAsync(masterClient, "master-report-category");
        int linkedCategoryId = await CreateCategoryAsync(linkedClient, "linked-report-category");
        DateTime today = DateTime.UtcNow.Date;
        await CreateTransactionAsync(masterClient, masterAccountId, masterCategoryId, today, 100m);
        await CreateTransactionAsync(linkedClient, linkedAccountId, linkedCategoryId, today, 250m);
        await AddLinkAsync(masterId, linkedId, UserAccountLinkStatus.Active);

        string filter = $"filter=Start:{today:yyyy-MM-dd};End:{today:yyyy-MM-dd};";
        var linkedCategoryResponse = await masterClient.GetAsync(
            $"/api/reports/category?{filter}&linkedUserId={linkedId}");
        var ownCategoryResponse = await masterClient.GetAsync($"/api/reports/category?{filter}");
        var linkedHistoryResponse = await masterClient.GetAsync(
            $"/api/reports/history/{today.Year}?currency=USD&linkedUserId={linkedId}");
        var linkedNetWorthResponse = await masterClient.GetAsync(
            $"/api/reports/net-worth?months=1&currency=USD&linkedUserId={linkedId}");

        linkedCategoryResponse.EnsureSuccessStatusCode();
        ownCategoryResponse.EnsureSuccessStatusCode();
        linkedHistoryResponse.EnsureSuccessStatusCode();
        linkedNetWorthResponse.EnsureSuccessStatusCode();

        JsonElement linkedCategory = await linkedCategoryResponse.Content.ReadFromJsonAsync<JsonElement>();
        JsonElement ownCategory = await ownCategoryResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(250m, Assert.Single(linkedCategory.GetProperty("data").EnumerateArray()).GetProperty("value").GetDecimal());
        Assert.Equal(100m, Assert.Single(ownCategory.GetProperty("data").EnumerateArray()).GetProperty("value").GetDecimal());

        JsonElement history = await linkedHistoryResponse.Content.ReadFromJsonAsync<JsonElement>();
        JsonElement currentMonth = history.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("month").GetInt32() == today.Month);
        Assert.Equal(250m, currentMonth.GetProperty("income").GetDecimal());

        JsonElement netWorth = await linkedNetWorthResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(250m, Assert.Single(netWorth.GetProperty("data").EnumerateArray())
            .GetProperty("netWorth").GetDecimal());
    }

    [Theory]
    [InlineData(UserAccountLinkStatus.Pending)]
    [InlineData(UserAccountLinkStatus.Rejected)]
    [InlineData(UserAccountLinkStatus.Revoked)]
    public async Task LinkedReports_NonActiveRelationshipReturnsGenericNotFound(UserAccountLinkStatus status)
    {
        var masterClient = await CreateAuthenticatedClientAsync();
        var linkedClient = await CreateAuthenticatedClientAsync();
        int masterId = await GetCurrentUserIdAsync(masterClient);
        int linkedId = await GetCurrentUserIdAsync(linkedClient);
        await AddLinkAsync(masterId, linkedId, status);

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await masterClient.GetAsync(
            $"/api/reports/category?linkedUserId={linkedId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await masterClient.GetAsync(
            $"/api/reports/history/{DateTime.UtcNow.Year}?linkedUserId={linkedId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await masterClient.GetAsync(
            $"/api/reports/net-worth?months=1&linkedUserId={linkedId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await masterClient.GetAsync(
            $"/api/reports/monthly-pdf?linkedUserId={linkedId}"));
    }

    [Fact]
    public async Task LinkedReports_RevocationBlocksTheNextRequest()
    {
        var masterClient = await CreateAuthenticatedClientAsync();
        var linkedClient = await CreateAuthenticatedClientAsync();
        int masterId = await GetCurrentUserIdAsync(masterClient);
        int linkedId = await GetCurrentUserIdAsync(linkedClient);
        await AddLinkAsync(masterId, linkedId, UserAccountLinkStatus.Active);

        Assert.Equal(HttpStatusCode.OK, (await masterClient.GetAsync(
            $"/api/reports/category?linkedUserId={linkedId}")).StatusCode);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            UserAccountLink link = await db.UserAccountLinks.SingleAsync(candidate =>
                candidate.MasterUserId == masterId && candidate.LinkedUserId == linkedId);
            link.Status = UserAccountLinkStatus.Revoked;
            link.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await masterClient.GetAsync(
            $"/api/reports/category?linkedUserId={linkedId}"));
    }

    [Fact]
    public async Task MonthlyPdf_AnonymousRequest_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/reports/monthly-pdf?year=2026&month=5");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MonthlyPdf_AuthenticatedRequest_ReturnsDownloadablePdf()
    {
        var client = await CreateAuthenticatedClientAsync();
        int accountId = await CreateAccountAsync(client, "monthly-pdf-account");
        int categoryId = await CreateCategoryAsync(client, "monthly-pdf-category");
        DateTime currentMonth = new(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        await CreateTransactionAsync(client, accountId, categoryId, currentMonth.AddDays(1), 300m);
        await CreateTransactionAsync(client, accountId, categoryId, currentMonth.AddDays(2), -85m);

        var response = await client.GetAsync($"/api/reports/monthly-pdf?year={currentMonth.Year}&month={currentMonth.Month}");

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition?.DispositionType ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        byte[] content = await response.Content.ReadAsByteArrayAsync();
        Assert.True(content.Length > 4);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(content, 0, 4));
    }

    [Fact]
    public async Task MonthlyPdf_OnlyAnActiveMasterCanSelectALinkedUser()
    {
        var masterClient = await CreateAuthenticatedClientAsync();
        var linkedClient = await CreateAuthenticatedClientAsync();
        var observerClient = await CreateAuthenticatedClientAsync();
        int masterId = await GetCurrentUserIdAsync(masterClient);
        int linkedId = await GetCurrentUserIdAsync(linkedClient);
        int observerId = await GetCurrentUserIdAsync(observerClient);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            db.UserAccountLinks.Add(new UserAccountLink
            {
                MasterUserId = masterId,
                LinkedUserId = linkedId,
                Status = UserAccountLinkStatus.Active,
                CreatedAt = DateTime.UtcNow,
                AcceptedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        string period = $"year={DateTime.UtcNow.Year}&month={DateTime.UtcNow.Month}";
        var validResponse = await masterClient.GetAsync($"/api/reports/monthly-pdf?{period}&linkedUserIds={linkedId}");
        var observerResponse = await masterClient.GetAsync($"/api/reports/monthly-pdf?{period}&linkedUserIds={observerId}");
        var reverseResponse = await linkedClient.GetAsync($"/api/reports/monthly-pdf?{period}&linkedUserIds={masterId}");

        Assert.Equal(HttpStatusCode.OK, validResponse.StatusCode);
        Assert.Equal("application/pdf", validResponse.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, observerResponse.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, reverseResponse.StatusCode);
    }

    [Fact]
    public async Task MonthlyPdf_LinkedViewUsesLinkedAccountsAndRejectsMixedModes()
    {
        var masterClient = await CreateAuthenticatedClientAsync();
        var linkedClient = await CreateAuthenticatedClientAsync();
        int masterId = await GetCurrentUserIdAsync(masterClient);
        int linkedId = await GetCurrentUserIdAsync(linkedClient);
        int masterAccountId = await CreateAccountAsync(masterClient, "master-pdf-view-account");
        int linkedAccountId = await CreateAccountAsync(linkedClient, "linked-pdf-view-account");
        await AddLinkAsync(masterId, linkedId, UserAccountLinkStatus.Active);
        string period = $"year={DateTime.UtcNow.Year}&month={DateTime.UtcNow.Month}";

        var linkedAccountResponse = await masterClient.GetAsync(
            $"/api/reports/monthly-pdf?{period}&linkedUserId={linkedId}&accountIds={linkedAccountId}");
        var unavailableAccountResponse = await masterClient.GetAsync(
            $"/api/reports/monthly-pdf?{period}&linkedUserId={linkedId}&accountIds={masterAccountId}");
        var mixedModesResponse = await masterClient.GetAsync(
            $"/api/reports/monthly-pdf?{period}&linkedUserId={linkedId}&linkedUserIds={linkedId}");
        var ownAccountResponse = await masterClient.GetAsync(
            $"/api/reports/monthly-pdf?{period}&accountIds={masterAccountId}");

        Assert.Equal(HttpStatusCode.OK, linkedAccountResponse.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, unavailableAccountResponse.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, mixedModesResponse.StatusCode);
        Assert.Equal("application/problem+json", mixedModesResponse.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.OK, ownAccountResponse.StatusCode);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(9999)]
    public async Task MonthlyPdf_InvalidYear_ReturnsValidationProblem(int year)
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync($"/api/reports/monthly-pdf?year={year}&month=5");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    private Task<HttpClient> CreateAuthenticatedClientAsync() =>
        _factory.CreateAuthenticatedClientAsync(
            email: $"{Guid.NewGuid()}@example.com",
            username: $"user-{Guid.NewGuid():N}");

    private static async Task<int> GetCurrentUserIdAsync(HttpClient client)
    {
        var body = await (await client.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetInt32();
    }

    private async Task AddLinkAsync(int masterId, int linkedId, UserAccountLinkStatus status)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        db.UserAccountLinks.Add(new UserAccountLink
        {
            MasterUserId = masterId,
            LinkedUserId = linkedId,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            AcceptedAt = status == UserAccountLinkStatus.Active ? DateTime.UtcNow : null,
            RevokedAt = status == UserAccountLinkStatus.Revoked ? DateTime.UtcNow : null,
        });
        await db.SaveChangesAsync();
    }

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
            comment = "report expense",
        });
        response.EnsureSuccessStatusCode();
    }

    private static async Task CreateInternalTransferAsync(HttpClient client, int accountId, DateTime created, decimal amount, string direction)
    {
        var response = await client.PostAsJsonAsync("/api/transactions/internal-transfer", new
        {
            accountId,
            created,
            amount,
            direction,
            comment = "household transfer",
        });
        response.EnsureSuccessStatusCode();
    }
}
