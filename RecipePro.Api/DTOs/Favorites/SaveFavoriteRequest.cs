using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Favorites;

public class SaveFavoriteRequest
{
    [Range(1, int.MaxValue)]
    public int RequiredServings { get; set; }

    [Required]
    public List<FavoriteIngredientRequest> Ingredients { get; set; } = new();
}

public class FavoriteIngredientRequest
{
    [Range(1, long.MaxValue)]
    public long IngredientId { get; set; }

    [Range(typeof(decimal), "0.001", "999999999")]
    public decimal Quantity { get; set; }

    [Required]
    [StringLength(30)]
    public string Unit { get; set; } = string.Empty;
} 