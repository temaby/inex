using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Budget;
using inex.Services.Models.Records.Data;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface IBudgetService : IInExService
{
    Task<BudgetDetailsDTO> GetAsync(int id);
    ResponseDataDTO<BudgetDetailsDTO> Get(int userId, int? year = null, int? month = null);
    Task<ResponseCreateDTO> CreateAsync(BudgetCreateDTO itemDTO, int userId);
    Task<BudgetDetailsDTO> UpdateAsync(int id, BudgetUpdateDTO itemDTO, int userId);
    Task CopyBudgetsAsync(int userId, int sourceYear, int sourceMonth, int targetYear, int targetMonth);
}