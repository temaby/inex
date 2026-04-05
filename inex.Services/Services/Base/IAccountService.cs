using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IAccountService : IInExService
{
    Task<AccountDetailsDTO> GetAsync(int id, CancellationToken ct = default);
    ListResponse<AccountDetailsDTO> Get(int userId, ActivityMode mode);
    ListResponse<AccountListDetailsDTO> GetDetails(int userId, IEnumerable<int> ids);
    Task<CreatedResponse> CreateAsync(AccountCreateDTO itemDTO, int userId, CancellationToken ct = default);
    Task<AccountDetailsDTO> UpdateAsync(int id, AccountUpdateDTO itemDTO, int userId, CancellationToken ct = default);
}