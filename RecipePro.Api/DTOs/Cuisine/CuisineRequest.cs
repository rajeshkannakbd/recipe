using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Cuisine;

public class CuisineRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
}