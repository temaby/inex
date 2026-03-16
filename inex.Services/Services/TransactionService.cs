using AutoMapper;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Models.Exceptions;
using inex.Services.Models.Exceptions.Base;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Models.Records.Transaction;
using inex.Services.Services.Base;
using inex.Services.Models.Enums;
using inex.Services.Helpers;

namespace inex.Services.Services;

public class TransactionService : InExService, ITransactionService
{
    #region Constructors

    public TransactionService(IInExUnitOfWork uowInEx, IMapper mapper) : base(uowInEx, mapper)
    {
    }

    #endregion Constructors

    #region Public Interface

    public async Task<TransactionDetailsDTO> GetAsync(int id)
    {
        var transaction = await DbInEx.TransactionRepository.GetAsync(id)
            ?? throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.NotFound, MessageSeverity.Error) });
        return Mapper.Map<TransactionDetailsDTO>(transaction);
    }

    public ResponseDataDTO<TransactionDetailsDTO> Get(int userId, ActivityMode mode, IDictionary<string, string> filters)
    {
        IQueryable<Transaction> items = GetTransactions(userId, mode, filters);
        return BuildDataResponse<Transaction, TransactionDetailsDTO>(items);
    }

    public ResponseDataExDTO<TransactionDetailsDTO, PaginationMetadataDTO> Get(int userId, ActivityMode mode, int pageSize, int pageNumber, IDictionary<string, string> filters)
    {
        IQueryable<Transaction> items = GetTransactions(userId, mode, filters);
        return BuildPaginatedDataResponse<Transaction, TransactionDetailsDTO>(items, pageSize, pageNumber);
    }

    public async Task<ResponseCreateDTO> CreateAsync(TransactionCreateDTO itemDTO, int userId)
    {
        ResponseCreateDTO resultDTO = new ResponseCreateDTO();

        Transaction transaction = Mapper.Map<Transaction>(itemDTO);
        transaction.UserId = userId;
        transaction.CreatedBy = userId;

        transaction = ProcessTagsRefs(transaction, userId);

        EntityEntry<Transaction> result = await DbInEx.TransactionRepository.CreateAsync(transaction);

        await DbInEx.SaveAsync();

        return resultDTO with { Id = result.Entity.Id };
    }

    public async Task<ResponseTransferDTO> CreateAsync(TransferCreateDTO itemDTO, int userId)
    {
        ResponseTransferDTO resultDTO = new ResponseTransferDTO();

        Category transferCategory = DbInEx.CategoryRepository.Get(true).First(i => i.SystemCode!.ToLower() == "transfer");

        Account accountFrom = DbInEx.AccountRepository.Get(true).First(i => i.Id == itemDTO.AccountFromId);
        Account accountTo = DbInEx.AccountRepository.Get(true).First(i => i.Id == itemDTO.AccountToId);

        TransferFromCreateDTO transferFrom = Mapper.Map<TransferFromCreateDTO>(itemDTO);
        TransferToCreateDTO transferTo = Mapper.Map<TransferToCreateDTO>(itemDTO);

        Transaction transactionFrom = Mapper.Map<Transaction>(transferFrom);
        transactionFrom.UserId = userId;
        transactionFrom.CreatedBy = userId;
        transactionFrom.Comment = $"В {accountTo.Name} {transactionFrom.Comment}";

        Transaction transactionTo = Mapper.Map<Transaction>(transferTo);
        transactionTo.UserId = userId;
        transactionTo.CreatedBy = userId;
        transactionTo.Comment = $"Из {accountFrom.Name} {transactionTo.Comment}";

        EntityEntry<Transaction> resultFrom = await DbInEx.TransactionRepository.CreateAsync(transactionFrom);
        EntityEntry<Transaction> resultTo = await DbInEx.TransactionRepository.CreateAsync(transactionTo);

        await DbInEx.SaveAsync();

        resultDTO.FromId = resultFrom.Entity.Id;
        resultDTO.ToId = resultTo.Entity.Id;

        return resultDTO;
    }

    public async Task<TransactionDetailsDTO> UpdateAsync(int id, TransactionUpdateDTO itemDTO, int userId)
    {
        // check update details are valid
        if (itemDTO.Id != id)
        {
            throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.DataInvalid, MessageSeverity.Error) });
        }

        // get item to update
        var source = await DbInEx.TransactionRepository.GetAsync(id)
            ?? throw new InExException(new List<IMessage>() { new InExMessage(MessageCode.NotFound, MessageSeverity.Error) });
            
        // update item with new details
        source = Mapper.Map(itemDTO, source);
        source.UpdatedBy = userId;
        // update tags and refs details
        source = ProcessTagsRefs(source, userId);
        // put information about updated item to the database
        EntityEntry<Transaction> dest = DbInEx.TransactionRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync();

        return Mapper.Map<TransactionDetailsDTO>(dest.Entity);
    }

    public override async Task DeleteAsync(IEnumerable<int> ids)
    {
        DbInEx.TransactionRepository.Delete(DbInEx.TransactionRepository.Get(false).Where(i => ids.Contains(i.Id)));
        await DbInEx.SaveAsync();
    }

    public async Task ImportFenturyTransactionsAsync(IEnumerable<TransactionFenturyCSVRecordDTO> transactions, int userId)
    {
        IEnumerable<Currency> currensiesExisting = DbInEx.CurrencyRepository.Get(true).ToList();

        IEnumerable<string> categoriesToImport = transactions.Select(i => i.Category).Distinct();
        IEnumerable<string> categoriesExisting = DbInEx.CategoryRepository.Get(true).Where(i => i.UserId == userId).Select(i => i.Key);
        IEnumerable<Category> categoriesToAdd = categoriesToImport.Except(categoriesExisting).Select(i => new Category() { Key = i, Name = i, Description = i, IsEnabled = true, IsSystem = false, CreatedBy = userId, UserId = userId });
        DbInEx.CategoryRepository.Create(categoriesToAdd);
        await DbInEx.BulkSaveAsync(c_batchSize);

        IDictionary<string, string> accountsToImport = transactions.Select(i => new { i.Account, i.Currency }).Distinct().ToDictionary(i => i.Account, i => i.Currency);
        IEnumerable<string> accountsExisting = DbInEx.AccountRepository.Get(true).Where(i => i.UserId == userId).Select(i => i.Key);
        IEnumerable<Account> accountsToAdd = accountsToImport.Keys.Except(accountsExisting).Select(i => new Account() { Key = i, Name = i, Description = i, IsEnabled = true, CurrencyId = currensiesExisting.First(j => j.Key == accountsToImport[i]).Id, CreatedBy = userId, UserId = userId });
        DbInEx.AccountRepository.Create(accountsToAdd);
        await DbInEx.BulkSaveAsync(c_batchSize);

        IEnumerable<string> tagsToImport = transactions.Select(i => i.Tags).Distinct().SelectMany(i => (i ?? string.Empty).Split(",").Select(i => i.Trim()));
        IEnumerable<string> tagsExisting = DbInEx.TagRepository.Get(true).Where(i => i.UserId == userId && i.Type == TagType.TAG).Select(i => i.Key);
        IEnumerable<Tag> tagsToAdd = tagsToImport.Except(tagsExisting).Select(i => new Tag() { Key = i, Name = i, Description = i, Type = TagType.TAG, CreatedBy = userId, UserId = userId });
        DbInEx.TagRepository.Create(tagsToAdd);
        await DbInEx.BulkSaveAsync(c_batchSize);

        IEnumerable<string> refsToImport = transactions.Select(i => i.Description).Distinct().SelectMany(i => (i ?? string.Empty).Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim()).Where(i => i.StartsWith("@")).Distinct()).Select(i => i.Substring(1));
        IEnumerable<string> refsExisting = DbInEx.TagRepository.Get(true).Where(i => i.UserId == userId && i.Type == TagType.REF).Select(i => i.Key).Select(i => i.Substring(1));
        IEnumerable<Tag> refsToAdd = refsToImport.Except(refsExisting).Select(i => new Tag() { Key = i, Name = i, Description = i, Type = TagType.REF, CreatedBy = userId, UserId = userId });
        DbInEx.TagRepository.Create(refsToAdd);
        await DbInEx.BulkSaveAsync(c_batchSize);

        DbInEx.TransactionRepository.Delete(DbInEx.TransactionRepository.Get(false));
        await DbInEx.BulkSaveAsync(c_batchSize);

        IEnumerable<Category> categories = DbInEx.CategoryRepository.Get(true).Where(i => i.UserId == userId).ToList();
        IEnumerable<Account> accounts = DbInEx.AccountRepository.Get(true).Where(i => i.UserId == userId).ToList();
        IEnumerable<Tag> tags = DbInEx.TagRepository.Get(true).Where(i => i.UserId == userId).ToList();

        IList<Transaction> transactionsToAdd = new List<Transaction>();

        foreach (TransactionFenturyCSVRecordDTO t in transactions)
        {
            Transaction transactionAdd = new Transaction()
            {
                UserId = userId,
                CategoryId = categories.First(i => i.Key == t.Category).Id,
                AccountId = accounts.First(i => i.Key == t.Account).Id,
                CreatedBy = userId,
                Value = t.Amount,
                Created = t.Date,
                Comment = t.Description
            };

            foreach (string tag in (t.Tags ?? string.Empty).Split(",", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim()))
            {
                transactionAdd.TransactionTagDetails.Add(new TransactionTagMap() { TagId = tags.First(i => i.Key == tag && i.Type == TagType.TAG).Id, CreatedBy = userId });
            }

            foreach (string tag in (t.Description ?? string.Empty).Split(" ", StringSplitOptions.RemoveEmptyEntries).Select(i => i.Trim()).Where(i => i.StartsWith("@")).Distinct().Select(i => i.Substring(1)))
            {
                transactionAdd.TransactionTagDetails.Add(new TransactionTagMap() { TagId = tags.First(i => i.Key == tag && i.Type == TagType.REF).Id, CreatedBy = userId });
            }

            transactionsToAdd.Add(transactionAdd);
        }

        await DbInEx.TransactionRepository.CreateAsync(transactionsToAdd);
        await DbInEx.BulkSaveAsync(c_batchSize);
    }

    public static IQueryable<Transaction> ApplyFilters(IQueryable<Transaction> items, IDictionary<string, string> filters)
    {
        IEnumerable<int> accountIds = FilterHelper.GetIntArrayFromFilter(filters, nameof(TransactionDetailsDTO.AccountId));
        if (accountIds.Count() > 0)
        {
            items = items.Where(i => accountIds.Contains(i.AccountId));
        }

        IEnumerable<int> categoryIds = FilterHelper.GetIntArrayFromFilter(filters, nameof(TransactionDetailsDTO.CategoryId));
        if (categoryIds.Count() > 0)
        {
            items = items.Where(i => categoryIds.Contains(i.CategoryId));
        }

        IEnumerable<string> refs = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionDetailsDTO.Refs));
        if (refs.Count() > 0)
        {
            IEnumerable<string> markedRefs = refs.Select(i => $"@{i}").ToList();
            items = items.AsEnumerable().Where(i => markedRefs.Any(markedRef => i.Comment != null && i.Comment.Contains(markedRef))).AsQueryable();
        }

        IEnumerable<string> tags = FilterHelper.GetStringArrayFromFilter(filters, nameof(TransactionDetailsDTO.Tags));
        if (tags.Count() > 0)
        {
            IList<string> markedTags = tags.Select(i => $"#{i}").ToList();
            items = items.AsEnumerable().Where(i => markedTags.Any(markedTag => i.Comment != null && i.Comment.Contains(markedTag))).AsQueryable();
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

    #endregion Public Interface

    #region Private Methods

    internal IQueryable<Transaction> GetTransactions(int userId, ActivityMode mode, IDictionary<string, string> filters)
    {
        IQueryable<Transaction> items = ApplyFilters(DbInEx.TransactionRepository.Get(false, null, i => i.Account, i => i.Category).Where(i => i.UserId == userId).OrderByDescending(i => i.Created).ThenByDescending(i => i.Id), filters);

        return mode switch
        {
            ActivityMode.ACTIVE => items.Where(i => i.Account.IsEnabled && i.Category.IsEnabled),
            ActivityMode.INACTIVE => items.Where(i => !i.Account.IsEnabled || !i.Category.IsEnabled),
            ActivityMode.ALL => items,
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };
    }

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

        // find existing transaction tags
        IEnumerable<string> tagsCurrent = transaction.TransactionTagDetails.Select(i => i.Tag).Where(i => i.Type == type).Select(i => i.Key.ToLower()).ToList();
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

    #endregion Private Methods
}

