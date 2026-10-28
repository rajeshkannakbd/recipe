
namespace RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.DTOs.RecipeTag;

public class RecipeResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public int BaseServings { get; set; }

    public decimal? BaseCookedWeightGrams { get; set; }

    public string Status { get; set; } = string.Empty;

    public string PhotoUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public double? AverageRating { get; set; }

    public int ReviewCount { get; set; }

    // Recipe metadata
    public string? Cuisine { get; set; }

    public string? MealType { get; set; }

    public long? ChefId { get; set; }

    public string? ChefName { get; set; }

    public long? CookingStyleId { get; set; }

    public string? CookingStyleName { get; set; }

    public int? PreparationTimeMinutes { get; set; }

    public int? CookingTimeMinutes { get; set; }

    public string? StorageInstructions { get; set; }

    public int? ShelfLifeHours { get; set; }

    public string? SourceName { get; set; }

    public string? SourceUrl { get; set; }

    public List<RecipeTagResponse> Tags { get; set; } = new();

    public List<RecipeIngredientResponse> Ingredients { get; set; } = new();

    public List<RecipeProcedureResponse> Procedures { get; set; } = new();
}
