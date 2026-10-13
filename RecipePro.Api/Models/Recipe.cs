using RecipePro.Api.Models.Common;
using RecipePro.Api.Models.Enums;

namespace RecipePro.Api.Models;

public class Recipe : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public long CategoryId { get; set; }

    public decimal? BaseCookedWeightGrams { get; set; }

    public int BaseServings { get; set; }

    public RecipeStatus Status { get; set; } = RecipeStatus.Draft;

    public string? PhotoUrl { get; set; }
    public Category Category { get; set; } = null!;

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; }
        = new List<RecipeIngredient>();

    public ICollection<RecipeProcedure> Procedures { get; set; }
        = new List<RecipeProcedure>();
}