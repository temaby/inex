using inex.Data;
using inex.Data.Models;
using inex.Data.Repositories;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.Time;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using inex.Services.Models.Enums;
using Microsoft.EntityFrameworkCore;
using RequestEntity = inex.Data.Models.InternalTransferRequest;
namespace inex.Tests.Transactions;

/// <summary>InMemory lifecycle/authorization coverage. Does not prove MySQL isolation/constraints.</summary>
public sealed class InternalTransferRequestTests : IDisposable
{
    private readonly InExDbContext db;
    private readonly InExUnitOfWork uow;
    private readonly InternalTransferRequestService service;
    private readonly TransactionService transactions;
    private static readonly DateTime Now = new(2026, 10, 16, 12, 0, 0, DateTimeKind.Utc);
    private sealed class Clock : IClock { public DateTime UtcNow => Now; }
    public InternalTransferRequestTests()
    {
        db = new(new DbContextOptionsBuilder<InExDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        uow = new(db); service = new(uow, new Clock()); transactions = new(uow);
        db.Currencies.AddRange(new Currency { Id = 1, Key = "USD", Name = "USD" }, new Currency { Id = 2, Key = "EUR", Name = "EUR" });
        db.Users.AddRange(new AppUser { Id = 1, UserName = "Master", CurrencyId = 1 }, new AppUser { Id = 2, UserName = "Linked", CurrencyId = 1 });
        db.Accounts.AddRange(new Account { Id = 1, UserId = 1, CurrencyId = 1, IsEnabled = true, Key = "master", Name = "Master" },
            new Account { Id = 2, UserId = 2, CurrencyId = 1, IsEnabled = true, Key = "linked", Name = "Linked" },
            new Account { Id = 3, UserId = 2, CurrencyId = 2, IsEnabled = true, Key = "eur", Name = "EUR" },
            new Account { Id = 4, UserId = 2, CurrencyId = 1, IsEnabled = false, Key = "disabled", Name = "Disabled" });
        db.Categories.AddRange(new Category { Id = 1, UserId = 1, IsSystem = true, IsEnabled = true, SystemCode = "internal-transfer", Key = "master", Name = "Master transfer" },
            new Category { Id = 2, UserId = 2, IsSystem = true, IsEnabled = true, SystemCode = "internal-transfer", Key = "linked", Name = "Linked transfer" });
        db.UserAccountLinks.Add(new UserAccountLink { Id = 1, MasterUserId = 1, LinkedUserId = 2, Status = UserAccountLinkStatus.Active, CreatedAt = Now });
        db.SaveChanges(); db.ChangeTracker.Clear();
    }
    private static CreateLinkedInternalTransferRequest Terms => new() { AccountId = 1, LinkedUserId = 2, SubmissionKey = Guid.NewGuid().ToString("D"), Amount = 20, Created = Now.AddDays(-3), Direction = "outgoing", Comment = "shared #travel @friend" };
    private async Task<inex.Services.Models.Records.Transaction.InternalTransferRequestResponse> Create(CreateLinkedInternalTransferRequest? terms = null)
    { var response = await service.CreateAsync(terms ?? Terms, 1, default); db.ChangeTracker.Clear(); return response; }
    [Fact] public async Task CreationBooksOnlyMasterAndPendingIsOutsideRecipientLedger()
    {
        var response = await Create();
        Assert.Equal("Pending", response.Status);
        Assert.Equal(-20, await db.Transactions.Where(x => x.UserId == 1).SumAsync(x => x.Value));
        Assert.False(await db.Transactions.AnyAsync(x => x.UserId == 2));
        Assert.Equal(0, transactions.GetSummary(2, ActivityMode.ACTIVE, new()).TotalCount);
        Assert.Single((await service.GetAsync(2, 1, 10, default)).Data);
        Assert.Empty((await service.GetAsync(3, 1, 10, default)).Data);
    }
    [Fact] public async Task IdenticalSubmissionReturnsOriginalAndChangedTermsConflict()
    {
        var terms = Terms; var original = await Create(terms);
        Assert.Equal(original.Id, (await service.CreateAsync(terms, 1, default)).Id);
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(terms with { Amount = 21 }, 1, default));
        Assert.Single(await db.Transactions.ToListAsync());
    }
    [Theory] [InlineData("outgoing", 20)] [InlineData("incoming", -20)]
    public async Task AcceptPostsExactlyOneOppositeOperationWithOriginalDate(string direction, decimal expected)
    {
        var terms = Terms with { Direction = direction }; var request = await Create(terms);
        var accepted = await service.DecideAsync(request.Id, "accept", 2, 2, default); db.ChangeTracker.Clear();
        Assert.Equal("Accepted", accepted.Status); Assert.Equal(Now, accepted.DecidedAt);
        var posting = await db.Transactions.SingleAsync(x => x.UserId == 2);
        Assert.Equal(expected, posting.Value); Assert.Equal(terms.Created, posting.Created); Assert.Equal(2, posting.CategoryId);
        Assert.Equal(2, await db.TransactionTagDetails.CountAsync(x => x.TransactionId == posting.Id));
        Assert.Equal(accepted.Id, (await service.DecideAsync(request.Id, "accept", 2, 2, default)).Id);
        Assert.Equal(2, await db.Transactions.CountAsync());
        await Assert.ThrowsAsync<ConflictException>(() => service.DecideAsync(request.Id, "reject", null, 2, default));
    }
    [Theory] [InlineData("reject", 2)] [InlineData("cancel", 1)]
    public async Task NonAcceptanceRetainsMasterPostingAndUnlocksDeletion(string decision, int actor)
    {
        var request = await Create(); await service.DecideAsync(request.Id, decision, null, actor, default); db.ChangeTracker.Clear();
        Assert.Single(await db.Transactions.ToListAsync());
        await transactions.DeleteAsync(request.MasterTransactionId!.Value, 1);
        Assert.Empty(await db.Transactions.ToListAsync());
        Assert.Single(await db.InternalTransferRequests.ToListAsync());
    }
    [Theory] [InlineData("accept", 1)] [InlineData("reject", 1)] [InlineData("cancel", 2)] [InlineData("accept", 3)]
    public async Task OtherActorsCannotDecide(string decision, int actor)
    {
        var request = await Create();
        await Assert.ThrowsAsync<ResourceNotFoundException>(() => service.DecideAsync(request.Id, decision, 2, actor, default));
        Assert.Single(await db.Transactions.ToListAsync());
    }
    [Theory] [InlineData(1)] [InlineData(4)] [InlineData(999)]
    public async Task InvalidRecipientAccountCannotPost(int account)
    { var request = await Create(); await Assert.ThrowsAsync<ResourceNotFoundException>(() => service.DecideAsync(request.Id, "accept", account, 2, default)); Assert.Single(await db.Transactions.ToListAsync()); }
    [Fact] public async Task CurrencyMismatchKeepsPending()
    {
        var request = await Create();
        await Assert.ThrowsAsync<DomainRuleException>(() => service.DecideAsync(request.Id, "accept", 3, 2, default));
        Assert.Equal(InternalTransferRequestStatus.Pending, (await db.InternalTransferRequests.SingleAsync()).Status);
    }
    [Fact] public async Task RevokedOriginalLinkCannotBeRevivedByRelinking()
    {
        var request = await Create();
        var original = await db.UserAccountLinks.SingleAsync(); original.Status = UserAccountLinkStatus.Revoked;
        db.UserAccountLinks.Add(new UserAccountLink { Id = 2, MasterUserId = 1, LinkedUserId = 2, Status = UserAccountLinkStatus.Active });
        await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        Assert.False((await service.GetAsync(2, 1, 10, default)).Data.Single().CanAccept);
        await Assert.ThrowsAsync<ConflictException>(() => service.DecideAsync(request.Id, "accept", 2, 2, default));
        await service.DecideAsync(request.Id, "reject", null, 2, default);
    }
    [Fact] public async Task PendingGuardsUpdateSingleBulkAndAccountCascadeDeletion()
    {
        var request = await Create(); int id = request.MasterTransactionId!.Value;
        await Assert.ThrowsAsync<ConflictException>(() => transactions.UpdateAsync(id, new() { Id = id, AccountId = 1, CategoryId = 1, Amount = -10, Created = Now }, 1));
        await Assert.ThrowsAsync<ConflictException>(() => transactions.DeleteAsync(id, 1));
        await Assert.ThrowsAsync<ConflictException>(() => transactions.DeleteAsync(new[] { id }, 1));
        await Assert.ThrowsAsync<ConflictException>(() => new AccountService(uow, new Clock()).DeleteAsync(1, 1));
        Assert.Single(await db.Transactions.ToListAsync());
    }
    [Fact] public async Task AcceptedPostingsAreIndependentAndHistorySurvivesDeletion()
    {
        var request = await Create(); var accepted = await service.DecideAsync(request.Id, "accept", 2, 2, default); db.ChangeTracker.Clear();
        int id = request.MasterTransactionId!.Value;
        await transactions.UpdateAsync(id, new() { Id = id, AccountId = 1, CategoryId = 1, Amount = -9, Created = Now, Comment = "changed" }, 1); db.ChangeTracker.Clear();
        Assert.Equal(20, (await db.Transactions.SingleAsync(x => x.Id == accepted.LinkedTransactionId)).Value);
        await Assert.ThrowsAsync<ResourceNotFoundException>(() => transactions.DeleteAsync(accepted.LinkedTransactionId!.Value, 1));
        await transactions.DeleteAsync(id, 1); db.ChangeTracker.Clear();
        Assert.Single(await db.Transactions.ToListAsync());
        var history = await db.InternalTransferRequests.SingleAsync();
        Assert.Equal(-20, history.MasterValue); Assert.Equal("shared #travel @friend", history.OriginalComment); Assert.Equal(Now.AddDays(-3), history.OperationDate);
        Assert.Equal(InternalTransferRequestStatus.Accepted, history.Status);
    }
    [Fact] public async Task LegacyManualInternalTransferRemainsOneSided()
    { await transactions.CreateAsync((CreateInternalTransferRequest)Terms, 1); Assert.Single(await db.Transactions.ToListAsync()); Assert.Empty(await db.InternalTransferRequests.ToListAsync()); }

    [Fact] public async Task SubMicrosecondRetryReturnsOriginalCanonicalRequest()
    {
        var terms = Terms with { Created = Now.AddTicks(1234567) }; var created = await Create(terms);
        Assert.Equal(Now.AddTicks(1234560), created.OperationDate);
        Assert.Equal(created.Id, (await service.CreateAsync(terms, 1, default)).Id);
        Assert.Single(await db.Transactions.ToListAsync());
    }
    [Fact] public async Task MaxPageReturnsEmptyWithoutOverflow()
    {
        await Create(); var result = await service.GetAsync(1, int.MaxValue, 50, default);
        Assert.Empty(result.Data); Assert.Equal(1, result.TotalItems);
    }
    private static inex.Services.Models.Records.Account.UpdateAccountRequest AccountUpdate(int currencyId = 1) => new() {
        Id = 1, Key = "master", Name = "Renamed master", Description = "Metadata change", CurrencyId = currencyId, IsEnabled = true, IsFavourite = true
    };
    [Fact] public async Task PendingSourceAccountCurrencyIsFrozenButMetadataIsEditable()
    {
        await Create(); var accounts = new AccountService(uow, new Clock());
        await Assert.ThrowsAsync<ConflictException>(() => accounts.UpdateAsync(1, AccountUpdate(2), 1)); db.ChangeTracker.Clear();
        await accounts.UpdateAsync(1, AccountUpdate(), 1); db.ChangeTracker.Clear();
        var account = await db.Accounts.SingleAsync(x => x.Id == 1 && x.UserId == 1);
        Assert.Equal(1, account.CurrencyId); Assert.Equal("Renamed master", account.Name);
        await Assert.ThrowsAsync<ResourceNotFoundException>(() => accounts.UpdateAsync(1, AccountUpdate(2), 2));
    }
    [Theory] [InlineData("accept", 2)] [InlineData("reject", 2)] [InlineData("cancel", 1)]
    public async Task ResolvedSourceAccountCurrencyCanChangeIndependently(string decision, int actor)
    {
        var request = await Create(); await service.DecideAsync(request.Id, decision, 2, actor, default); db.ChangeTracker.Clear();
        await new AccountService(uow, new Clock()).UpdateAsync(1, AccountUpdate(2), 1); db.ChangeTracker.Clear();
        Assert.Equal(2, (await db.Accounts.SingleAsync(x => x.Id == 1 && x.UserId == 1)).CurrencyId);
        Assert.Equal(1, (await db.InternalTransferRequests.SingleAsync()).CurrencyId);
        Assert.All(await db.Transactions.Where(x => x.UserId == 2).ToListAsync(), posting => Assert.Equal(2, posting.AccountId));
    }
    public void Dispose() => db.Dispose();
}
