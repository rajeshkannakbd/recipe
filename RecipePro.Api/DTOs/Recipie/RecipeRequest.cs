using System.ComponentModel.DataAnnotations;
using RecipePro.Api.Models.Enums;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [Range(1, long.MaxValue)]
    public long CategoryId { get; set; }

    [Range(1, int.MaxValue)]
    public int BaseServings { get; set; }

    public string? PhotoUrl { get; set; }

    public RecipeStatus Status { get; set; } = RecipeStatus.Draft;

    [Required]
    [MinLength(1)]
    public List<RecipeIngredientRequest> Ingredients { get; set; }
        = new();

    [Required]
    [MinLength(1)]
    public List<RecipeProcedureRequest> Procedures { get; set; }
        = new();

        // Total cooked weight for BaseServings, in grams
        [Range(typeof(decimal), "0.01", "999999")]
        public decimal? BaseCookedWeightGrams { get; set; }
}