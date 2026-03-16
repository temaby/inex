using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace inex.Data.Models.Base;

public abstract class NamedEntity : AuditableEntity
{
    #region Public Interface

    [Required]
    [Column("key")]
    [MaxLength(45)]
    public string Key { get; set; } = null!;

    [Column("name")]
    [MaxLength(255)]
    public string Name
    {
        get { return string.IsNullOrEmpty(_name) ? Key : _name; }
        set { _name = value; }
    }

    [Column("description")]
    [MaxLength(512)]
    public string? Description { get; set; }

    public override bool Equals(object? obj)
    {
        if (obj is NamedEntity named)
        {
            return named.Key == Key;
        }

        return base.Equals(obj);
    }

    public override int GetHashCode()
    {
        return Key.GetHashCode();
    }

    #endregion Public Interface

    #region Private Fields

    private string? _name;

    #endregion Private Fields
}
