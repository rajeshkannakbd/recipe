
namespace RecipePro.Api.DTOs.Recipe;

public class CalculatedIngredientResponse
{
    public long IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string IngredientPhotoUrl { get; set; } = string.Empty;

    public decimal BaseQuantity { get; set; }

    public decimal RequiredQuantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    // Scaled wastage, displayed separately from the ingredient quantity.
    public decimal? WastageQuantity { get; set; }

    public string? WastageUnit { get; set; }

    public decimal? EstimatedCost { get; set; }

    public string PriceSource { get; set; } = "Unavailable";

    public string? PriceMarket { get; set; }

    public string? PriceDistrict { get; set; }

    public string? PriceArrivalDate { get; set; }
}
