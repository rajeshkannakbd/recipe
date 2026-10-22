
namespace RecipePro.Api.DTOs.Recipe;

public class RecipeNutritionResponse
{
    public long Id { get; set; }

    public long RecipeId { get; set; }

    public decimal? CaloriesKcal { get; set; }

    public decimal? ProteinGrams { get; set; }

    public decimal? CarbohydratesGrams { get; set; }

    public decimal? FatGrams { get; set; }

    public decimal? FiberGrams { get; set; }

    public decimal? SugarGrams { get; set; }

    public decimal? SodiumMilligrams { get; set; }

    public string? DataSource { get; set; }

    public bool IsVerified { get; set; }
}
  