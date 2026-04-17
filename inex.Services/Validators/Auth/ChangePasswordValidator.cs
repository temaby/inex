using FluentValidation;
using inex.Services.Models.Records.Auth;

namespace inex.Services.Validators.Auth;

public class ChangePasswordValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("current_password.required");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("new_password.required")
            .MinimumLength(8).WithMessage("new_password.min_length");
    }
}
