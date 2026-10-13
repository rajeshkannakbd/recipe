using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Ingredient;

public class IngredientRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    
    public string? PhotoUrl { get; set; }

    public decimal? PurchasePrice { get; set; }

    public decimal? PurchaseQuantity { get; set; }

    public string? PurchaseUnit { get; set; }
}