using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class RecipeIngredient : AuditableEntity
{
    public long RecipeId { get; set; }

    public long IngredientId { get; set; }

    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public Recipe Recipe { get; set; } = null!;

    public Ingredient Ingredient { get; set; } = null!;
}