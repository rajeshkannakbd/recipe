
using System.ComponentModel.DataAnnotations;
using RecipePro.Api.Models.Enums;

namespace RecipePro.Api.DTOs.Ingredient;

public class IngredientRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public string? PhotoUrl { get; set; }

    // Purchase details
    [Range(typeof(decimal), "0.01", "999999999")]
    public decimal? PurchasePrice { get; set; }

    [Range(typeof(decimal), "0.01", "999999999")]
    public decimal? PurchaseQuantity { get; set; }

    [StringLength(30)]
    public string? PurchaseUnit { get; set; }

    // Ingredient type
    [EnumDataType(typeof(IngredientDietType))]
    public IngredientDietType IngredientType { get; set; }
        = IngredientDietType.Veg;

    // Wastage details
    [Range(typeof(decimal), "0", "999999999")]
    public decimal? WastageQuantity { get; set; }

    [StringLength(30)]
    public string? WastageUnit { get; set; }

    // Caution warning
    public bool IsCautionRequired { get; set; }

    [StringLength(1000)]
    public string? CautionMessage { get; set; }

    // Storage and shelf life
    [StringLength(500)]
    public string? StorageInstructions { get; set; }

    [Range(1, 36500)]
    public int? ShelfLifeDays { get; set; }

    // Additional details
    [StringLength(150)]
    public string? Brand { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    [EnumDataType(typeof(IngredientStatus))]
    public IngredientStatus Status { get; set; }
}
