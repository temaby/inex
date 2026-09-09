using inex.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace inex.Data.Configurations;

public class UserAccountLinkConfiguration : IEntityTypeConfiguration<UserAccountLink>
{
    public void Configure(EntityTypeBuilder<UserAccountLink> builder)
    {
        builder.HasKey(link => link.Id);

        builder.Property(link => link.Status)
            .HasConversion<int>()
            .HasDefaultValue(UserAccountLinkStatus.Pending);

        builder.Property(link => link.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        // MySQL permits multiple NULLs in a unique index. The generated column
        // therefore enforces one active master per linked user without blocking
        // historical/revoked relationship records.
        builder.Property<int?>("ActiveLinkedUserId")
            .HasColumnName("active_linked_user_fk")
            .HasComputedColumnSql("CASE WHEN `status` = 1 THEN `linked_user_fk` ELSE NULL END", stored: true);

        builder.HasIndex("ActiveLinkedUserId")
            .IsUnique()
            .HasDatabaseName("UX_user_account_link__active_linked_user");

        builder.HasIndex(link => link.MasterUserId)
            .HasDatabaseName("IX_user_account_link__master_user");

        builder.HasOne(link => link.MasterUser)
            .WithMany(user => user.MasterAccountLinks)
            .HasForeignKey(link => link.MasterUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("user_account_link__master_user__FK");

        builder.HasOne(link => link.LinkedUser)
            .WithMany(user => user.LinkedAccountLinks)
            .HasForeignKey(link => link.LinkedUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("user_account_link__linked_user__FK");

        builder.ToTable(table => table.HasCheckConstraint(
            "CK_user_account_link__different_users",
            "`master_user_fk` <> `linked_user_fk`"));
    }
}
