namespace inex.Services.Models.Records.Account;

public record UpdateAccountRequest : CreateAccountRequest
{
    public int Id { get; init; }
}
