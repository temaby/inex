using FluentValidation;
using inex.Services.Models.Records.Budget;

namespace inex.Services.Validators.Budget;

public class BudgetUpdateValidator : AbstractValidator<UpdateBudgetRequest>
{
    public BudgetUpdateValidator()
    {
        Include(new BudgetCreateValidator());

        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("id.invalid");
    }
}
