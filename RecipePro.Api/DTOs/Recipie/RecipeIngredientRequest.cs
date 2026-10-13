using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeIngredientRequest
{
    [Range(1, long.MaxValue)]
    public long IngredientId { get; set; }

    [Range(typeof(decimal), "0.001", "999999999")]
    public decimal Quantity { get; set; }

    [Required]
    [StringLength(30, MinimumLength = 1)]
    public string Unit { get; set; } = string.Empty;
}