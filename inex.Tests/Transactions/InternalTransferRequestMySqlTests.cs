using inex.Data;
using inex.Data.Models;
using inex.Data.Repositories;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.Time;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
namespace inex.Tests.Transactions;

public sealed class ApprovedTransferMySqlFactAttribute : FactAttribute
{
    public ApprovedTransferMySqlFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("INEX_TRANSFER_MYSQL_APPROVED") != "1" ||
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("INEX_TRANSFER_MYSQL_CONNECTION")))
            Skip = "Requires separately approved disposable MySQL database (see linked-transfer-mysql-verification.md).";
    }
}

/// <summary>Opt-in real-provider verification; never uses the application's configured database.</summary>
public class InternalTransferRequestMySqlTests
{
    private sealed class Clock : IClock { public DateTime UtcNow => DateTime.UtcNow; }
    private sealed class LinkReadGate : DbCommandInterceptor
    {
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM `user_account_link`", StringComparison.Ordinal)) Started.TrySetResult();
            return ValueTask.FromResult(result);
        }
    }
    private static InExDbContext Context(DbCommandInterceptor? interceptor = null)
    {
        string connection = Environment.GetEnvironmentVariable("INEX_TRANSFER_MYSQL_CONNECTION") ?? throw new InvalidOperationException("Missing approved test database.");
        var settings = new MySqlConnectionStringBuilder(connection);
        if (!settings.Database.StartsWith("inex_transfer_verify_", StringComparison.Ordinal) ||
            settings.Database.Length <= "inex_transfer_verify_".Length)
            throw new InvalidOperationException("Use an explicitly approved disposable inex_transfer_verify_* database.");
        var options = new DbContextOptionsBuilder<InExDbContext>().UseMySql(connection, new MySqlServerVersion(new Version(8, 0, 0)));
        if (interceptor is not null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }
    private static InternalTransferRequestService Service(InExDbContext db) => new(new InExUnitOfWork(db), new Clock());

    [ApprovedTransferMySqlFact]
    public async Task MigrationConstraintsAtomicityIdempotencyDecisionsRevocationAndDeletion()
    {
        await using var db = Context();
        // Explicit opt-in above authorizes this operation in a disposable database only.
        await db.Database.MigrateAsync();
        string suffix = Guid.NewGuid().ToString("N");
        var currency = new Currency { Key = suffix[..8], Name = "Transfer verification", Created = DateTime.UtcNow, Updated = DateTime.UtcNow };
        db.Currencies.Add(currency); await db.SaveChangesAsync();
        var master = new AppUser { UserName = "master-" + suffix, NormalizedUserName = "MASTER-" + suffix, CurrencyId = currency.Id };
        var linked = new AppUser { UserName = "linked-" + suffix, NormalizedUserName = "LINKED-" + suffix, CurrencyId = currency.Id };
        db.Users.AddRange(master, linked); await db.SaveChangesAsync();
        var from = new Account { UserId = master.Id, CurrencyId = currency.Id, Key = "from-" + suffix, Name = "Master verification", IsEnabled = true };
        var to = new Account { UserId = linked.Id, CurrencyId = currency.Id, Key = "to-" + suffix, Name = "Linked verification", IsEnabled = true };
        db.Accounts.AddRange(from, to);
        db.Categories.AddRange(new Category { UserId = master.Id, Key = "m-" + suffix, Name = "Master transfer", IsEnabled = true, IsSystem = true, SystemCode = "internal-transfer" },
            new Category { UserId = linked.Id, Key = "l-" + suffix, Name = "Linked transfer", IsEnabled = true, IsSystem = true, SystemCode = "internal-transfer" });
        var link = new UserAccountLink { MasterUserId = master.Id, LinkedUserId = linked.Id, Status = UserAccountLinkStatus.Active, CreatedAt = DateTime.UtcNow };
        db.UserAccountLinks.Add(link); await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        var terms = new CreateLinkedInternalTransferRequest { AccountId = from.Id, LinkedUserId = linked.Id,
            SubmissionKey = Guid.NewGuid().ToString("D"), Amount = 20, Direction = "outgoing", Created = new DateTime(2026, 10, 16).AddTicks(1234567), Comment = "MySQL verification" };
        var created = await Service(db).CreateAsync(terms, master.Id, default); db.ChangeTracker.Clear();
        Assert.Equal(new DateTime(2026, 10, 16).AddTicks(1234560), created.OperationDate);
        Assert.Equal(created.Id, (await Service(db).CreateAsync(terms, master.Id, default)).Id);
        Assert.Equal(1, await db.Transactions.CountAsync(x => x.UserId == master.Id));
        Assert.Equal(0, await db.Transactions.CountAsync(x => x.UserId == linked.Id));

        // A direct duplicate insert must fail at MySQL's unique constraint, not merely in service validation.
        var duplicate = await db.InternalTransferRequests.AsNoTracking().SingleAsync(x => x.Id == created.Id);
        duplicate.Id = 0; duplicate.MasterTransactionId = null; duplicate.MasterTransaction = null;
        db.InternalTransferRequests.Add(duplicate);
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync()); db.ChangeTracker.Clear();
        Assert.Equal(1, await db.InternalTransferRequests.CountAsync(x => x.MasterUserId == master.Id));

        // Concurrent acceptance/rejection: one terminal result, at most one recipient posting, no partial ledger write.
        async Task<string> Decide(string decision)
        {
            await using var context = Context();
            try { return (await Service(context).DecideAsync(created.Id, decision, to.Id, linked.Id, default)).Status; }
            catch (ConflictException) { return "Conflict"; }
        }
        var outcomes = await Task.WhenAll(Task.Run(() => Decide("accept")), Task.Run(() => Decide("reject")));
        db.ChangeTracker.Clear();
        var decided = await db.InternalTransferRequests.AsNoTracking().SingleAsync(x => x.Id == created.Id);
        Assert.NotEqual(InternalTransferRequestStatus.Pending, decided.Status);
        Assert.Contains("Conflict", outcomes);
        Assert.Equal(decided.Status == InternalTransferRequestStatus.Accepted ? 1 : 0,
            await db.Transactions.CountAsync(x => x.UserId == linked.Id));

        // Concurrent accept/accept plus retry must create exactly one opposite posting.
        var acceptTerms = terms with { SubmissionKey = Guid.NewGuid().ToString("D") };
        var acceptRequest = await Service(db).CreateAsync(acceptTerms, master.Id, default); db.ChangeTracker.Clear();
        async Task AcceptOnce()
        {
            await using var context = Context();
            try { await Service(context).DecideAsync(acceptRequest.Id, "accept", to.Id, linked.Id, default); }
            catch (ConflictException) { }
        }
        await Task.WhenAll(Task.Run(AcceptOnce), Task.Run(AcceptOnce));
        db.ChangeTracker.Clear();
        var acceptedOnce = await Service(db).DecideAsync(acceptRequest.Id, "accept", to.Id, linked.Id, default); db.ChangeTracker.Clear();
        Assert.Equal("Accepted", acceptedOnce.Status);
        int expectedRecipientCount = decided.Status == InternalTransferRequestStatus.Accepted ? 2 : 1;
        Assert.Equal(expectedRecipientCount, await db.Transactions.CountAsync(x => x.UserId == linked.Id));

        // Competing duplicate submissions must never produce a second posting; retry resolves any 409 to the same request.
        var duplicateTerms = terms with { SubmissionKey = Guid.NewGuid().ToString("D") };
        async Task<int?> Submit()
        {
            await using var context = Context();
            try { return (await Service(context).CreateAsync(duplicateTerms, master.Id, default)).Id; }
            catch (ConflictException) { return null; }
        }
        await Task.WhenAll(Task.Run(Submit), Task.Run(Submit));
        db.ChangeTracker.Clear();
        var unique = await Service(db).CreateAsync(duplicateTerms, master.Id, default);
        Assert.Single(await db.InternalTransferRequests.Where(x => x.MasterUserId == master.Id && x.SubmissionKey == duplicateTerms.SubmissionKey).ToListAsync());
        Assert.Equal(3, await db.Transactions.CountAsync(x => x.UserId == master.Id));

        var alternateCurrency = new Currency { Key = "X" + suffix[..7], Name = "Alternate verification", Created = DateTime.UtcNow, Updated = DateTime.UtcNow };
        db.Currencies.Add(alternateCurrency); await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        inex.Services.Models.Records.Account.UpdateAccountRequest AccountUpdate(int currencyId) => new() {
            Id = from.Id, Key = "from-" + suffix, Name = "Updated metadata", CurrencyId = currencyId, IsEnabled = true, IsFavourite = true
        };
        var guardedAccounts = new AccountService(new InExUnitOfWork(db), new Clock());
        await Assert.ThrowsAsync<ConflictException>(() => guardedAccounts.UpdateAsync(from.Id, AccountUpdate(alternateCurrency.Id), master.Id)); db.ChangeTracker.Clear();
        await guardedAccounts.UpdateAsync(from.Id, AccountUpdate(currency.Id), master.Id); db.ChangeTracker.Clear();
        Assert.Equal(currency.Id, (await db.Accounts.SingleAsync(x => x.Id == from.Id && x.UserId == master.Id)).CurrencyId);

        // A revocation holding the row lock must win over an acceptance started while it is uncommitted.
        await using (var revoker = Context())
        await using (var revokeTransaction = await revoker.Database.BeginTransactionAsync())
        {
            await revoker.UserAccountLinks.Where(x => x.Id == link.Id && x.MasterUserId == master.Id)
                .ExecuteUpdateAsync(update => update.SetProperty(x => x.Status, UserAccountLinkStatus.Revoked));
            var gate = new LinkReadGate();
            var acceptance = Task.Run(async () => {
                await using var context = Context(gate);
                await Assert.ThrowsAsync<ConflictException>(() => Service(context).DecideAsync(unique.Id, "accept", to.Id, linked.Id, default));
            });
            await gate.Started.Task.WaitAsync(TimeSpan.FromSeconds(10));
            // Give the observed SELECT one scheduling turn to reach MySQL while the exclusive lock is held.
            Assert.NotSame(acceptance, await Task.WhenAny(acceptance, Task.Delay(150)));
            await revokeTransaction.CommitAsync();
            await acceptance;
        }
        db.ChangeTracker.Clear();
        Assert.Equal(InternalTransferRequestStatus.Pending, (await db.InternalTransferRequests.SingleAsync(x => x.Id == unique.Id)).Status);
        var accountService = new AccountService(new InExUnitOfWork(db), new Clock());
        await Assert.ThrowsAsync<ConflictException>(() => accountService.DeleteAsync(from.Id, master.Id)); db.ChangeTracker.Clear();
        await Service(db).DecideAsync(unique.Id, "cancel", null, master.Id, default); db.ChangeTracker.Clear();
        await new TransactionService(new InExUnitOfWork(db)).DeleteAsync(unique.MasterTransactionId!.Value, master.Id); db.ChangeTracker.Clear();
        var history = await db.InternalTransferRequests.SingleAsync(x => x.Id == unique.Id);
        Assert.Null(history.MasterTransactionId); Assert.Equal(-20, history.MasterValue); Assert.Equal(InternalTransferRequestStatus.Cancelled, history.Status);

        await guardedAccounts.UpdateAsync(from.Id, AccountUpdate(alternateCurrency.Id), master.Id); db.ChangeTracker.Clear();
        Assert.Equal(currency.Id, (await db.InternalTransferRequests.SingleAsync(x => x.Id == unique.Id)).CurrencyId);

        // SET NULL must also preserve audit history on account cascades after resolution.
        await new AccountService(new InExUnitOfWork(db), new Clock()).DeleteAsync(from.Id, master.Id); db.ChangeTracker.Clear();
        Assert.Equal(3, await db.InternalTransferRequests.CountAsync(x => x.MasterUserId == master.Id));
        Assert.Equal(expectedRecipientCount, await db.Transactions.CountAsync(x => x.UserId == linked.Id));
    }
}
