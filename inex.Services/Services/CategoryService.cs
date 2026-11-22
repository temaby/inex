using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Models.Mappers;
using inex.Services.Models.Enums;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Category;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore;
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

    public async Task<CategoryResponse> GetAsync(int id, int userId, CancellationToken ct = default)
    {
        var category = await DbInEx.CategoryRepository
            .Get(false, i => i.Id == id && i.UserId == userId)
            .SingleOrDefaultAsync(ct)
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
        var source = await DbInEx.CategoryRepository
            .Get(false, i => i.Id == id && i.UserId == userId)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Category {id} was not found.", "Category", id);
        if (source.IsSystem)
        {
            throw new DomainRuleException("system-category-update", $"System category {id} cannot be updated.");
        }
        // update item with new details
        source = itemDTO.ApplyTo(source);
        source.UpdatedBy = userId;
        // put information about updated item to the database
        EntityEntry<Category> dest = DbInEx.CategoryRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return dest.Entity.ToResponse();
    }

    public override async Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return;

        await using var atomic = await DbInEx.BeginAtomicAsync(ct);
        var categories = await DbInEx.CategoryRepository
            .Get(false, i => idList.Contains(i.Id) && i.UserId == userId)
            .ToListAsync(ct);

        if (categories.Count != idList.Count)
        {
            var notFoundIds = idList.Except(categories.Select(a => a.Id));
            throw notFoundIds.Count() > 1
            ? new ResourceNotFoundException($"Categories {string.Join(", ", notFoundIds)} were not found.", "Category", notFoundIds)
            : new ResourceNotFoundException($"Category {notFoundIds.First()} was not found.", "Category", notFoundIds.First());
        }

        var systemIds = categories.Where(i => i.IsSystem).Select(i => i.Id).ToList();

        if (systemIds.Count > 0)
            throw new DomainRuleException("system-category-delete", $"System categories cannot be deleted: {string.Join(", ", systemIds)}.");

        // Top-level reads under SERIALIZABLE lock the matching foreign-key ranges,
        // including empty ranges, until the delete commits.
        var ownsChild = await DbInEx.CategoryRepository
            .Get(true, child => child.ParentCategoryId.HasValue && idList.Contains(child.ParentCategoryId.Value) &&
                child.ParentCategory != null && child.ParentCategory.UserId == userId && !idList.Contains(child.Id))
            .Select(child => (bool?)(child.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (ownsChild is bool childOwned)
            throw DeleteDependencyError(childOwned, "category-delete-has-children", "Delete the child categories before deleting this parent category.");

        var ownsTransaction = await DbInEx.TransactionRepository
            .Get(true, transaction => idList.Contains(transaction.CategoryId) && transaction.Category.UserId == userId)
            .Select(transaction => (bool?)(transaction.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (ownsTransaction is bool transactionOwned)
            throw DeleteDependencyError(transactionOwned, "category-delete-has-transactions", "This category is used by transactions and cannot be deleted.");

        var ownsBudget = await DbInEx.BudgetCategoryRepository
            .Get(true, link => idList.Contains(link.CategoryId) && link.Category.UserId == userId)
            .Select(link => (bool?)(link.Budget.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (ownsBudget is bool budgetOwned)
            throw DeleteDependencyError(budgetOwned, "category-delete-has-budgets", "This category is linked to budgets and cannot be deleted.");

        DbInEx.CategoryRepository.Delete(categories);
        await DbInEx.SaveAsync(ct);
        await atomic.CommitAsync(ct);
    }

    #endregion Public Interface

    private static DomainRuleException DeleteDependencyError(bool owned, string rule, string detail) =>
        // Legacy cross-owner links must also block the cascade without revealing their type.
        owned ? new(rule, detail) : new("category-delete-unavailable", "This category cannot be deleted.");
}
