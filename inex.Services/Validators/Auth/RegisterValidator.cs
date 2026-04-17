using FluentValidation;
using inex.Services.Models.Records.Auth;

namespace inex.Services.Validators.Auth;

public class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("username.required")
            .MaximumLength(256).WithMessage("username.max_length");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("email.required")
            .EmailAddress().WithMessage("email.invalid_format")
            .MaximumLength(256).WithMessage("email.max_length");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("password.required")
            .MinimumLength(8).WithMessage("password.min_length");

        RuleFor(x => x.InviteToken)
            .NotEmpty().WithMessage("invite_token.required");

        RuleFor(x => x.CurrencyId)
            .GreaterThan(0).WithMessage("currency_id.invalid");
    }
}
