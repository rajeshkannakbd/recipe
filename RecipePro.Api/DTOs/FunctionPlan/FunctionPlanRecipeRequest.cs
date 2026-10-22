using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.FunctionPlan;

public class FunctionPlanRecipeRequest
{
    [Range(1, long.MaxValue)]
    public long RecipeId { get; set; }

    [Range(1, 100000)]
    public int RequiredServings { get; set; }
}