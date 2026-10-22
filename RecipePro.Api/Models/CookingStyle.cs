
using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class CookingStyle : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<Recipe> Recipes { get; set; }
        = new List<Recipe>();
}
