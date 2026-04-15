using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class TransferCreateValidator : AbstractValidator<TransferCreateDTO>
{
    public TransferCreateValidator()
    {
        RuleFor(x => x.AmountFrom)
            .GreaterThan(0);

        RuleFor(x => x.AmountTo)
            .GreaterThan(0);

        RuleFor(x => x.AccountFromId)
            .GreaterThan(0);

        RuleFor(x => x.AccountToId)
            .GreaterThan(0)
            .Must((dto, toId) => toId != dto.AccountFromId)
            .WithMessage("Source and destination accounts must differ.");
    }
}
