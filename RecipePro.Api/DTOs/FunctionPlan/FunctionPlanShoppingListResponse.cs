
namespace RecipePro.Api.DTOs.FunctionPlan;

public class FunctionPlanShoppingListResponse
{
    public long FunctionPlanId { get; set; }

    public string FunctionPlanName { get; set; } = string.Empty;

    public int RecipeCount { get; set; }

    public bool IsTotalCostComplete { get; set; }

    public decimal? TotalEstimatedCost { get; set; }

    public List<ShoppingListItemResponse> Items { get; set; } = new();
}
