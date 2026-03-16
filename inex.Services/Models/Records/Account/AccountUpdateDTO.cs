namespace inex.Services.Models.Records.Account;

public record AccountUpdateDTO : AccountCreateDTO
{
    public int Id { get; init; }
}