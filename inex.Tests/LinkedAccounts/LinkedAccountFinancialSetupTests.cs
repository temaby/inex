using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Tests.LinkedAccounts;

[Collection(IntegrationTestCollection.Name)]
public class LinkedAccountFinancialSetupTests : IClassFixture<InExWebApplicationFactory>
{
    private readonly InExWebApplicationFactory _factory;

    public LinkedAccountFinancialSetupTests(InExWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task FinancialReads_ActiveOutgoingLinkUseLinkedOwner_WhileSingleReadsRemainOwnerOnly()
    {
        (HttpClient masterClient, int masterId) = await CreateUserAsync("master");
        (HttpClient linkedClient, int linkedId) = await CreateUserAsync("linked");
        int masterAccountId = await CreateAccountAsync(masterClient, $"master-{Guid.NewGuid():N}");
        string linkedAccountKey = $"linked-{Guid.NewGuid():N}";
        int linkedAccountId = await CreateAccountAsync(linkedClient, linkedAccountKey);
        string masterCategoryKey = $"master-category-{Guid.NewGuid():N}";
        string linkedCategoryKey = $"linked-category-{Guid.NewGuid():N}";
        int linkedCategoryId = await CreateCategoryAsync(linkedClient, linkedCategoryKey);
        await CreateCategoryAsync(masterClient, masterCategoryKey);
        await AddLinkAsync(masterId, linkedId, UserAccountLinkStatus.Active);

        JsonElement ownAccounts = await ReadJsonAsync(await masterClient.GetAsync("/api/accounts?mode=ALL"));
        Assert.Contains(ownAccounts.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("id").GetInt32() == masterAccountId);
        Assert.DoesNotContain(ownAccounts.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("id").GetInt32() == linkedAccountId);

        JsonElement linkedAccounts = await ReadJsonAsync(await masterClient.GetAsync(
            $"/api/accounts?mode=ALL&linkedUserId={linkedId}"));
        Assert.Contains(linkedAccounts.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("key").GetString() == linkedAccountKey);
        Assert.DoesNotContain(linkedAccounts.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("id").GetInt32() == masterAccountId);

        JsonElement linkedSummaries = await ReadJsonAsync(await masterClient.GetAsync(
            $"/api/accounts/details?ids[0]={linkedAccountId}&linkedUserId={linkedId}"));
        Assert.Equal(linkedAccountId, Assert.Single(linkedSummaries.GetProperty("data").EnumerateArray())
            .GetProperty("id").GetInt32());

        JsonElement linkedCategories = await ReadJsonAsync(await masterClient.GetAsync(
            $"/api/categories?mode=ALL&linkedUserId={linkedId}"));
        Assert.Contains(linkedCategories.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("key").GetString() == linkedCategoryKey);
        Assert.DoesNotContain(linkedCategories.GetProperty("data").EnumerateArray(), item =>
            item.GetProperty("key").GetString() == masterCategoryKey);

        var cachedRatesResponse = await masterClient.GetAsync(
            $"/api/exchange/rates/cached?startDate=2026-01-01&endDate=2026-01-31&linkedUserId={linkedId}");
        Assert.Equal(HttpStatusCode.OK, cachedRatesResponse.StatusCode);

        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(
            await masterClient.GetAsync($"/api/accounts/{linkedAccountId}?linkedUserId={linkedId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(
            await masterClient.GetAsync($"/api/categories/{linkedCategoryId}?linkedUserId={linkedId}"));
    }

    [Theory]
    [InlineData(UserAccountLinkStatus.Pending)]
    [InlineData(UserAccountLinkStatus.Rejected)]
    [InlineData(UserAccountLinkStatus.Revoked)]
    public async Task FinancialReads_NonActiveLinkReturnGenericNotFound(UserAccountLinkStatus status)
    {
        (HttpClient masterClient, int masterId) = await CreateUserAsync("master");
        var (_, linkedId) = await CreateUserAsync("linked");
        await AddLinkAsync(masterId, linkedId, status);

        await AssertFinancialScopeUnavailableAsync(masterClient, linkedId);
    }

    [Fact]
    public async Task FinancialReads_ReverseUnrelatedAndSiblingAccessReturnGenericNotFound()
    {
        (HttpClient masterClient, int masterId) = await CreateUserAsync("master");
        (HttpClient linkedClient, int linkedId) = await CreateUserAsync("linked");
        (HttpClient siblingClient, int siblingId) = await CreateUserAsync("sibling");
        var (unrelatedClient, _) = await CreateUserAsync("unrelated");
        await AddLinkAsync(masterId, linkedId, UserAccountLinkStatus.Active);
        await AddLinkAsync(masterId, siblingId, UserAccountLinkStatus.Active);

        await AssertFinancialScopeUnavailableAsync(linkedClient, masterId);
        await AssertFinancialScopeUnavailableAsync(unrelatedClient, linkedId);
        await AssertFinancialScopeUnavailableAsync(linkedClient, siblingId);
    }

    [Fact]
    public async Task FinancialReads_RevocationBlocksNextDelegatedRequest()
    {
        (HttpClient masterClient, int masterId) = await CreateUserAsync("master");
        var (_, linkedId) = await CreateUserAsync("linked");
        await AddLinkAsync(masterId, linkedId, UserAccountLinkStatus.Active);

        Assert.Equal(HttpStatusCode.OK, (await masterClient.GetAsync(
            $"/api/accounts?mode=ALL&linkedUserId={linkedId}")).StatusCode);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            UserAccountLink link = await db.UserAccountLinks.SingleAsync(candidate =>
                candidate.MasterUserId == masterId && candidate.LinkedUserId == linkedId);
            link.Status = UserAccountLinkStatus.Revoked;
            link.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        await AssertFinancialScopeUnavailableAsync(masterClient, linkedId);
    }

    private async Task<(HttpClient Client, int UserId)> CreateUserAsync(string role)
    {
        var client = await _factory.CreateAuthenticatedClientAsync(
            email: $"{role}-{Guid.NewGuid():N}@example.com",
            username: $"{role}-{Guid.NewGuid():N}");
        JsonElement profile = await ReadJsonAsync(await client.GetAsync("/api/auth/me"));
        return (client, profile.GetProperty("id").GetInt32());
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
        JsonElement response = await ReadJsonAsync(await client.PostAsJsonAsync("/api/accounts", new
        {
            key,
            name = key,
            currencyId = 1,
            isEnabled = true,
            isFavourite = false,
        }));
        return response.GetProperty("id").GetInt32();
    }

    private static async Task<int> CreateCategoryAsync(HttpClient client, string key)
    {
        JsonElement response = await ReadJsonAsync(await client.PostAsJsonAsync("/api/categories", new
        {
            key,
            name = key,
            isEnabled = true,
            parentId = (int?)null,
        }));
        return response.GetProperty("id").GetInt32();
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static async Task AssertFinancialScopeUnavailableAsync(HttpClient client, int linkedUserId)
    {
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await client.GetAsync(
            $"/api/accounts?mode=ALL&linkedUserId={linkedUserId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await client.GetAsync(
            $"/api/categories?mode=ALL&linkedUserId={linkedUserId}"));
        await ProblemDetailsAssertions.AssertNotFoundProblemAsync(await client.GetAsync(
            $"/api/exchange/rates/cached?startDate=2026-01-01&endDate=2026-01-31&linkedUserId={linkedUserId}"));
    }
}
