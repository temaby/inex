using System.Net.Http.Json;
using inex.Data;
using inex.Data.Models;
using inex.Services.Models.Records.Transaction;
using inex.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
namespace inex.Tests.Transactions;

[Collection(Infrastructure.IntegrationTestCollection.Name)]
public class InternalTransferRequestControllerTests(InExWebApplicationFactory factory) : IClassFixture<InExWebApplicationFactory>
{
    [Fact] public async Task AnonymousCannotListOrDecide()
    {
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/internal-transfer-requests")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/internal-transfer-requests/1/accept", new { accountId = 1 })).StatusCode);
    }
    [Fact] public async Task HttpLifecycleAndPendingGuardsPreserveOwnerBoundaries()
    {
        string suffix = Guid.NewGuid().ToString("N");
        var master = await factory.CreateAuthenticatedClientAsync("master-" + suffix + "@example.test", "master-" + suffix);
        var linked = await factory.CreateAuthenticatedClientAsync("linked-" + suffix + "@example.test", "linked-" + suffix);
        var stranger = await factory.CreateAuthenticatedClientAsync("other-" + suffix + "@example.test", "other-" + suffix);
        int linkedId; int sourceId; int destinationId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<InExDbContext>();
            var m = await db.Users.SingleAsync(x => x.UserName == "master-" + suffix);
            var l = await db.Users.SingleAsync(x => x.UserName == "linked-" + suffix); linkedId = l.Id;
            var source = new Account { UserId = m.Id, CurrencyId = 1, Key = "master-" + suffix, Name = "Master verification", IsEnabled = true };
            var destination = new Account { UserId = l.Id, CurrencyId = 1, Key = "linked-" + suffix, Name = "Linked verification", IsEnabled = true };
            db.Accounts.AddRange(source, destination);
            db.UserAccountLinks.Add(new UserAccountLink { MasterUserId = m.Id, LinkedUserId = l.Id, Status = UserAccountLinkStatus.Active, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync(); sourceId = source.Id; destinationId = destination.Id;
        }
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await master.PostAsJsonAsync("/api/internal-transfer-requests", new { })).StatusCode);
        var response = await master.PostAsJsonAsync("/api/internal-transfer-requests", new CreateLinkedInternalTransferRequest {
            AccountId = sourceId, LinkedUserId = linkedId, Amount = 25, Direction = "outgoing", Created = new DateTime(2026, 10, 16), SubmissionKey = Guid.NewGuid().ToString("D") });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var request = await response.Content.ReadFromJsonAsync<InternalTransferRequestResponse>(); Assert.NotNull(request);
        Assert.Equal("master-" + suffix, request.MasterUsername);
        Assert.Equal(HttpStatusCode.NotFound, (await master.PostAsJsonAsync($"/api/internal-transfer-requests/{request.Id}/accept", new { accountId = sourceId })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsJsonAsync($"/api/internal-transfer-requests/{request.Id}/reject", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await master.DeleteAsync($"/api/transactions/{request.MasterTransactionId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await master.DeleteAsync($"/api/transactions?ids={request.MasterTransactionId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await master.DeleteAsync($"/api/accounts/{sourceId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await linked.PostAsJsonAsync($"/api/internal-transfer-requests/{request.Id}/accept", new { accountId = sourceId })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await linked.PostAsJsonAsync($"/api/internal-transfer-requests/{request.Id}/accept", new { accountId = destinationId })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await linked.PostAsJsonAsync($"/api/internal-transfer-requests/{request.Id}/reject", new { })).StatusCode);
        var empty = await stranger.GetFromJsonAsync<InternalTransferRequestPage>("/api/internal-transfer-requests"); Assert.NotNull(empty); Assert.Empty(empty.Data);
        Assert.Equal(HttpStatusCode.OK, (await master.DeleteAsync($"/api/transactions/{request.MasterTransactionId}")).StatusCode);
    }
}
