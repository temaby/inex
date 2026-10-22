using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class CorrectionCreateValidator : AbstractValidator<CreateCorrectionRequest>
{
    public CorrectionCreateValidator()
    {
        RuleFor(x => x.AccountId).GreaterThan(0).WithMessage("account_id.invalid");
        RuleFor(x => x.Created).NotEqual(default(DateTime)).WithMessage("created.required");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("amount.must_be_positive")
            .LessThanOrEqualTo(9999999999.99m).WithMessage("amount.out_of_range")
            .Must(amount => decimal.Round(amount, 2) == amount).WithMessage("amount.precision");
        RuleFor(x => x.Direction).Must(CorrectionDirection.IsValid).WithMessage("direction.invalid");
        RuleFor(x => x.Comment).NotEmpty().WithMessage("correction.reason_required")
            .MaximumLength(255).WithMessage("correction.reason_too_long");
    }
}
