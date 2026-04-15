using FluentValidation;
using inex.Services.Models.Records.Account;

namespace inex.Services.Validators.Account;

public class AccountUpdateValidator : AbstractValidator<AccountUpdateDTO>
{
    public AccountUpdateValidator()
    {
        Include(new AccountCreateValidator());

        RuleFor(x => x.Id)
            .GreaterThan(0);
    }
}
