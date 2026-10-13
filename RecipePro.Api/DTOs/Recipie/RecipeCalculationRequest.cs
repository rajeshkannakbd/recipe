using System.ComponentModel.DataAnnotations;

namespace RecipePro.Api.DTOs.Recipe;

public class RecipeCalculationRequest
{
    [Range(1, int.MaxValue)]
    public int RequiredServings { get; set; }
}