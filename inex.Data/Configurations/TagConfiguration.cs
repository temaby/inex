using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class TagConfiguration : EntityConfiguration<Tag>
{
    public override void Configure(EntityTypeBuilder<Tag> builder)
    {
        base.Configure(builder);

        builder.HasOne(t => t.User)
              .WithMany(u => u.Tags)
              .HasForeignKey(t => t.UserId)
              .HasConstraintName("tag__user__FK");
    }
}
