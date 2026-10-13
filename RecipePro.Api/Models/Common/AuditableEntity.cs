namespace RecipePro.Api.Models.Common;

public abstract class AuditableEntity
{
    public long Id { get; set; }

    public DateTime CreatedAt { get; set; }

    public long? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? UpdatedBy { get; set; }
}