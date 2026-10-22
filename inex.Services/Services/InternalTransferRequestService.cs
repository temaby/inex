using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Infrastructure.Time;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using RequestEntity = inex.Data.Models.InternalTransferRequest;
namespace inex.Services.Services;

public sealed class InternalTransferRequestService(IInExUnitOfWork uow, IClock clock) : InExService(uow), IInternalTransferRequestService
{
    public async Task<InternalTransferRequestResponse> CreateAsync(CreateLinkedInternalTransferRequest request, int userId, CancellationToken ct)
    {
        try
        {
            await using var atomic = await DbInEx.BeginAtomicAsync(ct);
            string key = Guid.Parse(request.SubmissionKey).ToString("D");
            var operationDate = InternalTransferRequestPolicy.NormalizeOperationDate(request.Created);
            var existing = await DbInEx.InternalTransferRequestRepository.Get(true,
                x => x.MasterUserId == userId && x.SubmissionKey == key).SingleOrDefaultAsync(ct);
            if (existing is not null)
            {
                if (existing.LinkedUserId != request.LinkedUserId || existing.OriginalAccountId != request.AccountId ||
                    existing.OperationDate != operationDate || existing.MasterValue != SignedValue(request) || existing.OriginalComment != request.Comment)
                    throw new ConflictException("internal-transfer-submission-conflict");
                return Map(existing, false);
            }
            var link = await DbInEx.UserAccountLinkRepository.Get(true, x => x.MasterUserId == userId &&
                x.LinkedUserId == request.LinkedUserId && x.Status == UserAccountLinkStatus.Active, x => x.MasterUser, x => x.LinkedUser).SingleOrDefaultAsync(ct)
                ?? throw new ResourceNotFoundException("internal-transfer-link-unavailable");
            var account = await AccountAsync(request.AccountId, userId, ct);
            var category = await CategoryAsync(userId, ct);
            var posting = new Transaction {
                UserId = userId, CreatedBy = userId, AccountId = account.Id, CategoryId = category.Id,
                Created = operationDate, Value = SignedValue(request), Comment = request.Comment
            };
            var entity = new RequestEntity {
                MasterUserId = userId, LinkedUserId = link.LinkedUserId, LinkId = link.Id,
                MasterUsername = link.MasterUser.UserName ?? string.Empty, LinkedUsername = link.LinkedUser.UserName ?? string.Empty,
                SubmissionKey = key, OriginalAccountId = account.Id, CurrencyId = account.CurrencyId,
                Currency = account.Currency.Key, MasterValue = posting.Value, OperationDate = posting.Created,
                OriginalComment = posting.Comment, MasterTransaction = TransactionCommentMarkers.Apply(DbInEx, posting, userId), RequestedAt = clock.UtcNow,
                Created = clock.UtcNow, Updated = clock.UtcNow, CreatedBy = userId
            };
            await DbInEx.InternalTransferRequestRepository.CreateAsync(entity, ct);
            await DbInEx.SaveAsync(ct);
            await atomic.CommitAsync(ct);
            return Map(entity, false);
        }
        catch (Exception ex) when (IsPersistenceConflict(ex)) { throw new ConflictException("internal-transfer-concurrent-change"); }
    }

    public async Task<InternalTransferRequestPage> GetAsync(int userId, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize, 1, 50);
        var query = DbInEx.InternalTransferRequestRepository.Get(true, x => x.MasterUserId == userId || x.LinkedUserId == userId);
        int total = await query.CountAsync(ct);
        int pending = await query.CountAsync(x => x.Status == InternalTransferRequestStatus.Pending, ct);
        long offset = ((long)page - 1) * pageSize;
        var entities = offset >= total ? new List<RequestEntity>() :
            await query.OrderBy(x => x.Status).ThenByDescending(x => x.Id).Skip((int)offset).Take(pageSize).ToListAsync(ct);
        var links = await DbInEx.UserAccountLinkRepository.Get(true, x => x.LinkedUserId == userId && x.Status == UserAccountLinkStatus.Active)
            .Select(x => x.Id).ToListAsync(ct);
        return new(entities.Select(x => Map(x, x.LinkedUserId == userId && links.Contains(x.LinkId))), total, pending, page, pageSize);
    }

    public async Task<InternalTransferRequestResponse> DecideAsync(int id, string decision, int? accountId, int userId, CancellationToken ct)
    {
        try
        {
            await using var atomic = await DbInEx.BeginAtomicAsync(ct);
            bool cancel = decision == "cancel";
            var entity = await DbInEx.InternalTransferRequestRepository.Get(false, x => x.Id == id &&
                (cancel ? x.MasterUserId == userId : x.LinkedUserId == userId)).SingleOrDefaultAsync(ct)
                ?? throw new ResourceNotFoundException("internal-transfer-request-unavailable");
            var target = decision switch {
                "accept" => InternalTransferRequestStatus.Accepted,
                "reject" => InternalTransferRequestStatus.Rejected,
                "cancel" => InternalTransferRequestStatus.Cancelled,
                _ => throw new ValidationFailedException("decision.invalid")
            };
            if (entity.Status != InternalTransferRequestStatus.Pending)
            {
                if (entity.Status == target && (target != InternalTransferRequestStatus.Accepted || entity.AcceptedAccountId == accountId))
                    return Map(entity, false);
                throw new ConflictException("internal-transfer-already-decided");
            }
            if (target == InternalTransferRequestStatus.Accepted)
            {
                bool active = await DbInEx.UserAccountLinkRepository.Get(true, link => link.Id == entity.LinkId &&
                    link.MasterUserId == entity.MasterUserId && link.LinkedUserId == userId && link.Status == UserAccountLinkStatus.Active).AnyAsync(ct);
                if (!active) throw new ConflictException("internal-transfer-link-unavailable");
                var account = await AccountAsync(accountId ?? 0, userId, ct);
                if (account.CurrencyId != entity.CurrencyId) throw new DomainRuleException("internal-transfer-currency-mismatch", "The account must use the original currency.");
                var category = await CategoryAsync(userId, ct);
                var posting = new Transaction {
                    UserId = userId, CreatedBy = userId, AccountId = account.Id, CategoryId = category.Id,
                    Created = entity.OperationDate, Value = -entity.MasterValue, Comment = entity.OriginalComment
                };
                await DbInEx.TransactionRepository.CreateAsync(TransactionCommentMarkers.Apply(DbInEx, posting, userId), ct);
                entity.LinkedTransaction = posting;
                entity.AcceptedAccountId = account.Id;
            }
            entity.Status = target; entity.DecidedAt = clock.UtcNow; entity.DecidedBy = userId;
            entity.Version = Guid.NewGuid(); entity.Updated = clock.UtcNow; entity.UpdatedBy = userId;
            await DbInEx.SaveAsync(ct);
            await atomic.CommitAsync(ct);
            return Map(entity, false);
        }
        catch (Exception ex) when (IsPersistenceConflict(ex)) { throw new ConflictException("internal-transfer-concurrent-change"); }
    }

    public override Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default) =>
        throw new OperationNotSupportedException("Transfer request history cannot be deleted.");

    private async Task<Account> AccountAsync(int id, int userId, CancellationToken ct) =>
        await DbInEx.AccountRepository.Get(true, x => x.Id == id && x.UserId == userId && x.IsEnabled, x => x.Currency).SingleOrDefaultAsync(ct)
        ?? throw new ResourceNotFoundException("internal-transfer-account-unavailable");
    private async Task<Category> CategoryAsync(int userId, CancellationToken ct) =>
        await DbInEx.CategoryRepository.Get(true, x => x.UserId == userId && x.IsSystem && x.IsEnabled && x.SystemCode == "internal-transfer").SingleOrDefaultAsync(ct)
        ?? throw new DomainRuleException("internal-transfer-category-missing", "The internal transfer category is unavailable.");
    private static decimal SignedValue(CreateLinkedInternalTransferRequest request) => InternalTransferDirection.IsOutgoing(request.Direction) ? -request.Amount : request.Amount;
    private static InternalTransferRequestResponse Map(RequestEntity x, bool active) => new(x.Id, x.MasterUserId, x.LinkedUserId,
        x.MasterUsername, x.LinkedUsername, x.Status.ToString(), x.MasterValue, x.Currency, x.OperationDate, x.OriginalComment, x.MasterTransactionId,
        x.LinkedTransactionId, x.RequestedAt, x.DecidedAt, x.DecidedBy, active && x.Status == InternalTransferRequestStatus.Pending);
    private static bool IsPersistenceConflict(Exception ex) => ex is DbUpdateConcurrencyException ||
        ex is MySqlException { Number: 1062 or 1213 or 1205 } || (ex.InnerException is not null && IsPersistenceConflict(ex.InnerException));
}
