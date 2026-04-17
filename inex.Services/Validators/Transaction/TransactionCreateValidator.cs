using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class TransactionCreateValidator : AbstractValidator<TransactionCreateDTO>
{
    public TransactionCreateValidator()
    {
        RuleFor(x => x.Amount)
            .NotEqual(0).WithMessage("amount.not_zero");

        RuleFor(x => x.AccountId)
            .GreaterThan(0).WithMessage("account_id.invalid");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("category_id.invalid");
    }
}
