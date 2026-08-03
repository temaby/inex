using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class TransferCreateValidator : AbstractValidator<CreateTransferRequest>
{
    public TransferCreateValidator()
    {
        RuleFor(x => x.AmountFrom)
            .GreaterThan(0).WithMessage("amount_from.must_be_positive");

        RuleFor(x => x.AmountTo)
            .GreaterThan(0).WithMessage("amount_to.must_be_positive");

        RuleFor(x => x.AccountFromId)
            .GreaterThan(0).WithMessage("account_from_id.invalid");

        RuleFor(x => x.AccountToId)
            .GreaterThan(0).WithMessage("account_to_id.invalid")
            .Must((dto, toId) => toId != dto.AccountFromId)
            .WithMessage("account_to_id.same_as_source");

        RuleFor(x => x.Created)
            .NotEqual(default(DateTime)).WithMessage("created.required");
    }
}
