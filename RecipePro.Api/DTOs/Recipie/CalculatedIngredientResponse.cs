namespace RecipePro.Api.DTOs.Recipe;

public class CalculatedIngredientResponse
{
    public long IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string IngredientPhotoUrl { get; set; } = string.Empty;

    public decimal BaseQuantity { get; set; }

    public decimal RequiredQuantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public decimal? EstimatedCost { get; set; }
}