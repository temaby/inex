using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface ICategoryService : IInExService
{
    Task<CategoryDetailsDTO> GetAsync(int id, CancellationToken ct = default);
    ListResponse<CategoryDetailsDTO> Get(int userId, ActivityMode mode);
    Task<CreatedResponse> CreateAsync(CategoryCreateDTO itemDTO, int userId, CancellationToken ct = default);
    Task<CategoryDetailsDTO> UpdateAsync(int id, CategoryUpdateDTO itemDTO, int userId, CancellationToken ct = default);
}