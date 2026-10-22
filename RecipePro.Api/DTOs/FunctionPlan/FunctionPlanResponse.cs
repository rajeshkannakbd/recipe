namespace RecipePro.Api.DTOs.FunctionPlan;

public class FunctionPlanResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime? EventDate { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<FunctionPlanRecipeResponse> Recipes { get; set; } = new();
}