using inex.Data.Models;
using inex.Services.Models.Records.Category;

namespace inex.Services.Models.Mappers;

public static class CategoryMapper
{
    public static Category ToEntity(this CreateCategoryRequest source)
    {
        return new Category
        {
            ParentCategoryId = source.ParentId,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            IsEnabled = source.IsEnabled,
            IsSystem = source.IsSystem,
            SystemCode = source.SystemCode
        };
    }

    public static Category ApplyTo(this UpdateCategoryRequest source, Category destination)
    {
        destination.Name = source.Name;
        destination.Description = source.Description;
        destination.IsEnabled = source.IsEnabled;

        return destination;
    }

    public static CategoryResponse ToResponse(this Category source)
    {
        return new CategoryResponse
        {
            Id = source.Id,
            ParentId = source.ParentCategoryId,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            IsEnabled = source.IsEnabled,
            IsSystem = source.IsSystem,
            SystemCode = source.SystemCode
        };
    }

    public static CategorySummary ToSummary(this CategoryResponse source)
    {
        return new CategorySummary
        {
            Id = source.Id,
            ParentId = source.ParentId,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            IsEnabled = source.IsEnabled,
            IsSystem = source.IsSystem,
            SystemCode = source.SystemCode
        };
    }
}
