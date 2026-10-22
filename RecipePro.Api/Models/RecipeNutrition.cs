
using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class RecipeNutrition : AuditableEntity
{
    public long RecipeId { get; set; }

    // Values are per serving.
    public decimal? CaloriesKcal { get; set; }

    public decimal? ProteinGrams { get; set; }

    public decimal? CarbohydratesGrams { get; set; }

    public decimal? FatGrams { get; set; }

    public decimal? FiberGrams { get; set; }

    public decimal? SugarGrams { get; set; }

    public decimal? SodiumMilligrams { get; set; }

    public string? DataSource { get; set; }

    public bool IsVerified { get; set; }

    public Recipe Recipe { get; set; } = null!;
}
