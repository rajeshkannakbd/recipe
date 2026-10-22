using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Chef;

public class ChefRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Biography { get; set; }

    [Url]
    [StringLength(500)]
    public string? PhotoUrl { get; set; }

    [Url]
    [StringLength(1000)]
    public string? SourceUrl { get; set; }
}