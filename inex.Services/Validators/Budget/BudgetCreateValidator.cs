using FluentValidation;
using inex.Services.Models.Records.Budget;

namespace inex.Services.Validators.Budget;

public class BudgetCreateValidator : AbstractValidator<BudgetCreateDTO>
{
    public BudgetCreateValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty();

        RuleFor(x => x.Value)
            .GreaterThan(0);

        RuleFor(x => x.Year)
            .InclusiveBetween(2000, 2100);

        RuleFor(x => x.Month)
            .InclusiveBetween(1, 12);
    }
}
