
namespace RecipePro.Api.DTOs.Recipe;

public class RecipeReviewResponse
{
    public long Id { get; set; }

    public long RecipeId { get; set; }

    public long UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public int Rating { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; }
}
