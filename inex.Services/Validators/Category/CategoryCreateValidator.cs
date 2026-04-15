using FluentValidation;
using inex.Services.Models.Records.Category;

namespace inex.Services.Validators.Category;

public class CategoryCreateValidator : AbstractValidator<CategoryCreateDTO>
{
    public CategoryCreateValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(256);
    }
}
