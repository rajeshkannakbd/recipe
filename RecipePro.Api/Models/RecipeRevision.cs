
namespace RecipePro.Api.Models;

public class RecipeRevision
{
    public long Id { get; set; }

    public long RecipeId { get; set; }

    public long SubmittedByUserId { get; set; }

    public string SnapshotJson { get; set; } = string.Empty;

    public string ApprovalStatus { get; set; } = "Pending";

    public string? AdminComment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public long? ReviewedByUserId { get; set; }
}