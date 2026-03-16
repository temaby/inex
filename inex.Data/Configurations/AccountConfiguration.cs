using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class AccountConfiguration : EntityConfiguration<Account>
{
    public override void Configure(EntityTypeBuilder<Account> builder)
    {
        base.Configure(builder);

        builder.HasOne(a => a.Currency)
              .WithMany(c => c.Accounts)
              .HasForeignKey(a => a.CurrencyId)
              .HasConstraintName("account__currency__FK");

        builder.HasOne(a => a.User)
              .WithMany(u => u.Accounts)
              .HasForeignKey(a => a.UserId)
              .HasConstraintName("account__user__FK");
    }
}
