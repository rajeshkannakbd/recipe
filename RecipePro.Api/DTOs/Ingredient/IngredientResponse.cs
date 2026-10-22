
using RecipePro.Api.Models.Enums;

namespace RecipePro.Api.DTOs.Ingredient;

public class IngredientResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string PhotoUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    // Purchase details
    public decimal? PurchasePrice { get; set; }

    public decimal? PurchaseQuantity { get; set; }

    public string? PurchaseUnit { get; set; }

    // Ingredient type
    public IngredientDietType IngredientType { get; set; }

    // Wastage details
    public decimal? WastageQuantity { get; set; }

    public string? WastageUnit { get; set; }

    // Caution warning
    public bool IsCautionRequired { get; set; }

    public string? CautionMessage { get; set; }

    // Storage and shelf life
    public string? StorageInstructions { get; set; }

    public int? ShelfLifeDays { get; set; }

    // Additional details
    public string? Brand { get; set; }

    public string? Notes { get; set; }

    public IngredientStatus Status { get; set; }
}
