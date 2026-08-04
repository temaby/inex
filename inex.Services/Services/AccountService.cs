using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Models.Mappers;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Infrastructure.Time;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class AccountService : InExService, IAccountService
{
    #region Constructors

    public AccountService(IInExUnitOfWork uowInEx, IClock clock) : base(uowInEx)
    {
        _clock = clock;
    }

    #endregion Constructors

    #region Public Interface

    public async Task<AccountResponse> GetAsync(int id, int userId, CancellationToken ct = default)
    {
        var account = await DbInEx.AccountRepository
            .Get(false, i => i.Id == id && i.UserId == userId, i => i.Currency)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Account {id} was not found.", "Account", id);
        return account.ToResponse();
    }

    public ListResponse<AccountResponse> Get(int userId, ActivityMode mode)
    {
        IQueryable<Account> items = DbInEx.AccountRepository.Get(true, null, i => i.Currency).Where(i => i.UserId == userId).OrderBy(i => i.Name);
        return mode switch
        {
            ActivityMode.ACTIVE => BuildDataResponse<Account, AccountResponse>(items.Where(i => i.IsEnabled), AccountMapper.ToResponse),
            ActivityMode.INACTIVE => BuildDataResponse<Account, AccountResponse>(items.Where(i => !i.IsEnabled), AccountMapper.ToResponse),
            ActivityMode.ALL => BuildDataResponse<Account, AccountResponse>(items, AccountMapper.ToResponse),
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };
    }

    public ListResponse<AccountSummary> GetDetails(int userId, IEnumerable<int> ids)
    {
        var now = _clock.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        IQueryable<Account> items = DbInEx.AccountRepository.Get(true, null, i => i.Currency)
            .Where(i => i.UserId == userId && i.IsEnabled && ids.Contains(i.Id))
            .OrderBy(i => i.Name);

        var accountDetails = DbInEx.TransactionRepository.Get(true)
            .Where(i => i.UserId == userId && ids.Contains(i.AccountId))
            .GroupBy(i => i.AccountId)
            .Select(i => new
            {
                AccountId = i.Key,
                Value = i.Sum(j => j.Value),
                ThisMonthNet = i.Sum(j => j.Created >= monthStart && j.Created < monthEnd ? j.Value : (decimal)0)
            });

        ListResponse<AccountSummary> resultDTO = BuildDataResponse<Account, AccountSummary>(items, AccountMapper.ToSummary);
        var lookup = accountDetails.ToDictionary(i => i.AccountId);

        return resultDTO with
        {
            Data = resultDTO.Data.Select(item => item with
            {
                Value = lookup.TryGetValue(item.Id, out var d) ? d.Value : 0,
                ThisMonthNet = lookup.TryGetValue(item.Id, out var d2) ? d2.ThisMonthNet : 0
            })
        };
    }

    public async Task<CreatedResponse> CreateAsync(CreateAccountRequest itemDTO, int userId, CancellationToken ct = default)
    {
        // create an item
        Account account = itemDTO.ToEntity();
        account.UserId = userId;
        account.CreatedBy = userId;
        // put information about created item to the database
        EntityEntry<Account> result = await DbInEx.AccountRepository.CreateAsync(account, ct);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<AccountResponse> UpdateAsync(int id, UpdateAccountRequest itemDTO, int userId, CancellationToken ct = default)
    {
        if (itemDTO.Id != id)
        {
            throw new ValidationFailedException($"Request body id ({itemDTO.Id}) does not match route id ({id}).");
        }

        // get item to update
        var source = await DbInEx.AccountRepository
            .Get(false, i => i.Id == id && i.UserId == userId, i => i.Currency)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Account {id} was not found.", "Account", id);
        // update item with new details
        source = itemDTO.ApplyTo(source);
        source.UpdatedBy = userId;
        // put information about updated item to the database
        EntityEntry<Account> dest = DbInEx.AccountRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return dest.Entity.ToResponse();
    }

    public override async Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default)
    {
        var idList = ids.Distinct().ToList();
        var accounts = await DbInEx.AccountRepository
            .Get(false, i => idList.Contains(i.Id) && i.UserId == userId)
            .ToListAsync(ct);

        if (accounts.Count != idList.Count)
        {
            var notFoundIds = idList.Except(accounts.Select(a => a.Id));
            throw notFoundIds.Count() > 1
            ? new ResourceNotFoundException($"Accounts {string.Join(", ", notFoundIds)} were not found.", "Account", notFoundIds)
            : new ResourceNotFoundException($"Account {notFoundIds.First()} was not found.", "Account", notFoundIds.First());
        }

        DbInEx.AccountRepository.Delete(accounts);
        await DbInEx.SaveAsync(ct);
    }

    #endregion Public Interface

    private readonly IClock _clock;
}
