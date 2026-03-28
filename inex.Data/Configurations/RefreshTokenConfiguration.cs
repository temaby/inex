using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Models;

namespace inex.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Token)
               .IsRequired()
               .HasMaxLength(512);

        builder.Property(t => t.ReplacedByToken)
               .HasMaxLength(512);

        builder.HasOne(t => t.User)
               .WithMany(u => u.RefreshTokens)
               .HasForeignKey(t => t.UserId)
               .HasConstraintName("refresh_token__user__FK");

        builder.HasIndex(t => t.Token).IsUnique();
    }
}
