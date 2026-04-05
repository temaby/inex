using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Budget;
using inex.Services.Models.Records.Data;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IBudgetService : IInExService
{
    Task<BudgetDetailsDTO> GetAsync(int id, CancellationToken ct = default);
    ListResponse<BudgetDetailsDTO> Get(int userId, int? year = null, int? month = null);
    Task<CreatedResponse> CreateAsync(BudgetCreateDTO itemDTO, int userId, CancellationToken ct = default);
    Task<BudgetDetailsDTO> UpdateAsync(int id, BudgetUpdateDTO itemDTO, int userId, CancellationToken ct = default);
    Task CopyBudgetsAsync(int userId, int sourceYear, int sourceMonth, int targetYear, int targetMonth, CancellationToken ct = default);
}