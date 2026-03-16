using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class ExchangeRateConfiguration : EntityConfiguration<ExchangeRate>
{
    public override void Configure(EntityTypeBuilder<ExchangeRate> builder)
    {
        base.Configure(builder);
    }
}
