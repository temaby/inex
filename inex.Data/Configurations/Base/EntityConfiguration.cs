using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using inex.Data.Models.Base;

namespace inex.Data.Configurations.Base;

public abstract class EntityConfiguration<T> : IEntityTypeConfiguration<T> where T : class
{
    public virtual void Configure(EntityTypeBuilder<T> builder)
    {
        if (typeof(T).IsSubclassOf(typeof(AuditableEntity)))
        {
            builder.Property(m => (m as AuditableEntity)!.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
            builder.Property(m => (m as AuditableEntity)!.Updated).HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
    }
}
