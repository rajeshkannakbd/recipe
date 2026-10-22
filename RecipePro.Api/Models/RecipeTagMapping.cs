namespace RecipePro.Api.Models;

public class RecipeTagMapping
{
    public long RecipeId { get; set; }

    public Recipe Recipe { get; set; } = null!;

    public long RecipeTagId { get; set; }

    public RecipeTag RecipeTag { get; set; } = null!;
}