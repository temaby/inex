using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class CategoryConfiguration : EntityConfiguration<Category>
{
    public override void Configure(EntityTypeBuilder<Category> builder)
    {
        base.Configure(builder);

        builder.HasOne(c => c.ParentCategory)
              .WithMany(c => c.SubCategories)
              .HasForeignKey(c => c.ParentCategoryId)
              .HasConstraintName("category__category__FK");

        builder.HasOne(c => c.User)
              .WithMany(u => u.Categories)
              .HasForeignKey(c => c.UserId)
              .HasConstraintName("category__user__FK");

        builder.HasData(new Category { Id = 1, Key = "transfer", Name = "Трансфер", IsEnabled = true, IsSystem = true, SystemCode = "transfer", UserId = 1 });
    }
}
