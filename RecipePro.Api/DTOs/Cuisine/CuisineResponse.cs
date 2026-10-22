namespace RecipePro.Api.DTOs.Cuisine;

public class CuisineResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int RecipeCount { get; set; }

    public DateTime CreatedAt { get; set; }
}