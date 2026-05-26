using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using System.Threading.Tasks;

namespace inex.Services.Services.Base;

public interface ICategoryService : IInExService
{
    Task<CategoryResponse> GetAsync(int id, int userId, CancellationToken ct = default);
    ListResponse<CategoryResponse> Get(int userId, ActivityMode mode);
    Task<CreatedResponse> CreateAsync(CreateCategoryRequest itemDTO, int userId, CancellationToken ct = default);
    Task<CategoryResponse> UpdateAsync(int id, UpdateCategoryRequest itemDTO, int userId, CancellationToken ct = default);
    Task DeleteAsync(int id, int userId, CancellationToken ct = default);
    Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default);
}
