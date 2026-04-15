using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class TransactionCreateValidator : AbstractValidator<TransactionCreateDTO>
{
    public TransactionCreateValidator()
    {
        RuleFor(x => x.Amount)
            .NotEqual(0).WithMessage("Amount must not be zero.");

        RuleFor(x => x.AccountId)
            .GreaterThan(0);

        RuleFor(x => x.CategoryId)
            .GreaterThan(0);
    }
}
