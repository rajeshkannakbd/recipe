namespace RecipePro.Api.DTOs.Recipe;

public class RecipeIngredientResponse
{
    public long IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string IngredientPhotoUrl { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;
}