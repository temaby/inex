using FluentValidation;
using inex.Services.Models.Records.Category;

namespace inex.Services.Validators.Category;

public class CategoryUpdateValidator : AbstractValidator<CategoryUpdateDTO>
{
    public CategoryUpdateValidator()
    {
        Include(new CategoryCreateValidator());

        RuleFor(x => x.Id)
            .GreaterThan(0);
    }
}
