
using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class IngredientSubstitutionRequest
{
    [Range(1, long.MaxValue)]
    public long SubstituteIngredientId { get; set; }

    [Range(typeof(decimal), "0.001", "999999")]
    public decimal? Quantity { get; set; }

    [StringLength(30)]
    public string? Unit { get; set; }

    [StringLength(500)]
    public string? Instructions { get; set; }
}
