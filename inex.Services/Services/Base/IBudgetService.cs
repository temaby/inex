using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Budget;
using inex.Services.Models.Records.Data;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IBudgetService : IInExService
{
    Task<BudgetResponse> GetAsync(int id, int userId, CancellationToken ct = default);
    ListResponse<BudgetResponse> Get(int userId, int? year = null, int? month = null);
    Task<CreatedResponse> CreateAsync(CreateBudgetRequest itemDTO, int userId, CancellationToken ct = default);
    Task<BudgetResponse> UpdateAsync(int id, UpdateBudgetRequest itemDTO, int userId, CancellationToken ct = default);
    Task CopyBudgetsAsync(int userId, int sourceYear, int sourceMonth, int targetYear, int targetMonth, CancellationToken ct = default);
}
