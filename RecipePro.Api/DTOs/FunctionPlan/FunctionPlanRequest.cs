using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.FunctionPlan;

public class FunctionPlanRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public DateTime? EventDate { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    [Required]
    [MinLength(1)]
    public List<FunctionPlanRecipeRequest> Recipes { get; set; } = new();
}