namespace RecipePro.Api.DTOs.FunctionPlan;

public class ShoppingListItemResponse
{
    public long IngredientId { get; set; }

    public string IngredientName { get; set; } = string.Empty;

    public string? PhotoUrl { get; set; }

    public decimal TotalQuantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public List<string> UsedInRecipes { get; set; } = new();

    // Original purchase details stored for the ingredient.
    public decimal? PurchasePrice { get; set; }

    public decimal? PurchaseQuantity { get; set; }

    public string? PurchaseUnit { get; set; }

    // Estimated cost for the quantity required by this function.
    public decimal? UnitPrice { get; set; }

    public decimal? EstimatedCost { get; set; }

    public bool IsPriceAvailable { get; set; }

    public decimal? TotalEstimatedCost { get; set; }

    public bool IsTotalCostComplete { get; set; }
}