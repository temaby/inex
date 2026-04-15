using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class TransactionUpdateValidator : AbstractValidator<TransactionUpdateDTO>
{
    public TransactionUpdateValidator()
    {
        Include(new TransactionCreateValidator());

        RuleFor(x => x.Id)
            .GreaterThan(0);
    }
}
