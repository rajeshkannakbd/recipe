
using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class IngredientSubstitution : AuditableEntity
{
    public long RecipeIngredientId { get; set; }

    public long SubstituteIngredientId { get; set; }

    public decimal? Quantity { get; set; }

    public string? Unit { get; set; }

    public string? Instructions { get; set; }

    public RecipeIngredient RecipeIngredient { get; set; } = null!;

    public Ingredient SubstituteIngredient { get; set; } = null!;
}
