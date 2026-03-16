using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace inex.Data.Models.Base;

public abstract class AuditableEntity
{
    [Required]
    [Column("created", TypeName = "timestamp")]
    public DateTime Created { get; set; }
    [Required]
    [Column("updated", TypeName = "timestamp")]
    public DateTime Updated { get; set; }
    [Column("created_by")]
    public int? CreatedBy { get; set; }
    [Column("updated_by")]
    public int? UpdatedBy { get; set; }
}
