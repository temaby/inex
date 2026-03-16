using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class BudgetCategoryConfiguration : EntityConfiguration<BudgetCategory>
{
    public override void Configure(EntityTypeBuilder<BudgetCategory> builder)
    {
        base.Configure(builder);

        builder.HasKey(bc => new { bc.BudgetId, bc.CategoryId });

        builder.HasOne(bc => bc.Budget)
               .WithMany(b => b.BudgetCategories)
               .HasForeignKey(bc => bc.BudgetId)
               .HasConstraintName("budget_category_map__budget__FK");

        builder.HasOne(bc => bc.Category)
               .WithMany(c => c.BudgetCategories)
               .HasForeignKey(bc => bc.CategoryId)
               .HasConstraintName("budget_category_map__category__FK");
    }
}
