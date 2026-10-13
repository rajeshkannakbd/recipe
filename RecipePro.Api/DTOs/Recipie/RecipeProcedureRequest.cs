using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeProcedureRequest
{
    [Range(1, int.MaxValue)]
    public int StepNumber { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(2000, MinimumLength = 2)]
    public string Description { get; set; } = string.Empty;
}