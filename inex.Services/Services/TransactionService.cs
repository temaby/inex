using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;
using inex.Services.Models.Enums;
using inex.Services.Helpers;
using inex.Services.Models.Mappers;
using Microsoft.EntityFrameworkCore;

namespace inex.Services.Services;

public class TransactionService : InExService, ITransactionService
{
    #region Constructors

    public TransactionService(IInExUnitOfWork uowInEx) : base(uowInEx)
    {
    }

    #endregion Constructors

    #region Public Interface

    public async Task<TransactionResponse> GetAsync(int id, int userId, CancellationToken ct = default)
    {
        var transaction = await DbInEx.TransactionRepository
            .GetWithIncludePaths(false, i => i.Id == id && i.UserId == userId, "TransactionTagDetails.Tag")
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Transaction {id} was not found.", "Transaction", id);
        return transaction.ToResponse();
    }

    public ListResponse<TransactionResponse> Get(int userId, ActivityMode mode, IDictionary<string, string> filters)
    {
        IQueryable<Transaction> items = GetTransactions(userId, mode, filters);
        return BuildDataResponse<Transaction, TransactionResponse>(items, TransactionMapper.ToResponse);
    }

    public PagedResponse<TransactionResponse, PaginationMetadata> Get(int userId, ActivityMode mode, int pageSize, int pageNumber, IDictionary<string, string> filters)
    {
        IQueryable<Transaction> items = GetTransactions(userId, mode, filters);
        return BuildPaginatedDataResponse<Transaction, TransactionResponse>(items, pageSize, pageNumber, TransactionMapper.ToResponse);
    }

    public PagedResponse<TransactionResponse, PaginationMetadata> Get(int userId, ActivityMode mode, int pageSize, int page, TransactionFilterQuery filter)
    {
        IQueryable<Transaction> items = GetTransactions(userId, mode, filter);
        return BuildPaginatedDataResponse<Transaction, TransactionResponse>(items, pageSize, page, TransactionMapper.ToResponse);
    }

    public TransactionSummaryResponse GetSummary(int userId, ActivityMode mode, TransactionFilterQuery filter)
    {
        IQueryable<Transaction> items = GetTransactions(userId, mode, filter);

        var currencySummaries = items
            .GroupBy(i => i.Account.Currency.Key)
            .Select(group => new TransactionCurrencySummary
            {
                Currency = group.Key,
                Income = group.Sum(i => !i.Category.IsSystem && i.Value >= 0 ? i.Value : 0),
                Expense = group.Sum(i => !i.Category.IsSystem && i.Value < 0 ? i.Value : 0),
                Net = group.Sum(i => !i.Category.IsSystem ? i.Value : 0),
            })
            .OrderBy(summary => summary.Currency)
            .ToList();

        TransactionSummaryScope currentScope = BuildSummaryScope(items, filter.StartDate, filter.EndDate);
        string? type = filter.Type?.Trim().ToLowerInvariant();
        TransactionTypeCounts viewTypeCounts = type is "income" or "expense" or "transfer" or "internaltransfer" or "correction"
            ? BuildTypeCounts(GetTransactions(userId, mode, filter with { Type = "all" }))
            : currentScope.TypeCounts;
        TransactionSummaryScope? previousScope = TryGetComparablePeriod(filter, out DateTime previousStartDate, out DateTime previousEndDate)
            ? BuildSummaryScope(
                GetTransactions(userId, mode, filter with { StartDate = previousStartDate, EndDate = previousEndDate }),
                previousStartDate,
                previousEndDate)
            : null;

        return new TransactionSummaryResponse
        {
            TotalCount = currentScope.TotalCount,
            TypeCounts = currentScope.TypeCounts,
            ViewTypeCounts = viewTypeCounts,
            CurrencySummaries = currencySummaries,
            BaseCurrency = DbInEx.UserRepository
                .Get(true, null, user => user.Currency)
                .Where(user => user.Id == userId)
                .Select(user => user.Currency.Key)
                .Single(),
            CurrentScope = currentScope,
            PreviousScope = previousScope
        };
    }

    public async Task<CreatedResponse> CreateAsync(CreateCorrectionRequest request, int userId, CancellationToken ct = default)
    {
        await GetTransferAccountForUserAsync(request.AccountId, userId, ct);
        Category category = await DbInEx.CategoryRepository
            .Get(true, item => item.UserId == userId && item.IsSystem && item.SystemCode == "correction")
            .SingleOrDefaultAsync(ct)
            ?? throw new DomainRuleException("correction-category-missing", "The correction category is unavailable for this user.");
        Transaction transaction = new()
        {
            AccountId = request.AccountId,
            CategoryId = category.Id,
            UserId = userId,
            CreatedBy = userId,
            Created = request.Created,
            Value = request.Direction == CorrectionDirection.Decrease ? -request.Amount : request.Amount,
            Comment = request.Comment.Trim()
        };
        transaction = TransactionCommentMarkers.Apply(DbInEx, transaction, userId);
        var result = await DbInEx.TransactionRepository.CreateAsync(transaction, ct);
        await DbInEx.SaveAsync(ct);
        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<CreatedResponse> CreateAsync(CreateTransactionRequest itemDTO, int userId, CancellationToken ct = default)
    {
        Category category = await EnsureTransactionRelationsBelongToUserAsync(itemDTO.AccountId, itemDTO.CategoryId, userId, ct);
        if (category.IsSystem)
        {
            throw new DomainRuleException("system-category-transaction-create", "System categories can only be assigned by their dedicated transaction workflows.");
        }

        Transaction transaction = itemDTO.ToEntity();
        transaction.UserId = userId;
        transaction.CreatedBy = userId;

        transaction = TransactionCommentMarkers.Apply(DbInEx, transaction, userId);

        EntityEntry<Transaction> result = await DbInEx.TransactionRepository.CreateAsync(transaction, ct);

        await DbInEx.SaveAsync(ct);

        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<TransferResponse> CreateAsync(CreateTransferRequest itemDTO, int userId, CancellationToken ct = default)
    {
        TransferResponse resultDTO = new TransferResponse();

        Category transferCategory = DbInEx.CategoryRepository.Get(true).First(i => i.UserId == userId && i.SystemCode!.ToLower() == "transfer");

        Account accountFrom = await GetTransferAccountForUserAsync(itemDTO.AccountFromId, userId, ct);
        Account accountTo = await GetTransferAccountForUserAsync(itemDTO.AccountToId, userId, ct);

        TransferFromData transferFrom = itemDTO.ToTransferFromData();
        TransferToData transferTo = itemDTO.ToTransferToData();

        Transaction transactionFrom = transferFrom.ToEntity();
        transactionFrom.UserId = userId;
        transactionFrom.CreatedBy = userId;
        transactionFrom.CategoryId = transferCategory.Id;
        transactionFrom.Comment = $"В {accountTo.Name} {transactionFrom.Comment}";

        Transaction transactionTo = transferTo.ToEntity();
        transactionTo.UserId = userId;
        transactionTo.CreatedBy = userId;
        transactionTo.CategoryId = transferCategory.Id;
        transactionTo.Comment = $"Из {accountFrom.Name} {transactionTo.Comment}";

        EntityEntry<Transaction> resultFrom = await DbInEx.TransactionRepository.CreateAsync(transactionFrom, ct);
        EntityEntry<Transaction> resultTo = await DbInEx.TransactionRepository.CreateAsync(transactionTo, ct);

        await DbInEx.SaveAsync(ct);

        resultDTO.FromId = resultFrom.Entity.Id;
        resultDTO.ToId = resultTo.Entity.Id;

        return resultDTO;
    }

    public async Task<CreatedResponse> CreateAsync(CreateInternalTransferRequest itemDTO, int userId, CancellationToken ct = default)
    {
        await GetTransferAccountForUserAsync(itemDTO.AccountId, userId, ct);

        Category internalTransferCategory = await DbInEx.CategoryRepository
            .Get(true, category => category.UserId == userId && category.IsSystem && category.SystemCode == "internal-transfer")
            .SingleOrDefaultAsync(ct)
            ?? throw new DomainRuleException("internal-transfer-category-missing", "The internal transfer category is unavailable for this user.");

        Transaction transaction = new()
        {
            AccountId = itemDTO.AccountId,
            CategoryId = internalTransferCategory.Id,
            UserId = userId,
            CreatedBy = userId,
            Created = itemDTO.Created,
            Value = InternalTransferDirection.IsOutgoing(itemDTO.Direction) ? -itemDTO.Amount : itemDTO.Amount,
            Comment = itemDTO.Comment
        };

        transaction = TransactionCommentMarkers.Apply(DbInEx, transaction, userId);
        EntityEntry<Transaction> result = await DbInEx.TransactionRepository.CreateAsync(transaction, ct);
        await DbInEx.SaveAsync(ct);

        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<TransactionResponse> UpdateAsync(int id, UpdateTransactionRequest itemDTO, int userId, CancellationToken ct = default)
    {
        await using var atomic = await DbInEx.BeginAtomicAsync(ct);
        if (itemDTO.Id != id)
        {
            throw new ValidationFailedException($"Request body id ({itemDTO.Id}) does not match route id ({id}).");
        }

        // get item to update
        var source = await DbInEx.TransactionRepository
            .GetWithIncludePaths(false, i => i.Id == id && i.UserId == userId, "TransactionTagDetails.Tag", "Category")
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Transaction {id} was not found.", "Transaction", id);

        await EnsureNoPendingRequestsAsync(new[] { id }, userId, ct);

        Category category = await EnsureTransactionRelationsBelongToUserAsync(itemDTO.AccountId, itemDTO.CategoryId, userId, ct);
        if (source.Category.IsSystem != category.IsSystem || (source.Category.IsSystem && source.CategoryId != category.Id))
        {
            throw new DomainRuleException("system-category-transaction-update", "System transactions must retain their system category.");
        }

        if (source.Category.IsSystem && source.Category.SystemCode == "correction")
        {
            var errors = new List<string>();
            if (itemDTO.Amount == 0) errors.Add("amount.not_zero");
            if (itemDTO.Amount < -9999999999.99m || itemDTO.Amount > 9999999999.99m) errors.Add("amount.out_of_range");
            if (decimal.Round(itemDTO.Amount, 2) != itemDTO.Amount) errors.Add("amount.precision");
            if (string.IsNullOrWhiteSpace(itemDTO.Comment)) errors.Add("correction.reason_required");
            if (itemDTO.Comment?.Length > 255) errors.Add("correction.reason_too_long");
            if (errors.Count > 0) throw new ValidationFailedException("Invalid correction.", errors);
        }

        // update item with new details
        source = itemDTO.ApplyTo(source);
        source.UpdatedBy = userId;
        // update tags and refs details
        source = TransactionCommentMarkers.Apply(DbInEx, source, userId);
        // put information about updated item to the database
        EntityEntry<Transaction> dest = DbInEx.TransactionRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);
        await atomic.CommitAsync(ct);

        return dest.Entity.ToResponse();
    }

    public override async Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default)
    {
        await using var atomic = await DbInEx.BeginAtomicAsync(ct);
        var idList = ids.Distinct().ToList();
        var transactions = await DbInEx.TransactionRepository
            .Get(false, i => idList.Contains(i.Id) && i.UserId == userId)
            .ToListAsync(ct);

        if (transactions.Count != idList.Count)
        {
            var notFoundIds = idList.Except(transactions.Select(a => a.Id));
            throw notFoundIds.Count() > 1
            ? new ResourceNotFoundException($"Transactions {string.Join(", ", notFoundIds)} were not found.", "Transaction", notFoundIds)
            : new ResourceNotFoundException($"Transaction {notFoundIds.First()} was not found.", "Transaction", notFoundIds.First());
        }

        await EnsureNoPendingRequestsAsync(idList, userId, ct);
        DbInEx.TransactionRepository.Delete(transactions);
        await DbInEx.SaveAsync(ct);
        await atomic.CommitAsync(ct);
    }

    public static IQueryable<Transaction> ApplyFilters(IQueryable<Transaction> items, IDictionary<string, string> filters)
    {
        IEnumerable<int> accountIds = FilterHelper.GetIntArrayFromFilter(filters, nameof(TransactionResponse.AccountId));
        if (accountIds.Count() > 0)
        {
            items = items.Where(i => accountIds.Contains(i.AccountId));
        }

        IEnumerable<int> categoryIds = FilterHelper.GetIntArrayFromFilter(filters, nameof(TransactionResponse.CategoryId));
        if (categoryIds.Count() > 0)
        {
            items = items.Where(i => categoryIds.Contains(i.CategoryId));
        }

        IEnumerable<string> refs = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionResponse.Refs));
        if (refs.Count() > 0)
        {
            var refList = refs.ToList();
            items = items.Where(t => t.TransactionTagDetails.Any(ttd => ttd.Tag.Type == TagType.REF && refList.Contains(ttd.Tag.Key)));
        }

        IEnumerable<string> tags = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionResponse.Tags));
        if (tags.Count() > 0)
        {
            var tagList = tags.ToList();
            items = items.Where(t => t.TransactionTagDetails.Any(ttd => ttd.Tag.Type == TagType.TAG && tagList.Contains(ttd.Tag.Key)));
        }

        DateTime start = FilterHelper.GetDateTimeFromFilter(filters, "Start");
        if (start > DateTime.MinValue)
        {
            items = items.Where(i => i.Created >= start);
        }

        DateTime end = FilterHelper.GetDateTimeFromFilter(filters, "End");
        if (end > DateTime.MinValue)
        {
            items = items.Where(i => i.Created <= end);
        }

        return items;
    }

    public static IQueryable<Transaction> ApplyFilters(IQueryable<Transaction> items, TransactionFilterQuery filter)
    {
        if (filter.AccountIds is { Length: > 0 } accountIds)
        {
            items = items.Where(i => accountIds.Contains(i.AccountId));
        }

        if (filter.CategoryIds is { Length: > 0 } categoryIds)
        {
            items = items.Where(i => categoryIds.Contains(i.CategoryId));
        }

        if (filter.Tags is { Length: > 0 } tags)
        {
            foreach (string tag in tags)
            {
                string marker = $"#{tag}";
                items = items.Where(i => i.Comment != null && i.Comment.Contains(marker));
            }
        }

        if (filter.Refs is { Length: > 0 } refs)
        {
            foreach (string reference in refs)
            {
                string marker = $"@{reference}";
                items = items.Where(i => i.Comment != null && i.Comment.Contains(marker));
            }
        }

        if (filter.StartDate is DateTime startDate)
        {
            items = items.Where(i => i.Created >= startDate);
        }

        if (filter.EndDate is DateTime endDate)
        {
            items = items.Where(i => i.Created <= endDate);
        }

        switch (filter.Type?.Trim().ToLowerInvariant())
        {
            case "income":
                items = items.Where(i => !i.Category.IsSystem && i.Value >= 0);
                break;
            case "expense":
                items = items.Where(i => !i.Category.IsSystem && i.Value < 0);
                break;
            case "transfer":
                items = items.Where(i => i.Category.IsSystem && i.Category.SystemCode == "transfer");
                break;
            case "correction":
                items = items.Where(i => i.Category.IsSystem && i.Category.SystemCode == "correction");
                break;
            case "internaltransfer":
                items = items.Where(i => i.Category.IsSystem && i.Category.SystemCode == "internal-transfer");
                break;
        }

        string? search = filter.Search?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(search))
        {
            items = items.Where(i =>
                (i.Comment != null && i.Comment.ToLower().Contains(search)) ||
                i.Account.Name.ToLower().Contains(search) ||
                i.Category.Name.ToLower().Contains(search) ||
                (i.Category.ParentCategory != null &&
                    i.Category.ParentCategory.UserId == i.UserId &&
                    i.Category.ParentCategory.Name.ToLower().Contains(search)) ||
                i.Account.Currency.Key.ToLower().Contains(search) ||
                i.TransactionTagDetails.Any(detail =>
                    detail.Tag.UserId == i.UserId && detail.Tag.Key.ToLower().Contains(search)));
        }

        return items;
    }

    #endregion Public Interface

    #region Private Methods

    internal IQueryable<Transaction> GetTransactions(int userId, ActivityMode mode, IDictionary<string, string> filters)
    {
        IQueryable<Transaction> items = ApplyFilters(DbInEx.TransactionRepository
            .GetWithIncludePaths(true, null, "Account.Currency", "Category")
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.Created)
            .ThenByDescending(i => i.Id), filters);

        return mode switch
        {
            ActivityMode.ACTIVE => items.Where(i => i.Account.IsEnabled && i.Category.IsEnabled),
            ActivityMode.INACTIVE => items.Where(i => !i.Account.IsEnabled || !i.Category.IsEnabled),
            ActivityMode.ALL => items,
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };
    }

    internal IQueryable<Transaction> GetTransactions(int userId, ActivityMode mode, TransactionFilterQuery filter)
    {
        IQueryable<Transaction> items = DbInEx.TransactionRepository
            .GetWithIncludePaths(true, null, "Account.Currency", "Category")
            .Where(i => i.UserId == userId);

        items = ApplyActivityMode(items, mode);
        items = ApplyFilters(items, filter);

        return items
            .OrderByDescending(i => i.Created)
            .ThenByDescending(i => i.Id);
    }

    private static TransactionSummaryScope BuildSummaryScope(IQueryable<Transaction> items, DateTime? startDate, DateTime? endDate)
    {
        int totalCount = items.Count();

        var cashFlowBuckets = items
            .Where(item => !item.Category.IsSystem)
            .GroupBy(item => new { Date = item.Created.Date, Currency = item.Account.Currency.Key })
            .Select(group => new TransactionCashFlowBucket
            {
                Date = group.Key.Date,
                Currency = group.Key.Currency,
                Income = group.Sum(item => item.Value >= 0 ? item.Value : 0),
                Expense = group.Sum(item => item.Value < 0 ? item.Value : 0),
                RecordCount = group.Count()
            })
            .OrderBy(bucket => bucket.Date)
            .ThenBy(bucket => bucket.Currency)
            .ToList();

        return new TransactionSummaryScope
        {
            TotalCount = totalCount,
            TypeCounts = BuildTypeCounts(items),
            Period = startDate is not null && endDate is not null
                ? new TransactionSummaryPeriod { StartDate = startDate.Value, EndDate = endDate.Value }
                : null,
            CashFlowBuckets = cashFlowBuckets
        };
    }

    private static TransactionTypeCounts BuildTypeCounts(IQueryable<Transaction> items) => new()
    {
        All = items.Count(),
        Income = items.Count(item => !item.Category.IsSystem && item.Value >= 0),
        Expense = items.Count(item => !item.Category.IsSystem && item.Value < 0),
        Transfer = items.Count(item => item.Category.IsSystem && item.Category.SystemCode == "transfer"),
        Correction = items.Count(item => item.Category.IsSystem && item.Category.SystemCode == "correction"),
        InternalTransfer = items.Count(item => item.Category.IsSystem && item.Category.SystemCode == "internal-transfer")
    };

    private static bool TryGetComparablePeriod(TransactionFilterQuery filter, out DateTime previousStartDate, out DateTime previousEndDate)
    {
        previousStartDate = default;
        previousEndDate = default;

        if (filter.StartDate is not DateTime startDate || filter.EndDate is not DateTime endDate || endDate < startDate)
        {
            return false;
        }

        DateTime startDay = startDate.Date;
        DateTime endDay = endDate.Date;
        bool isWholeMonth = startDay.Day == 1 && endDay == startDay.AddMonths(1).AddDays(-1);
        if (isWholeMonth)
        {
            previousStartDate = startDay.AddMonths(-1);
            previousEndDate = startDay.AddTicks(-1);
            return true;
        }

        int dayCount = (endDay - startDay).Days + 1;
        previousStartDate = startDay.AddDays(-dayCount);
        previousEndDate = startDay.AddTicks(-1);
        return true;
    }

    private static IQueryable<Transaction> ApplyActivityMode(IQueryable<Transaction> items, ActivityMode mode) =>
        mode switch
        {
            ActivityMode.ACTIVE => items.Where(i => i.Account.IsEnabled && i.Category.IsEnabled),
            ActivityMode.INACTIVE => items.Where(i => !i.Account.IsEnabled || !i.Category.IsEnabled),
            ActivityMode.ALL => items,
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };

    private async Task EnsureNoPendingRequestsAsync(IEnumerable<int> ids, int userId, CancellationToken ct)
    {
        if (await DbInEx.InternalTransferRequestRepository.Get(true, request => request.MasterUserId == userId &&
            request.Status == InternalTransferRequestStatus.Pending && request.MasterTransactionId.HasValue &&
            ids.Contains(request.MasterTransactionId.Value)).AnyAsync(ct))
            throw new ConflictException("internal-transfer-pending");
    }

    private async Task<Category> EnsureTransactionRelationsBelongToUserAsync(int accountId, int categoryId, int userId, CancellationToken ct)
    {
        bool accountExists = await DbInEx.AccountRepository
            .Get(true, i => i.Id == accountId && i.UserId == userId)
            .AnyAsync(ct);

        if (!accountExists)
        {
            throw new ResourceNotFoundException($"Account {accountId} was not found.", "Account", accountId);
        }

        Category? category = await DbInEx.CategoryRepository
            .Get(true, i => i.Id == categoryId && i.UserId == userId)
            .SingleOrDefaultAsync(ct);

        if (category is null)
        {
            throw new ResourceNotFoundException($"Category {categoryId} was not found.", "Category", categoryId);
        }

        return category;
    }

    private async Task<Account> GetTransferAccountForUserAsync(int accountId, int userId, CancellationToken ct)
    {
        return await DbInEx.AccountRepository
            .Get(true, i => i.Id == accountId && i.UserId == userId)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Account {accountId} was not found.", "Account", accountId);
    }

    #endregion Private Methods
}
