using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class Cuisine : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Recipe> Recipes { get; set; }
        = new List<Recipe>();
}