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

        int totalCount = items.Count();

        return new TransactionSummaryResponse
        {
            TotalCount = totalCount,
            TypeCounts = new TransactionTypeCounts
            {
                All = totalCount,
                Income = items.Count(i => !i.Category.IsSystem && i.Value >= 0),
                Expense = items.Count(i => !i.Category.IsSystem && i.Value < 0),
                Transfer = items.Count(i => i.Category.IsSystem)
            },
            CurrencySummaries = currencySummaries
        };
    }

    public async Task<CreatedResponse> CreateAsync(CreateTransactionRequest itemDTO, int userId, CancellationToken ct = default)
    {
        await EnsureTransactionRelationsBelongToUserAsync(itemDTO.AccountId, itemDTO.CategoryId, userId, ct);

        Transaction transaction = itemDTO.ToEntity();
        transaction.UserId = userId;
        transaction.CreatedBy = userId;

        transaction = ProcessTagsRefs(transaction, userId);

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

    public async Task<TransactionResponse> UpdateAsync(int id, UpdateTransactionRequest itemDTO, int userId, CancellationToken ct = default)
    {
        if (itemDTO.Id != id)
        {
            throw new ValidationFailedException($"Request body id ({itemDTO.Id}) does not match route id ({id}).");
        }

        // get item to update
        var source = await DbInEx.TransactionRepository
            .GetWithIncludePaths(false, i => i.Id == id && i.UserId == userId, "TransactionTagDetails.Tag")
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Transaction {id} was not found.", "Transaction", id);

        await EnsureTransactionRelationsBelongToUserAsync(itemDTO.AccountId, itemDTO.CategoryId, userId, ct);

        // update item with new details
        source = itemDTO.ApplyTo(source);
        source.UpdatedBy = userId;
        // update tags and refs details
        source = ProcessTagsRefs(source, userId);
        // put information about updated item to the database
        EntityEntry<Transaction> dest = DbInEx.TransactionRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return dest.Entity.ToResponse();
    }

    public override async Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default)
    {
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

        DbInEx.TransactionRepository.Delete(transactions);
        await DbInEx.SaveAsync(ct);
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
                items = items.Where(i => i.Category.IsSystem);
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
            .Where(i => i.UserId == userId && i.Account.UserId == userId && i.Category.UserId == userId);

        items = ApplyActivityMode(items, mode);
        items = ApplyFilters(items, filter);

        return items
            .OrderByDescending(i => i.Created)
            .ThenByDescending(i => i.Id);
    }

    private static IQueryable<Transaction> ApplyActivityMode(IQueryable<Transaction> items, ActivityMode mode) =>
        mode switch
        {
            ActivityMode.ACTIVE => items.Where(i => i.Account.IsEnabled && i.Category.IsEnabled),
            ActivityMode.INACTIVE => items.Where(i => !i.Account.IsEnabled || !i.Category.IsEnabled),
            ActivityMode.ALL => items,
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };

    private Transaction ProcessTagsRefs(Transaction transaction, int userId)
    {
        // parse lists of tags and refs from description based on marker
        IEnumerable<string> tags = (transaction.Comment ?? string.Empty).Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim().ToLower()).Where(i => i.StartsWith("#")).Distinct().Select(i => i.Substring(1));
        IEnumerable<string> refs = (transaction.Comment ?? string.Empty).Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim().ToLower()).Where(i => i.StartsWith("@")).Distinct().Select(i => i.Substring(1));

        // in case tags were found
        if (tags.Any())
        {
            // update transaction with actual items
            UpdateTagRefItems(transaction, tags, TagType.TAG, userId);
        }

        // in case refs were found
        if (refs.Any())
        {
            // update transaction with actual items
            UpdateTagRefItems(transaction, refs, TagType.REF, userId);
        }

        return transaction;
    }

    private void UpdateTagRefItems(Transaction transaction, IEnumerable<string> tags, TagType type, int userId)
    {
        // build a list of tags for a user
        IEnumerable<Tag> tagsUser = DbInEx.TagRepository.Get(true).Where(i => i.UserId == userId && i.Type == type).ToList();
        // build a list of new tags that were added with the transaction
        IEnumerable<Tag> tagsToAdd = tags.Except(tagsUser.Select(i => i.Key.ToLower())).Select(i => new Tag() { Key = i, Name = i, Description = i, Type = type, CreatedBy = userId, UserId = userId });
        // build a full list of tags
        IEnumerable<Tag> tagsAll = tagsUser.Union(tagsToAdd).ToList();

        // find existing transaction tags — guard against null Tag navigation (set when TagId-only items were added earlier in the same request)
        IEnumerable<string> tagsCurrent = transaction.TransactionTagDetails.Select(i => i.Tag).Where(i => i != null && i.Type == type).Select(i => i.Key.ToLower()).ToList();
        // find tags to add to the transaction
        IEnumerable<string> tagsAdd = tags.Except(tagsCurrent);
        // find tags to remove from the transaction
        IEnumerable<string> tagsRemove = tagsCurrent.Except(tags);

        foreach (string item in tagsAdd)
        {
            Tag tag = tagsAll.First(i => i.Key == item);
            if (tag.Id > 0)
            {
                transaction.TransactionTagDetails.Add(new TransactionTagMap() { TagId = tag.Id, CreatedBy = userId });
            }
            else
            {
                transaction.TransactionTagDetails.Add(new TransactionTagMap() { Tag = tag, CreatedBy = userId });
            }
        }

        // remove obsolete tags from the map
        foreach (string item in tagsRemove)
        {
            transaction.TransactionTagDetails.Remove(transaction.TransactionTagDetails.First(i => i.TagId == tagsAll.First(i => i.Key == item).Id));
        }
    }

    private async Task EnsureTransactionRelationsBelongToUserAsync(int accountId, int categoryId, int userId, CancellationToken ct)
    {
        bool accountExists = await DbInEx.AccountRepository
            .Get(true, i => i.Id == accountId && i.UserId == userId)
            .AnyAsync(ct);

        if (!accountExists)
        {
            throw new ResourceNotFoundException($"Account {accountId} was not found.", "Account", accountId);
        }

        bool categoryExists = await DbInEx.CategoryRepository
            .Get(true, i => i.Id == categoryId && i.UserId == userId)
            .AnyAsync(ct);

        if (!categoryExists)
        {
            throw new ResourceNotFoundException($"Category {categoryId} was not found.", "Category", categoryId);
        }
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
