using FluentValidation;
using inex.Services.Models.Records.Auth;

namespace inex.Services.Validators.Auth;

public class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty()
            .MaximumLength(256);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8);

        RuleFor(x => x.InviteToken)
            .NotEmpty();

        RuleFor(x => x.CurrencyId)
            .GreaterThan(0);
    }
}
