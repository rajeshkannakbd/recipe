
using RecipePro.Api.Models.Common;

namespace RecipePro.Api.Models;

public class Chef : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Biography { get; set; }

    public string? PhotoUrl { get; set; }

    public string? SourceUrl { get; set; }

    public ICollection<Recipe> Recipes { get; set; }
        = new List<Recipe>();
}
