using inex.Services.Models.Enums;
using inex.Services.Models.Records.Account;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IAccountService : IInExService
{
    Task<AccountResponse> GetAsync(int id, int userId, CancellationToken ct = default);
    ListResponse<AccountResponse> Get(int userId, ActivityMode mode);
    ListResponse<AccountSummary> GetDetails(int userId, IEnumerable<int> ids);
    Task<CreatedResponse> CreateAsync(CreateAccountRequest itemDTO, int userId, CancellationToken ct = default);
    Task<AccountResponse> UpdateAsync(int id, UpdateAccountRequest itemDTO, int userId, CancellationToken ct = default);
    Task DeleteAsync(int id, int userId, CancellationToken ct = default);
    Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default);
}
