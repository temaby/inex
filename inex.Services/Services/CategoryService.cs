using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Models.Mappers;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace inex.Services.Services;

public class CategoryService : InExService, ICategoryService
{
    #region Constructors

    public CategoryService(IInExUnitOfWork uowInEx) : base(uowInEx)
    {

    }

    #endregion Constructors

    #region Public Interface

    public async Task<CategoryResponse> GetAsync(int id, CancellationToken ct = default)
    {
        var category = await DbInEx.CategoryRepository.GetAsync(id, ct)
            ?? throw new ResourceNotFoundException($"Category {id} was not found.", "Category", id);
        return category.ToResponse();
    }

    public ListResponse<CategoryResponse> Get(int userId, ActivityMode mode)
    {
        IQueryable<Category> items = DbInEx.CategoryRepository.Get(true).Where(i => i.UserId == userId).OrderBy(i => i.Name);
        return mode switch
        {
            ActivityMode.ACTIVE => BuildDataResponse<Category, CategoryResponse>(items.Where(i => i.IsEnabled), CategoryMapper.ToResponse),
            ActivityMode.INACTIVE => BuildDataResponse<Category, CategoryResponse>(items.Where(i => !i.IsEnabled), CategoryMapper.ToResponse),
            ActivityMode.ALL => BuildDataResponse<Category, CategoryResponse>(items, CategoryMapper.ToResponse),
            _ => throw new ArgumentException($"Unknown ActivityMode: {mode}")
        };
    }

    public async Task<CreatedResponse> CreateAsync(CreateCategoryRequest itemDTO, int userId, CancellationToken ct = default)
    {
        // create an item
        Category category = itemDTO.ToEntity();
        category.UserId = userId;
        category.CreatedBy = userId;
        // put information about created item to the database
        EntityEntry<Category> result = await DbInEx.CategoryRepository.CreateAsync(category, ct);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<CategoryResponse> UpdateAsync(int id, UpdateCategoryRequest itemDTO, int userId, CancellationToken ct = default)
    {
        if (itemDTO.Id != id)
        {
            throw new ValidationFailedException($"Request body id ({itemDTO.Id}) does not match route id ({id}).");
        }

        // get item to update
        var source = await DbInEx.CategoryRepository.GetAsync(id, ct)
            ?? throw new ResourceNotFoundException($"Category {id} was not found.", "Category", id);
        // update item with new details
        source = itemDTO.ApplyTo(source);
        source.UpdatedBy = userId;
        // put information about updated item to the database
        EntityEntry<Category> dest = DbInEx.CategoryRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return dest.Entity.ToResponse();
    }

    public override async Task DeleteAsync(IEnumerable<int> ids, CancellationToken ct = default)
    {
        var systemIds = DbInEx.CategoryRepository
            .Get(true)
            .Where(i => ids.Contains(i.Id) && i.IsSystem)
            .Select(i => i.Id)
            .ToList();

        if (systemIds.Count > 0)
            throw new DomainRuleException(
                "system-category-delete",
                $"System categories cannot be deleted: {string.Join(", ", systemIds)}.");

        DbInEx.CategoryRepository.Delete(DbInEx.CategoryRepository.Get(false).Where(i => ids.Contains(i.Id)));
        await DbInEx.SaveAsync(ct);
    }

    #endregion Public Interface
}
