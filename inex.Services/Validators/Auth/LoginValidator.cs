using FluentValidation;
using inex.Services.Models.Records.Auth;

namespace inex.Services.Validators.Auth;

public class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("email.required")
            .EmailAddress().WithMessage("email.invalid_format");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("password.required");
    }
}
