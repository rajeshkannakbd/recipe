namespace RecipePro.Api.DTOs.Recipe;

public class RecipeCalculationResponse
{
    public long RecipeId { get; set; }

    public string RecipeName { get; set; } = string.Empty;

    public int BaseServings { get; set; }

    public decimal? EstimatedCookedWeightGrams { get; set; }

    public int RequiredServings { get; set; }

    // Estimated total weight in grams.
    // Null if the weight cannot be estimated reliably.
    public decimal? EstimatedTotalWeightGrams { get; set; }

    public bool IsWeightEstimateComplete { get; set; }

    public List<CalculatedIngredientResponse> Ingredients { get; set; }
        = new();

    public decimal? EstimatedTotalCost { get; set; }

    public bool IsCostEstimateComplete { get; set; }
}