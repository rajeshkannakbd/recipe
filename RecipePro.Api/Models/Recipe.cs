
using RecipePro.Api.Models.Common;
using RecipePro.Api.Models.Enums;

namespace RecipePro.Api.Models;

public class Recipe : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public long CategoryId { get; set; }

    public decimal? BaseCookedWeightGrams { get; set; }

    public int BaseServings { get; set; }

    public RecipeStatus Status { get; set; } = RecipeStatus.Draft;

    public string? PhotoUrl { get; set; }

    // Cuisine and meal classification
    public string? Cuisine { get; set; }

    public long? CuisineId { get; set; }

    public Cuisine? CuisineEntity { get; set; }

    public string? MealType { get; set; }

    // Chef and cooking style relationships
    public long? ChefId { get; set; }

    public Chef? Chef { get; set; }

    public long? CookingStyleId { get; set; }

    public CookingStyle? CookingStyle { get; set; }

    // Recipe timing
    public int? PreparationTimeMinutes { get; set; }

    public int? CookingTimeMinutes { get; set; }

    // Storage
    public string? StorageInstructions { get; set; }

    public int? ShelfLifeHours { get; set; }

    // Source and attribution
    public string? SourceName { get; set; }

    public string? SourceUrl { get; set; }

    public Category Category { get; set; } = null!;

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; }
        = new List<RecipeIngredient>();

    public ICollection<RecipeProcedure> Procedures { get; set; }
        = new List<RecipeProcedure>();

    public RecipeNutrition? Nutrition { get; set; }

    public ICollection<RecipeReview> Reviews { get; set; }
        = new List<RecipeReview>();

    public ICollection<RecipeVariation> Variations { get; set; }
        = new List<RecipeVariation>();

    public ICollection<RecipeTagMapping> RecipeTags { get; set; }
    = new List<RecipeTagMapping>();
}
