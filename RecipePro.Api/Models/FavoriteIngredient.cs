namespace RecipePro.Api.Models;

public class FavoriteIngredient
{
    public long Id { get; set; }

    public long FavoriteId { get; set; }

    public long IngredientId { get; set; }

    // User-customized quantity
    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public Favorite Favorite { get; set; } = null!;

    public Ingredient Ingredient { get; set; } = null!;
}