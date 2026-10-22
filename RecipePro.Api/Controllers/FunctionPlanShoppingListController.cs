using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.FunctionPlan;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/function-plans/{planId:long}/shopping-list")]
public class FunctionPlanShoppingListController : ControllerBase
{
    private readonly AppDbContext _context;

    public FunctionPlanShoppingListController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/function-plans/1/shopping-list
    [HttpGet]
    public async Task<ActionResult<FunctionPlanShoppingListResponse>> Get(
        long planId,
        CancellationToken cancellationToken)
    {
        var plan = await _context.FunctionPlans
            .AsNoTracking()
            .Include(x => x.Recipes)
                .ThenInclude(x => x.Recipe)
                    .ThenInclude(x => x.RecipeIngredients)
                        .ThenInclude(x => x.Ingredient)
            .FirstOrDefaultAsync(
                x => x.Id == planId,
                cancellationToken);

        if (plan is null)
        {
            return NotFound(new
            {
                message = "Function plan not found."
            });
        }

        var items = plan.Recipes
            .SelectMany(planRecipe =>
                planRecipe.Recipe.RecipeIngredients.Select(recipeIngredient =>
                    new
                    {
                        Ingredient = recipeIngredient.Ingredient,
                        IngredientId = recipeIngredient.IngredientId,
                        IngredientName = recipeIngredient.Ingredient.Name,
                        PhotoUrl = recipeIngredient.Ingredient.PhotoUrl,

                        Quantity = recipeIngredient.Quantity *
                            (decimal)planRecipe.RequiredServings /
                            planRecipe.Recipe.BaseServings,

                        Unit = recipeIngredient.Unit.Trim(),
                        RecipeName = planRecipe.Recipe.Name
                    }))
            .ToList();

        var groupedItems = items
            .GroupBy(x => new
            {
                x.IngredientId,
                UnitKey = NormalizeUnit(x.Unit)
            })
            .Select(group =>
            {
                var first = group.First();
                var ingredient = first.Ingredient;

                var totalQuantity = Math.Round(
                    group.Sum(x => x.Quantity),
                    3,
                    MidpointRounding.AwayFromZero);

                var cost = CalculateCost(
                    totalQuantity,
                    first.Unit,
                    ingredient.PurchasePrice,
                    ingredient.PurchaseQuantity,
                    ingredient.PurchaseUnit,
                    ingredient.GramsPerMilliliter,
                    ingredient.GramsPerPiece);

                return new ShoppingListItemResponse
                {
                    IngredientId = group.Key.IngredientId,
                    IngredientName = first.IngredientName,
                    PhotoUrl = first.PhotoUrl,

                    TotalQuantity = totalQuantity,
                    Unit = first.Unit,

                    UsedInRecipes = group
                        .Select(x => x.RecipeName)
                        .Distinct()
                        .OrderBy(x => x)
                        .ToList(),

                    PurchasePrice = ingredient.PurchasePrice,
                    PurchaseQuantity = ingredient.PurchaseQuantity,
                    PurchaseUnit = ingredient.PurchaseUnit,

                    UnitPrice = cost.HasValue && totalQuantity > 0
                        ? Math.Round(
                            cost.Value / totalQuantity,
                            2,
                            MidpointRounding.AwayFromZero)
                        : null,

                    EstimatedCost = cost,

                    IsPriceAvailable = cost.HasValue
                };
            })
            .OrderBy(x => x.IngredientName)
            .ThenBy(x => x.Unit)
            .ToList();

        var isTotalCostComplete = groupedItems.Count > 0 &&
            groupedItems.All(x => x.EstimatedCost.HasValue);

        decimal? totalEstimatedCost = isTotalCostComplete
            ? Math.Round(
                groupedItems.Sum(x => x.EstimatedCost!.Value),
                2,
                MidpointRounding.AwayFromZero)
            : null;

        return Ok(new FunctionPlanShoppingListResponse
        {
            FunctionPlanId = plan.Id,
            FunctionPlanName = plan.Name,
            RecipeCount = plan.Recipes.Count,
            Items = groupedItems,
            TotalEstimatedCost = totalEstimatedCost,
            IsTotalCostComplete = isTotalCostComplete
        });
    }

    private static decimal? CalculateCost(
        decimal requiredQuantity,
        string requiredUnit,
        decimal? purchasePrice,
        decimal? purchaseQuantity,
        string? purchaseUnit,
        decimal? gramsPerMilliliter,
        decimal? gramsPerPiece)
    {
              if (requiredQuantity < 0 ||
            !purchasePrice.HasValue ||
            !purchaseQuantity.HasValue ||
            string.IsNullOrWhiteSpace(purchaseUnit) ||
            purchasePrice.Value < 0 ||
            purchaseQuantity.Value <= 0)
        {
            return null;
        }

        if (!TryGetUnitFactor(
                requiredUnit,
                gramsPerMilliliter,
                gramsPerPiece,
                out var requiredFactor,
                out var requiredDimension))
        {
            return null;
        }

        if (!TryGetUnitFactor(
                purchaseUnit,
                gramsPerMilliliter,
                gramsPerPiece,
                out var purchaseFactor,
                out var purchaseDimension))
        {
            return null;
        }

        // Only calculate when both units represent the same dimension.
        if (requiredDimension != purchaseDimension)
        {
            return null;
        }

        var requiredBaseQuantity = requiredQuantity * requiredFactor;
        var purchasedBaseQuantity = purchaseQuantity.Value * purchaseFactor;

        if (purchasedBaseQuantity <= 0)
        {
            return null;
        }

        var cost = purchasePrice.Value *
            requiredBaseQuantity /
            purchasedBaseQuantity;

        return Math.Round(
            cost,
            2,
            MidpointRounding.AwayFromZero);
    }

    private static bool TryGetUnitFactor(
        string unit,
        decimal? gramsPerMilliliter,
        decimal? gramsPerPiece,
        out decimal factor,
        out string dimension)
    {
        var normalized = NormalizeUnit(unit);

        switch (normalized)
        {
            // Base unit: grams.
            case "g":
                factor = 1m;
                dimension = "weight";
                return true;

            case "kg":
                factor = 1000m;
                dimension = "weight";
                return true;

            // Base unit: millilitres.
            case "ml":
                factor = 1m;
                dimension = "volume";
                return true;

            case "l":
                factor = 1000m;
                dimension = "volume";
                return true;

            // Base unit: teaspoons.
            case "tsp":
                factor = 1m;
                dimension = "spoon";
                return true;

            case "tbsp":
                factor = 3m;
                dimension = "spoon";
                return true;

            // Base unit: pieces.
            case "piece":
            case "pieces":
            case "pc":
            case "pcs":
                factor = 1m;
                dimension = "piece";
                return true;

            default:
                factor = 0m;
                dimension = string.Empty;
                return false;
        }
    }

    private static string NormalizeUnit(string unit)
    {
        return unit.Trim().ToLowerInvariant() switch
        {
            "gram" or "grams" or "g" => "g",
            "kilogram" or "kilograms" or "kg" => "kg",

            "milliliter" or "milliliters" or
            "millilitre" or "millilitres" or "ml" => "ml",

            "liter" or "liters" or
            "litre" or "litres" or "l" => "l",

            "teaspoon" or "teaspoons" or "tsp" => "tsp",
            "tablespoon" or "tablespoons" or "tbsp" => "tbsp",

            "piece" or "pieces" or "pc" or "pcs" => "piece",

            _ => unit.Trim().ToLowerInvariant()
        };
    }
}