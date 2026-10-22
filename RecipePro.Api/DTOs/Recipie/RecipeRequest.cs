
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
    public List<RecipeIngredientRequest> Ingredients { get; set; } = new();

    [Required]
    [MinLength(1)]
    public List<RecipeProcedureRequest> Procedures { get; set; } = new();

    // Existing cooked-weight feature
    [Range(typeof(decimal), "0.01", "999999")]
    public decimal? BaseCookedWeightGrams { get; set; }

    // Recipe metadata
    [Range(1, long.MaxValue)]
    public long? CuisineId { get; set; }

    [StringLength(100)]
    public string? MealType { get; set; }

    [Range(1, long.MaxValue)]
    public long? ChefId { get; set; }

    [Range(1, long.MaxValue)]
    public long? CookingStyleId { get; set; }

    [Range(0, 1440)]
    public int? PreparationTimeMinutes { get; set; }

    [Range(0, 1440)]
    public int? CookingTimeMinutes { get; set; }

    [StringLength(1000)]
    public string? StorageInstructions { get; set; }

    [Range(0, 87600)]
    public int? ShelfLifeHours { get; set; }

    [StringLength(200)]
    public string? SourceName { get; set; }

    [Url]
    [StringLength(1000)]
    public string? SourceUrl { get; set; }

    public List<long> TagIds { get; set; } = new();
}
