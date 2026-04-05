using AutoMapper;
using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class AccountService : InExService, IAccountService
{
    #region Constructors

    public AccountService(IInExUnitOfWork uowInEx, IMapper mapper) : base(uowInEx, mapper)
    {

    }

    #endregion Constructors

    #region Public Interface

    public async Task<AccountDetailsDTO> GetAsync(int id, CancellationToken ct = default)
    {
        var account = await DbInEx.AccountRepository.GetAsync(id, ct)
            ?? throw new ResourceNotFoundException($"Account {id} was not found.", "Account", id);
        return Mapper.Map<AccountDetailsDTO>(account);
    }

    public ListResponse<AccountDetailsDTO> Get(int userId, ActivityMode mode)
    {
        IQueryable<Account> items = DbInEx.AccountRepository.Get(false, null, i => i.Currency).Where(i => i.UserId == userId).OrderBy(i => i.Name);
        return mode switch
        {
            ActivityMode.ACTIVE => BuildDataResponse<Account, AccountDetailsDTO>(items.Where(i => i.IsEnabled)),
            ActivityMode.INACTIVE => BuildDataResponse<Account, AccountDetailsDTO>(items.Where(i => !i.IsEnabled)),
            ActivityMode.ALL => BuildDataResponse<Account, AccountDetailsDTO>(items),
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };
    }

    public ListResponse<AccountListDetailsDTO> GetDetails(int userId, IEnumerable<int> ids)
    {
        IQueryable<Account> items = DbInEx.AccountRepository.Get(false, null, i => i.Currency).Where(i => i.UserId == userId && ids.Contains(i.Id)).OrderBy(i => i.Name);
        var accountDetails = DbInEx.TransactionRepository.Get(true).Where(i => ids.Contains(i.AccountId)).GroupBy(i => i.AccountId).Select(i => new { AccountId = i.Key, Value = i.Sum(j => j.Value) });
        ListResponse<AccountListDetailsDTO> resultDTO = BuildDataResponse<Account, AccountListDetailsDTO>(items);
        var values = accountDetails.ToDictionary(i => i.AccountId, i => i.Value);
        return resultDTO with
        {
            Data = resultDTO.Data.Select(item => item with { Value = values.GetValueOrDefault(item.Id) })
        };
    }

    public async Task<CreatedResponse> CreateAsync(AccountCreateDTO itemDTO, int userId, CancellationToken ct = default)
    {
        // create an item
        Account account = Mapper.Map<Account>(itemDTO);
        account.UserId = userId;
        account.CreatedBy = userId;
        // put information about created item to the database
        EntityEntry<Account> result = await DbInEx.AccountRepository.CreateAsync(account, ct);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<AccountDetailsDTO> UpdateAsync(int id, AccountUpdateDTO itemDTO, int userId, CancellationToken ct = default)
    {
        if (itemDTO.Id != id)
        {
            throw new ValidationFailedException($"Request body id ({itemDTO.Id}) does not match route id ({id}).");
        }

        // get item to update
        var source = await DbInEx.AccountRepository.GetAsync(id, ct)
            ?? throw new ResourceNotFoundException($"Account {id} was not found.", "Account", id);
        // update item with new details
        source = Mapper.Map(itemDTO, source);
        source.UpdatedBy = userId;
        // put information about updated item to the database
        EntityEntry<Account> dest = DbInEx.AccountRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return Mapper.Map<AccountDetailsDTO>(dest.Entity);
    }

    public override async Task DeleteAsync(IEnumerable<int> ids, CancellationToken ct = default)
    {
        DbInEx.AccountRepository.Delete(DbInEx.AccountRepository.Get(false).Where(i => ids.Contains(i.Id)));
        await DbInEx.SaveAsync(ct);
    }

    #endregion Public Interface
}
