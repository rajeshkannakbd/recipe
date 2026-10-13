namespace RecipePro.Api.DTOs.Ingredient;

public class IngredientResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string PhotoUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public decimal? PurchasePrice { get; set; }

    public decimal? PurchaseQuantity { get; set; }

    public string? PurchaseUnit { get; set; }
}