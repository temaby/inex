using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Configurations.Base;
using Transaction = inex.Data.Models.Transaction;

namespace inex.Data.Configurations;

public class TransactionConfiguration : EntityConfiguration<Transaction>
{
    public override void Configure(EntityTypeBuilder<Transaction> builder)
    {
        base.Configure(builder);

        builder.HasOne(t => t.Account)
              .WithMany(a => a.Transactions)
              .HasForeignKey(t => t.AccountId)
              .HasConstraintName("transaction__account__FK");

        builder.HasOne(t => t.Category)
              .WithMany(c => c.Transactions)
              .HasForeignKey(t => t.CategoryId)
              .HasConstraintName("transaction__category__FK");

        builder.HasOne(t => t.User)
              .WithMany(u => u.Transactions)
              .HasForeignKey(t => t.UserId)
              .HasConstraintName("transaction__user__FK");
    }
}
