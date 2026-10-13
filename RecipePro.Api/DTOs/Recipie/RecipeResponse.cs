namespace RecipePro.Api.DTOs.Recipe;

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

    public List<RecipeIngredientResponse> Ingredients { get; set; }
        = new();

    public List<RecipeProcedureResponse> Procedures { get; set; }
        = new();
}