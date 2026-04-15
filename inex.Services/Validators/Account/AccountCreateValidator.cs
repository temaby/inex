using FluentValidation;
using inex.Services.Models.Records.Account;

namespace inex.Services.Validators.Account;

public class AccountCreateValidator : AbstractValidator<AccountCreateDTO>
{
    public AccountCreateValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(256);

        RuleFor(x => x.CurrencyId)
            .GreaterThan(0);
    }
}
