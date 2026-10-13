using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class RecipeProcedure : AuditableEntity
{
    public long RecipeId { get; set; }

    public int StepNumber { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public Recipe Recipe { get; set; } = null!;
}