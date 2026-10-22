using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class FunctionPlanRecipe : AuditableEntity
{
    public long FunctionPlanId { get; set; }

    public FunctionPlan FunctionPlan { get; set; } = null!;

    public long RecipeId { get; set; }

    public Recipe Recipe { get; set; } = null!;

    public int RequiredServings { get; set; }
}