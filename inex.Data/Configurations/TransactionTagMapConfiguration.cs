using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class TransactionTagMapConfiguration : EntityConfiguration<TransactionTagMap>
{
    public override void Configure(EntityTypeBuilder<TransactionTagMap> builder)
    {
        base.Configure(builder);

        builder.HasKey(ttm => new { ttm.TransactionId, ttm.TagId });

        builder.HasOne(ttm => ttm.Transaction)
               .WithMany(t => t.TransactionTagDetails)
               .HasForeignKey(ttm => ttm.TransactionId)
               .HasConstraintName("transaction_tag_map__transaction__FK");

        builder.HasOne(ttm => ttm.Tag)
               .WithMany(t => t.TagTransactionDetails)
               .HasForeignKey(ttm => ttm.TagId)
               .HasConstraintName("transaction_tag_map__tag__FK");
    }
}
