using FluentValidation;
using inex.Services.Models.Records.Transaction;

namespace inex.Services.Validators.Transaction;

public class TransactionCommentSuggestionsValidator : AbstractValidator<TransactionCommentSuggestionsQuery>
{
    public TransactionCommentSuggestionsValidator()
    {
        RuleFor(value => value.Type).Must(type => type is "tag" or "ref")
            .WithMessage("comment_suggestions.type_invalid");
        RuleFor(value => value.Query).MaximumLength(255)
            .WithMessage("comment_suggestions.query_too_long");
    }
}
