using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class CurrencyConfiguration : EntityConfiguration<Currency>
{
    public override void Configure(EntityTypeBuilder<Currency> builder)
    {
        base.Configure(builder);

        builder.HasData(new Currency { Id = 1, Key = "USD", Name = "USD", Created = DateTime.UtcNow, Updated = DateTime.UtcNow },
                        new Currency { Id = 2, Key = "BYN", Name = "BYN", Created = DateTime.UtcNow, Updated = DateTime.UtcNow },
                        new Currency { Id = 3, Key = "RUB", Name = "RUB", Created = DateTime.UtcNow, Updated = DateTime.UtcNow },
                        new Currency { Id = 4, Key = "EUR", Name = "EUR", Created = DateTime.UtcNow, Updated = DateTime.UtcNow },
                        new Currency { Id = 5, Key = "BYR", Name = "BYR", Created = DateTime.UtcNow, Updated = DateTime.UtcNow },
                        new Currency { Id = 6, Key = "PLN", Name = "PLN", Created = DateTime.UtcNow, Updated = DateTime.UtcNow });

        builder.HasIndex(m => m.Key).HasDatabaseName("key__idx").IsUnique();
    }
}
