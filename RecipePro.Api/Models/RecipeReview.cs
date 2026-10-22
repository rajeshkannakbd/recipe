
using System.ComponentModel.DataAnnotations;
using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class RecipeReview : AuditableEntity
{
    public long RecipeId { get; set; }

    public long UserId { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; }

    [StringLength(1000)]
    public string? Comment { get; set; }

    public Recipe Recipe { get; set; } = null!;

    public ApplicationUser User { get; set; } = null!;
}
