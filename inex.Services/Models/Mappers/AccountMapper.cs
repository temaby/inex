using inex.Data.Models;
using inex.Services.Models.Records.Account;

namespace inex.Services.Models.Mappers;

public static class AccountMapper
{
    public static Account ToEntity(this CreateAccountRequest source)
    {
        return new Account
        {
            CurrencyId = source.CurrencyId,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            IsEnabled = source.IsEnabled,
            IsFavourite = source.IsFavourite ?? true
        };
    }

    public static Account ApplyTo(this UpdateAccountRequest source, Account destination)
    {
        destination.CurrencyId = source.CurrencyId;
        destination.Key = source.Key;
        destination.Name = source.Name;
        destination.Description = source.Description;
        destination.IsEnabled = source.IsEnabled;
        if (source.IsFavourite.HasValue)
        {
            destination.IsFavourite = source.IsFavourite.Value;
        }

        return destination;
    }

    public static AccountResponse ToResponse(this Account source)
    {
        return new AccountResponse
        {
            Id = source.Id,
            CurrencyId = source.CurrencyId,
            Currency = source.Currency?.Key ?? string.Empty,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            IsEnabled = source.IsEnabled,
            IsFavourite = source.IsFavourite
        };
    }

    public static AccountSummary ToSummary(this Account source)
    {
        return new AccountSummary
        {
            Id = source.Id,
            CurrencyId = source.CurrencyId,
            Currency = source.Currency?.Key ?? string.Empty,
            Key = source.Key,
            Name = source.Name,
            Description = source.Description,
            IsEnabled = source.IsEnabled,
            IsFavourite = source.IsFavourite
        };
    }
}
