using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class CurrencyConfiguration : EntityConfiguration<Currency>
{
    private static readonly DateTime SeedTimestamp = new(2021, 12, 14, 0, 0, 0, DateTimeKind.Utc);

    public override void Configure(EntityTypeBuilder<Currency> builder)
    {
        base.Configure(builder);

        builder.HasData(new Currency { Id = 1, Key = "USD", Name = "USD", Created = SeedTimestamp, Updated = SeedTimestamp },
                        new Currency { Id = 2, Key = "BYN", Name = "BYN", Created = SeedTimestamp, Updated = SeedTimestamp },
                        new Currency { Id = 3, Key = "RUB", Name = "RUB", Created = SeedTimestamp, Updated = SeedTimestamp },
                        new Currency { Id = 4, Key = "EUR", Name = "EUR", Created = SeedTimestamp, Updated = SeedTimestamp },
                        new Currency { Id = 5, Key = "BYR", Name = "BYR", Created = SeedTimestamp, Updated = SeedTimestamp },
                        new Currency { Id = 6, Key = "PLN", Name = "PLN", Created = SeedTimestamp, Updated = SeedTimestamp });

        builder.HasIndex(m => m.Key).HasDatabaseName("key__idx").IsUnique();
    }
}
