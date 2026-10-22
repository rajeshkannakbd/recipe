using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.Models;

public class RecipeTag
{
    public long Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    public ICollection<RecipeTagMapping> RecipeTags { get; set; }
        = new List<RecipeTagMapping>();
}