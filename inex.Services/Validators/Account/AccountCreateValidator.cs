using FluentValidation;
using inex.Services.Models.Records.Account;

namespace inex.Services.Validators.Account;

public class AccountCreateValidator : AbstractValidator<AccountCreateDTO>
{
    public AccountCreateValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty().WithMessage("key.required")
            .MaximumLength(50).WithMessage("key.max_length");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("name.required")
            .MaximumLength(256).WithMessage("name.max_length");

        RuleFor(x => x.CurrencyId)
            .GreaterThan(0).WithMessage("currency_id.invalid");
    }
}
