
using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeNutritionRequest
{
    [Range(typeof(decimal), "0", "100000")]
    public decimal? CaloriesKcal { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal? ProteinGrams { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal? CarbohydratesGrams { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal? FatGrams { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal? FiberGrams { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal? SugarGrams { get; set; }

    [Range(typeof(decimal), "0", "100000")]
    public decimal? SodiumMilligrams { get; set; }

    [StringLength(200)]
    public string? DataSource { get; set; }

    public bool IsVerified { get; set; } = false;
}
