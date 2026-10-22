
using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeVariationRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    // JSON describing ingredient changes, such as quantity adjustments.
    public string? IngredientChangesJson { get; set; }

    // Optional preparation instructions specific to this variation.
    public string? ProcedureChanges { get; set; }
}
