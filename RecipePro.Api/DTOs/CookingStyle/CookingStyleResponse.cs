
namespace RecipePro.Api.DTOs.CookingStyle;

public class CookingStyleResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int RecipeCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
