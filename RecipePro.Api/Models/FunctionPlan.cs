using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class FunctionPlan : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public DateTime? EventDate { get; set; }

    public string? Notes { get; set; }

    public string? UserId { get; set; }

    public ICollection<FunctionPlanRecipe> Recipes { get; set; }
        = new List<FunctionPlanRecipe>();
}