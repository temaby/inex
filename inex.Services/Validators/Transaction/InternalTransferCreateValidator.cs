using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class InternalTransferCreateValidator : AbstractValidator<CreateInternalTransferRequest>
{
    public InternalTransferCreateValidator()
    {
        RuleFor(x => x.AccountId)
            .GreaterThan(0).WithMessage("account_id.invalid");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("amount.must_be_positive");

        RuleFor(x => x.Direction)
            .Must(InternalTransferDirection.IsValid).WithMessage("direction.invalid");

        RuleFor(x => x.Created)
            .NotEqual(default(DateTime)).WithMessage("created.required");
    }
}
