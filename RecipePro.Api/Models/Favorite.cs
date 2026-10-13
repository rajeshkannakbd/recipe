namespace RecipePro.Api.Models;

public class Favorite
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public long RecipeId { get; set; }

    // User's customized serving count
    public int RequiredServings { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;

    public Recipe Recipe { get; set; } = null!;

    public ICollection<FavoriteIngredient> Ingredients { get; set; }
        = new List<FavoriteIngredient>();
}