using FluentValidation;
using inex.Services.Models.Records.Auth;

namespace inex.Services.Validators.Auth;

public class UpdateProfileValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("username.required")
            .MaximumLength(256).WithMessage("username.max_length");

        RuleFor(x => x.CurrencyId)
            .GreaterThan(0).WithMessage("currency_id.invalid");
    }
}
