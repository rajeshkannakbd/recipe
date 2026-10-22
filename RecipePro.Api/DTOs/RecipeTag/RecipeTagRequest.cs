using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.RecipeTag;

public class RecipeTagRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
}