using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Transaction;
using inex.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace inex.Tests.Transactions;

[Collection(IntegrationTestCollection.Name)]
public class TransactionCommentSuggestionsTests(InExWebApplicationFactory factory) : IClassFixture<InExWebApplicationFactory>
{
    [Fact]
    public async Task AnonymousRequestRequiresAuthentication() => Assert.Equal(HttpStatusCode.Unauthorized,
        (await factory.CreateClient().GetAsync("/api/transactions/comment-suggestions?type=tag")).StatusCode);

    [Theory]
    [InlineData("", "comment_suggestions.type_invalid")]
    [InlineData("?type=other", "comment_suggestions.type_invalid")]
    [InlineData("?type=tag&query=", null)]
    public async Task ValidatesQueryWithProblemDetails(string query, string? code)
    {
        var (client, _) = await UserAsync();
        var response = await client.GetAsync("/api/transactions/comment-suggestions" + query);
        if (code == null) { Assert.Equal(HttpStatusCode.OK, response.StatusCode); return; }
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains(code, await response.Content.ReadAsStringAsync());
        var tooLong = await client.GetAsync("/api/transactions/comment-suggestions?type=ref&query=" + new string('x', 256));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooLong.StatusCode);
        Assert.Contains("comment_suggestions.query_too_long", await tooLong.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task RanksDistinctPrefixesBeforeSubstringsThenUsageLatestAndKeyWithoutCrossUserData()
    {
        var (client, owner) = await UserAsync();
        var (otherClient, other) = await UserAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
        var account = db.Accounts.First(row => row.UserId == owner);
        var category = db.Categories.First(row => row.UserId == owner);
        var foreignAccount = db.Accounts.First(row => row.UserId == other);
        var foreignCategory = db.Categories.First(row => row.UserId == other);
        Tag Add(string key, int count = 0, int days = 0, TagType type = TagType.TAG, int? userId = null)
        {
            int user = userId ?? owner;
            var tag = new Tag { UserId = user, Type = type, Key = key, Name = key };
            db.Set<Tag>().Add(tag);
            for (int i = 0; i < count; i++) tag.TagTransactionDetails.Add(new TransactionTagMap {
                Transaction = new Transaction { UserId = user, AccountId = user == owner ? account.Id : foreignAccount.Id,
                    CategoryId = user == owner ? category.Id : foreignCategory.Id, Comment = "irrelevant", Value = -1,
                    Created = new DateTime(2026, 10, 1).AddDays(days) },
            });
            return tag;
        }
        Add("grocery", 2, 1); Add("groceries", 2, 2); Add("GROCERIES", 1, 1);
        Add("grow", 2, 2); Add("grove", 2, 2); Add("gro-historical");
        Add("agro", 20, 3); Add("gro-sixth"); Add("gro-ref", type: TagType.REF);
        var ownHistorical = Add("gro-never");
        var foreign = Add("gro-secret", 30, 10, userId: other);
        // A malformed foreign transaction link may not influence the owner's ranking.
        ownHistorical.TagTransactionDetails.Add(new TransactionTagMap { Transaction = foreign.TagTransactionDetails.First().Transaction });
        await db.SaveChangesAsync();
        var result = await GetAsync(client, "tag", "GRO");
        Assert.Equal(new[] { "groceries", "grove", "grow", "grocery", "gro-historical" }, result.Suggestions.Select(key => key.ToLowerInvariant()));
        Assert.Contains(result.Suggestions[0], new[] { "groceries", "GROCERIES" });
        Assert.Equal(new[] { "gro-ref" }, (await GetAsync(client, "ref", "gro")).Suggestions);
        Assert.Equal(new[] { "gro-secret" }, (await GetAsync(otherClient, "tag", "gro")).Suggestions);
        Assert.Empty((await GetAsync(client, "tag", "missing")).Suggestions);
        var attemptedOverride = await client.GetFromJsonAsync<TransactionCommentSuggestionsResponse>(
            $"/api/transactions/comment-suggestions?type=tag&query=gro&userId={other}&linkedUserId={other}");
        Assert.Equal(result.Suggestions, attemptedOverride?.Suggestions);
        Assert.Equal("agro", (await GetAsync(client, "tag", "")).Suggestions[0]);
    }

    [Theory]
    [InlineData("GROCERIES", TagType.TAG, "#", "tag")]
    [InlineData("MARIA", TagType.REF, "@", "ref")]
    public async Task SuggestedHistoricalUppercaseKeyCanBeSavedAndReplacedWithoutDuplicatingCatalog(
        string key, TagType type, string marker, string queryType)
    {
        var (client, owner) = await UserAsync();
        int accountId, categoryId, tagId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            accountId = db.Accounts.First(row => row.UserId == owner && row.IsEnabled).Id;
            var category = new Category { UserId = owner, Key = "marker-save", Name = "Marker save", IsEnabled = true };
            var tag = new Tag { UserId = owner, Key = key, Name = key, Type = type };
            db.Categories.Add(category); db.Tags.Add(tag); await db.SaveChangesAsync();
            categoryId = category.Id; tagId = tag.Id;
        }
        string suggested = Assert.Single((await GetAsync(client, queryType, key.ToLowerInvariant())).Suggestions);
        Assert.Equal(key, suggested);
        var request = new CreateTransactionRequest { AccountId = accountId, CategoryId = categoryId,
            Created = new DateTime(2026, 1, 1), Amount = -1, Comment = "Selected " + marker + suggested };
        var response = await client.PostAsJsonAsync("/api/transactions", request);
        response.EnsureSuccessStatusCode();
        int id = (await response.Content.ReadFromJsonAsync<CreatedResponse>())!.Id;
        Assert.Equal(request.Comment, (await client.GetFromJsonAsync<TransactionResponse>($"/api/transactions/{id}"))?.Comment);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            Assert.Single(db.Tags.Where(row => row.UserId == owner && row.Type == type));
            Assert.True(db.TransactionTagDetails.Any(row => row.TransactionId == id && row.Transaction.UserId == owner && row.TagId == tagId));
        }
        var update = new UpdateTransactionRequest { Id = id, AccountId = accountId, CategoryId = categoryId,
            Created = request.Created, Amount = request.Amount, Comment = marker + "replacement" };
        (await client.PutAsJsonAsync($"/api/transactions/{id}", update)).EnsureSuccessStatusCode();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            Assert.False(db.TransactionTagDetails.Any(row => row.TransactionId == id && row.Transaction.UserId == owner && row.TagId == tagId));
        }
        Assert.Equal(key, Assert.Single((await GetAsync(client, queryType, key)).Suggestions));
    }

    private static async Task<TransactionCommentSuggestionsResponse> GetAsync(HttpClient client, string type, string query) =>
        await client.GetFromJsonAsync<TransactionCommentSuggestionsResponse>("/api/transactions/comment-suggestions?type=" + type + "&query=" + Uri.EscapeDataString(query))
        ?? throw new InvalidOperationException("Missing response");

    private async Task<(HttpClient Client, int UserId)> UserAsync()
    {
        string name = "markers-" + Guid.NewGuid().ToString("N");
        var client = await factory.CreateAuthenticatedClientAsync(name + "@example.test", name);
        using var scope = factory.Services.CreateScope();
        return (client, scope.ServiceProvider.GetRequiredService<InExDbContext>().Users.Single(user => user.UserName == name).Id);
    }
}
