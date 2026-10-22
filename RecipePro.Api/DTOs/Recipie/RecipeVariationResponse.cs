
namespace RecipePro.Api.DTOs.Recipe;

public class RecipeVariationResponse
{
    public long Id { get; set; }

    public long RecipeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? IngredientChangesJson { get; set; }

    public string? ProcedureChanges { get; set; }

    public DateTime CreatedAt { get; set; }
}
