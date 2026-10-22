namespace RecipePro.Api.DTOs.RecipeTag;

public class RecipeTagResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int RecipeCount { get; set; }
}
