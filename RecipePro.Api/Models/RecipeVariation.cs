
using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class RecipeVariation : AuditableEntity
{
    public long RecipeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Optional instructions describing what changes.
    public string? IngredientChangesJson { get; set; }

    public string? ProcedureChanges { get; set; }

    public Recipe Recipe { get; set; } = null!;
}
