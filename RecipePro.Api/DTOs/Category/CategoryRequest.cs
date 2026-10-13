using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Category;

public class CategoryRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }
}