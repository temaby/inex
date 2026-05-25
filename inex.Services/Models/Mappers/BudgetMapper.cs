using inex.Data.Models;
using inex.Services.Models.Records.Budget;

namespace inex.Services.Models.Mappers;

public static class BudgetMapper
{
    public static Budget ToEntity(this CreateBudgetRequest source)
    {
        return new Budget
        {
            Key = source.Key,
            Name = source.Name ?? source.Key,
            Description = source.Description,
            Year = source.Year,
            Month = source.Month,
            Value = source.Value
        };
    }

    public static Budget ApplyTo(this UpdateBudgetRequest source, Budget destination)
    {
        destination.Key = source.Key;
        destination.Name = source.Name ?? source.Key;
        destination.Description = source.Description;
        destination.Year = source.Year;
        destination.Month = source.Month;
        destination.Value = source.Value;

        return destination;
    }

    public static BudgetResponse ToResponse(this Budget source)
    {
        return new BudgetResponse
        {
            Id = source.Id,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            Year = source.Year,
            Month = source.Month,
            Value = source.Value,
            CategoryIds = source.BudgetCategories.Select(i => i.CategoryId).ToList()
        };
    }
}
