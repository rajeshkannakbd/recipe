namespace RecipePro.Api.DTOs.Favorites;

public class FavoriteRecipeResponse
{
    public long Id { get; set; }

    public long RecipeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string PhotoUrl { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public int BaseServings { get; set; }

    public int RequiredServings { get; set; }

    public List<FavoriteIngredientResponse> Ingredients { get; set; }
        = new();
}

public class FavoriteIngredientResponse
{
    public long IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string? IngredientPhotoUrl { get; set; }

    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;
}