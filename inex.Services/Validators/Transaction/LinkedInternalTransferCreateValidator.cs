using FluentValidation;
using inex.Services.Models.Records.Transaction;
namespace inex.Services.Validators.Transaction;
public class LinkedInternalTransferCreateValidator : AbstractValidator<CreateLinkedInternalTransferRequest>
{
    public LinkedInternalTransferCreateValidator()
    {
        Include(new InternalTransferCreateValidator());
        RuleFor(x => x.LinkedUserId).GreaterThan(0).WithMessage("linked_user.invalid");
        RuleFor(x => x.SubmissionKey).Must(key => Guid.TryParseExact(key, "D", out _)).WithMessage("submission_key.invalid");
        RuleFor(x => x.Amount).LessThanOrEqualTo(9999999999.99m).WithMessage("amount.invalid");
        RuleFor(x => x.Amount).Must(amount => decimal.Round(amount, 2) == amount).WithMessage("amount.invalid");
        RuleFor(x => x.Comment).MaximumLength(255).WithMessage("comment.too_long");
    }
}
public class AcceptInternalTransferValidator : AbstractValidator<AcceptInternalTransferRequest>
{
    public AcceptInternalTransferValidator() => RuleFor(x => x.AccountId).GreaterThan(0).WithMessage("account_id.invalid");
}
