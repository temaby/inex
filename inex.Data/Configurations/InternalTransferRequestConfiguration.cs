using inex.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace inex.Data.Configurations;

public class InternalTransferRequestConfiguration : IEntityTypeConfiguration<InternalTransferRequest>
{
    public void Configure(EntityTypeBuilder<InternalTransferRequest> builder)
    {
        builder.ToTable("internal_transfer_request", table => {
            table.HasCheckConstraint("CK_transfer_request_participants", "`MasterUserId` <> `LinkedUserId`");
            table.HasCheckConstraint("CK_transfer_request_value", "`MasterValue` <> 0");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SubmissionKey).HasMaxLength(36).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(10).IsRequired();
        builder.Property(x => x.MasterValue).HasPrecision(12, 2);
        builder.Property(x => x.OriginalComment).HasMaxLength(255);
        builder.Property(x => x.MasterUsername).HasMaxLength(256).IsRequired();
        builder.Property(x => x.LinkedUsername).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Version).IsConcurrencyToken();
        builder.HasIndex(x => new { x.MasterUserId, x.SubmissionKey }).IsUnique();
        builder.HasIndex(x => new { x.LinkedUserId, x.Status, x.Id });
        builder.HasIndex(x => new { x.MasterUserId, x.Status, x.Id });
        builder.HasIndex(x => x.MasterTransactionId).IsUnique();
        builder.HasIndex(x => x.LinkedTransactionId).IsUnique();
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.MasterUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.LinkedUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<UserAccountLink>().WithMany().HasForeignKey(x => x.LinkId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Currency>().WithMany().HasForeignKey(x => x.CurrencyId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.MasterTransaction).WithMany().HasForeignKey(x => x.MasterTransactionId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(x => x.LinkedTransaction).WithMany().HasForeignKey(x => x.LinkedTransactionId).OnDelete(DeleteBehavior.SetNull);
    }
}
