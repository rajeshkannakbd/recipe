namespace RecipePro.Api.DTOs.FunctionPlan;

public class FunctionPlanRecipeResponse
{
    public long RecipeId { get; set; }

    public string RecipeName { get; set; } = string.Empty;

    public int BaseServings { get; set; }

    public int RequiredServings { get; set; }
}