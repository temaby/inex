using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class UserConfiguration : EntityConfiguration<User>
{
    public override void Configure(EntityTypeBuilder<User> builder)
    {
        base.Configure(builder);

        builder.Property(m => m.Role)
            .HasDefaultValue(Role.USER);

        builder.HasOne(u => u.Currency)
              .WithMany(c => c.Users)
              .HasForeignKey(u => u.CurrencyId)
              .HasConstraintName("user__currency__FK");

        builder.HasData(new User { Id = 1, CurrencyId = 1, Username = "temaby", Email = "registration.user@outlook.com", Password = "111111", Role = Role.USER });
    }
}
