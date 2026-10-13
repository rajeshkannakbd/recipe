using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class Ingredient : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? PhotoUrl { get; set; }

    public decimal? GramsPerMilliliter { get; set; }

    public decimal? GramsPerPiece { get; set; }

    public decimal? PurchasePrice { get; set; }

    public decimal? PurchaseQuantity { get; set; }

    public string? PurchaseUnit { get; set; }

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; }
        = new List<RecipeIngredient>();

    
}