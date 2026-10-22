
using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeReviewRequest
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [StringLength(1000)]
    public string? Comment { get; set; }
}
