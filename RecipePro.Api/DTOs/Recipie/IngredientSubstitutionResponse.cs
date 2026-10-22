
namespace RecipePro.Api.DTOs.Recipe;

public class IngredientSubstitutionResponse
{
    public long Id { get; set; }

    public long RecipeIngredientId { get; set; }

    public long SubstituteIngredientId { get; set; }

    public string SubstituteIngredientName { get; set; } = string.Empty;

    public decimal? Quantity { get; set; }

    public string? Unit { get; set; }

    public string? Instructions { get; set; }
}
