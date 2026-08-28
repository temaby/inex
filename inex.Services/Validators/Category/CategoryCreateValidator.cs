using FluentValidation;
using inex.Services.Models.Records.Category;

namespace inex.Services.Validators.Category;

public class CategoryCreateValidator : AbstractValidator<CreateCategoryRequest>
{
    public CategoryCreateValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty().WithMessage("key.required")
            .MaximumLength(50).WithMessage("key.max_length");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("name.required")
            .MaximumLength(256).WithMessage("name.max_length");

        RuleFor(x => x.IsSystem)
            .Equal(false).WithMessage("is_system.system_managed");

        RuleFor(x => x.SystemCode)
            .Null().WithMessage("system_code.system_managed");
    }
}
