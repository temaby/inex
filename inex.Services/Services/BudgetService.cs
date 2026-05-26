using inex.Data.Models;
using inex.Data.Repositories.Base;
using inex.Services.Exceptions;
using inex.Services.Models.Mappers;
using inex.Services.Models.Records.Base;
using inex.Services.Models.Records.Data;
using inex.Services.Services.Base;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using inex.Services.Models.Records.Budget;
using Microsoft.EntityFrameworkCore;

namespace inex.Services.Services;

public class BudgetService : InExService, IBudgetService
{
    #region Constructors

    public BudgetService(IInExUnitOfWork uowInEx) : base(uowInEx)
    {

    }

    #endregion Constructors

    #region Public Interface

    public async Task<BudgetResponse> GetAsync(int id, int userId, CancellationToken ct = default)
    {
        var budget = await DbInEx.BudgetRepository
            .Get(false, i => i.Id == id && i.UserId == userId, i => i.BudgetCategories)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Budget {id} was not found.", "Budget", id);
        return budget.ToResponse();
    }

    public ListResponse<BudgetResponse> Get(int userId, int? year = null, int? month = null)
    {
        IQueryable<Budget> items = DbInEx.BudgetRepository.Get(true, i => i.UserId == userId && (!year.HasValue || i.Year == year) && (!month.HasValue || i.Month == month), i => i.BudgetCategories).OrderBy(i => i.Name);
        return BuildDataResponse<Budget, BudgetResponse>(items.ToList(), BudgetMapper.ToResponse);
    }

    public async Task<CreatedResponse> CreateAsync(CreateBudgetRequest itemDTO, int userId, CancellationToken ct = default)
    {
        // create an item
        Budget budget = itemDTO.ToEntity();

        budget.UserId = userId;
        budget.CreatedBy = userId;

        // Ensure Year/Month are set
        if (budget.Year == 0) budget.Year = System.DateTime.Now.Year;
        if (budget.Month == 0) budget.Month = System.DateTime.Now.Month;

        await EnsureCategoriesBelongToUserAsync(itemDTO.CategoryIds, userId, ct);
        ValidateCategoryUniqueness(userId, budget.Year, budget.Month, itemDTO.CategoryIds);

        // put information about created item to the database
        EntityEntry<Budget> result = await DbInEx.BudgetRepository.CreateAsync(budget, ct);

        // Save first to generate the ID
        await DbInEx.SaveAsync(ct);

        // connect categories with the item
        if (itemDTO.CategoryIds != null && itemDTO.CategoryIds.Any())
        {
            foreach (int categoryId in itemDTO.CategoryIds)
            {
                await DbInEx.BudgetCategoryRepository.CreateAsync(new BudgetCategory
                {
                    BudgetId = result.Entity.Id,
                    CategoryId = categoryId,
                    CreatedBy = userId,
                    UpdatedBy = userId,
                    Created = System.DateTime.Now,
                    Updated = System.DateTime.Now
                }, ct);
            }

            // apply changes to the database
            await DbInEx.SaveAsync(ct);
        }

        return new CreatedResponse(result.Entity.Id);
    }

    public async Task<BudgetResponse> UpdateAsync(int id, UpdateBudgetRequest itemDTO, int userId, CancellationToken ct = default)
    {
        if (itemDTO.Id != id)
        {
            throw new ValidationFailedException($"Request body id ({itemDTO.Id}) does not match route id ({id}).");
        }

        // get item to update with categories loaded
        var source = await DbInEx.BudgetRepository
            .Get(false, i => i.Id == id && i.UserId == userId, i => i.BudgetCategories)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Budget {id} was not found.", "Budget", id);
        // update item with new details
        source = itemDTO.ApplyTo(source);
        source.UpdatedBy = userId;

        await EnsureCategoriesBelongToUserAsync(itemDTO.CategoryIds, userId, ct);
        ValidateCategoryUniqueness(userId, source.Year, source.Month, itemDTO.CategoryIds, id);

        // Handle category assignments: unassign removed categories and assign new ones
        var currentCategoryIds = source.BudgetCategories.Select(c => c.CategoryId).ToList();
        var newCategoryIds = itemDTO.CategoryIds?.ToList() ?? new List<int>();

        // Unassign categories that are no longer in the list
        var toUnassign = currentCategoryIds.Except(newCategoryIds).ToList();
        foreach (var categoryId in toUnassign)
        {
            var link = source.BudgetCategories.First(c => c.CategoryId == categoryId);
            DbInEx.BudgetCategoryRepository.Delete(link);
        }

        // Assign new categories that weren't previously assigned
        var toAssign = newCategoryIds.Except(currentCategoryIds).ToList();
        foreach (var categoryId in toAssign)
        {
            await DbInEx.BudgetCategoryRepository.CreateAsync(new BudgetCategory
            {
                BudgetId = source.Id,
                CategoryId = categoryId,
                CreatedBy = userId,
                UpdatedBy = userId,
                Created = System.DateTime.Now,
                Updated = System.DateTime.Now
            }, ct);
        }

        // put information about updated item to the database
        EntityEntry<Budget> dest = DbInEx.BudgetRepository.Update(source);
        // apply changes to the database
        await DbInEx.SaveAsync(ct);

        return dest.Entity.ToResponse();
    }

    public async Task DeleteAsync(int id, int userId, CancellationToken ct = default)
    {
        var budget = await DbInEx.BudgetRepository
            .Get(false, i => i.Id == id && i.UserId == userId, i => i.BudgetCategories)
            .SingleOrDefaultAsync(ct)
            ?? throw new ResourceNotFoundException($"Budget {id} was not found.", "Budget", id);

        if (budget.BudgetCategories != null && budget.BudgetCategories.Any())
        {
            DbInEx.BudgetCategoryRepository.Delete(budget.BudgetCategories);
        }

        DbInEx.BudgetRepository.Delete(budget);
        await DbInEx.SaveAsync(ct);
    }

    public async Task DeleteAsync(IEnumerable<int> ids, int userId, CancellationToken ct = default)
    {
        var budgets = DbInEx.BudgetRepository.Get(false, i => ids.Contains(i.Id) && i.UserId == userId, i => i.BudgetCategories).ToList();

        foreach (var budget in budgets)
        {
            if (budget.BudgetCategories != null && budget.BudgetCategories.Any())
            {
                DbInEx.BudgetCategoryRepository.Delete(budget.BudgetCategories);
            }
        }

        DbInEx.BudgetRepository.Delete(budgets);
        await DbInEx.SaveAsync(ct);
    }

    public override Task DeleteAsync(IEnumerable<int> ids, CancellationToken ct = default)
    {
        throw new OperationNotSupportedException("Budget deletes require a current user id.");
    }

    public async Task CopyBudgetsAsync(int userId, int sourceYear, int sourceMonth, int targetYear, int targetMonth, CancellationToken ct = default)
    {
        // Get source budgets
        var sourceBudgets = DbInEx.BudgetRepository.Get(true,
            b => b.UserId == userId && b.Year == sourceYear && b.Month == sourceMonth,
            b => b.BudgetCategories).ToList();

        if (!sourceBudgets.Any()) return;

        var allSourceCategoryIds = sourceBudgets
            .SelectMany(b => b.BudgetCategories)
            .Select(bc => bc.CategoryId)
            .Distinct()
            .ToList();

        ValidateCategoryUniqueness(userId, targetYear, targetMonth, allSourceCategoryIds);

        foreach (var sourceBudget in sourceBudgets)
        {
            // Generate unique key
            string baseKey = sourceBudget.Key ?? "budget";
            string oldSuffix = $"_{sourceYear}_{sourceMonth}";
            if (baseKey.EndsWith(oldSuffix))
            {
                baseKey = baseKey.Substring(0, baseKey.Length - oldSuffix.Length);
            }

            string newSuffix = $"_{targetYear}_{targetMonth}";
            if (baseKey.Length + newSuffix.Length > 45)
            {
                baseKey = baseKey.Substring(0, 45 - newSuffix.Length);
            }
            string newKey = $"{baseKey}{newSuffix}";

            // Create new budget
            var newBudget = new Budget
            {
                UserId = userId,
                Year = targetYear,
                Month = targetMonth,
                Key = newKey,
                Name = sourceBudget.Name,
                Description = sourceBudget.Description,
                Value = sourceBudget.Value,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            var result = await DbInEx.BudgetRepository.CreateAsync(newBudget, ct);
            await DbInEx.SaveAsync(ct); // Save to get ID

            // Copy categories
            if (sourceBudget.BudgetCategories != null)
            {
                foreach (var bc in sourceBudget.BudgetCategories)
                {
                    await DbInEx.BudgetCategoryRepository.CreateAsync(new BudgetCategory
                    {
                        BudgetId = result.Entity.Id,
                        CategoryId = bc.CategoryId,
                        CreatedBy = userId,
                        UpdatedBy = userId,
                        Created = System.DateTime.Now,
                        Updated = System.DateTime.Now
                    }, ct);
                }
            }
        }

        await DbInEx.SaveAsync(ct);
    }

    private void ValidateCategoryUniqueness(int userId, int year, int month, IEnumerable<int>? categoryIds, int? excludeBudgetId = null)
    {
        if (categoryIds == null || !categoryIds.Any()) return;

        var budgets = DbInEx.BudgetRepository.Get(true,
            b => b.UserId == userId && b.Year == year && b.Month == month && (!excludeBudgetId.HasValue || b.Id != excludeBudgetId.Value),
            b => b.BudgetCategories);

        var assignedCategoryIds = budgets
            .SelectMany(b => b.BudgetCategories)
            .Select(bc => bc.CategoryId)
            .ToList();

        var conflicts = categoryIds.Intersect(assignedCategoryIds).ToList();

        if (conflicts.Any())
        {
            var categoryNames = DbInEx.CategoryRepository.Get(true).Where(c => conflicts.Contains(c.Id))
                .Select(c => c.Name)
                .ToList();

            throw new DomainRuleException(
                "category-uniqueness",
                $"Categories already assigned in this period: {string.Join(", ", categoryNames)}");
        }
    }

    private async Task EnsureCategoriesBelongToUserAsync(IEnumerable<int>? categoryIds, int userId, CancellationToken ct)
    {
        var requestedIds = categoryIds?.Distinct().ToList() ?? [];
        if (requestedIds.Count == 0) return;

        var ownedIds = await DbInEx.CategoryRepository
            .Get(true, i => requestedIds.Contains(i.Id) && i.UserId == userId)
            .Select(i => i.Id)
            .ToListAsync(ct);

        var missingId = requestedIds.Except(ownedIds).FirstOrDefault();
        if (missingId > 0)
        {
            throw new ResourceNotFoundException($"Category {missingId} was not found.", "Category", missingId);
        }
    }

    #endregion Public Interface
}
