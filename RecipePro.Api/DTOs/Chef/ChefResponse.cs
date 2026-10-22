namespace RecipePro.Api.DTOs.Chef;

public class ChefResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Biography { get; set; }

    public string? PhotoUrl { get; set; }

    public string? SourceUrl { get; set; }

    public int RecipeCount { get; set; }

    public DateTime CreatedAt { get; set; }
}