using FluentValidation;
using inex.Services.Models.Records.Budget;

namespace inex.Services.Validators.Budget;

public class BudgetCreateValidator : AbstractValidator<CreateBudgetRequest>
{
    public BudgetCreateValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty().WithMessage("key.required");

        RuleFor(x => x.Value)
            .GreaterThan(0).WithMessage("value.must_be_positive");

        RuleFor(x => x.Year)
            .InclusiveBetween(2000, 2100).WithMessage("year.out_of_range");

        RuleFor(x => x.Month)
            .InclusiveBetween(1, 12).WithMessage("month.out_of_range");
    }
}
