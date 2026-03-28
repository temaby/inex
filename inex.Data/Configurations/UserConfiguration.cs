using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.HasOne(u => u.Currency)
               .WithMany(c => c.Users)
               .HasForeignKey(u => u.CurrencyId)
               .HasConstraintName("user__currency__FK");
    }
}
