using inex.Data.Configurations.Base;
using inex.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace inex.Data.Configurations;

public class BudgetConfiguration : EntityConfiguration<Budget>
{
    public override void Configure(EntityTypeBuilder<Budget> builder)
    {
        base.Configure(builder);

        builder.HasOne(c => c.User)
              .WithMany(u => u.Budgets)
              .HasForeignKey(c => c.UserId)
              .HasConstraintName("budget__user__FK");
    }
}
