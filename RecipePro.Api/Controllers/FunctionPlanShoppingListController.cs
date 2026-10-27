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
            .Where(planRecipe =>
                planRecipe.Recipe.BaseServings > 0)
            .SelectMany(planRecipe =>
                planRecipe.Recipe.RecipeIngredients.Select(recipeIngredient =>
                {
                    var ingredient = recipeIngredient.Ingredient;

                    var originalUnit = NormalizeUnit(
                        recipeIngredient.Unit);

                    var canonicalUnit = GetCanonicalUnit(originalUnit);

                    var quantity =
                        recipeIngredient.Quantity *
                        (decimal)planRecipe.RequiredServings /
                        planRecipe.Recipe.BaseServings;

                    var canonicalQuantity = ConvertQuantity(
                        quantity,
                        originalUnit,
                        canonicalUnit);

                    return new
                    {
                        Ingredient = ingredient,
                        IngredientId = recipeIngredient.IngredientId,
                        IngredientName = ingredient.Name,
                        PhotoUrl = ingredient.PhotoUrl,
                        Quantity = canonicalQuantity,
                        Unit = canonicalUnit,
                        RecipeName = planRecipe.Recipe.Name
                    };
                }))
            .ToList();

        // Group by ingredient and canonical unit.
        // Example: 2 l + 9000 ml = 11000 ml = 11 l.
        var groupedItems = items
            .GroupBy(x => new
            {
                x.IngredientId,
                x.Unit
            })
            .Select(group =>
            {
                var first = group.First();
                var ingredient = first.Ingredient;

                var totalCanonicalQuantity = group.Sum(
                    x => x.Quantity);

                // Prefer litres and kilograms for display when the
                // total reaches at least one whole unit.
                var displayUnit = GetDisplayUnit(
                    group.Key.Unit,
                    totalCanonicalQuantity);

                var displayQuantity = ConvertQuantity(
                    totalCanonicalQuantity,
                    group.Key.Unit,
                    displayUnit);

                displayQuantity = Math.Round(
                    displayQuantity,
                    3,
                    MidpointRounding.AwayFromZero);

                // Calculate cost using the unrounded canonical quantity.
                var cost = CalculateCost(
                    totalCanonicalQuantity,
                    group.Key.Unit,
                    ingredient.PurchasePrice,
                    ingredient.PurchaseQuantity,
                    ingredient.PurchaseUnit,
                    ingredient.GramsPerMilliliter,
                    ingredient.GramsPerPiece);

                // Cost per displayed unit. Keep extra precision here
                // so small unit prices do not incorrectly become zero.
                decimal? unitPrice = cost.HasValue &&
                                     totalCanonicalQuantity > 0
                    ? cost.Value / displayQuantity
                    : null;

                return new ShoppingListItemResponse
                {
                    IngredientId = group.Key.IngredientId,
                    IngredientName = first.IngredientName,
                    PhotoUrl = first.PhotoUrl,

                    TotalQuantity = displayQuantity,
                    Unit = displayUnit,

                    UsedInRecipes = group
                        .Select(x => x.RecipeName)
                        .Distinct()
                        .OrderBy(x => x)
                        .ToList(),

                    PurchasePrice = ingredient.PurchasePrice,
                    PurchaseQuantity = ingredient.PurchaseQuantity,
                    PurchaseUnit = ingredient.PurchaseUnit,

                    UnitPrice = unitPrice.HasValue
                        ? Math.Round(
                            unitPrice.Value,
                            4,
                            MidpointRounding.AwayFromZero)
                        : null,

                    EstimatedCost = cost,
                    IsPriceAvailable = cost.HasValue
                };
            })
            .OrderBy(x => x.IngredientName)
            .ThenBy(x => x.Unit)
            .ToList();

        // Total cost is complete only when every item has a price.
        var isTotalCostComplete = groupedItems.Count > 0 &&
            groupedItems.All(x => x.EstimatedCost.HasValue);

        // Return the subtotal of available prices even when some
        // ingredient prices are missing.
        decimal? totalEstimatedCost = groupedItems.Any(
            x => x.EstimatedCost.HasValue)
            ? Math.Round(
                groupedItems
                    .Where(x => x.EstimatedCost.HasValue)
                    .Sum(x => x.EstimatedCost!.Value),
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

        if (requiredDimension != purchaseDimension)
        {
            return null;
        }

        var requiredBaseQuantity =
            requiredQuantity * requiredFactor;

        var purchasedBaseQuantity =
            purchaseQuantity.Value * purchaseFactor;

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
        switch (NormalizeUnit(unit))
        {
            case "g":
                factor = 1m;
                dimension = "weight";
                return true;

            case "kg":
                factor = 1000m;
                dimension = "weight";
                return true;

            case "ml":
                factor = 1m;
                dimension = "volume";
                return true;

            case "l":
                factor = 1000m;
                dimension = "volume";
                return true;

            case "tsp":
                factor = 1m;
                dimension = "spoon";
                return true;

            case "tbsp":
                factor = 3m;
                dimension = "spoon";
                return true;

            case "piece":
                factor = 1m;
                dimension = "piece";
                return true;

            default:
                factor = 0m;
                dimension = string.Empty;
                return false;
        }
    }

    private static string GetCanonicalUnit(string unit)
    {
        return NormalizeUnit(unit) switch
        {
            "kg" or "g" => "g",
            "l" or "ml" => "ml",
            "tsp" or "tbsp" => "tsp",
            "piece" => "piece",
            _ => NormalizeUnit(unit)
        };
    }

    private static string GetDisplayUnit(
        string canonicalUnit,
        decimal quantity)
    {
        return canonicalUnit switch
        {
            "g" when quantity >= 1000m => "kg",
            "g" => "g",

            "ml" when quantity >= 1000m => "l",
            "ml" => "ml",

            "tsp" when quantity >= 3m => "tbsp",
            "tsp" => "tsp",

            _ => canonicalUnit
        };
    }

    private static decimal ConvertQuantity(
        decimal quantity,
        string fromUnit,
        string toUnit)
    {
        fromUnit = NormalizeUnit(fromUnit);
        toUnit = NormalizeUnit(toUnit);

        if (fromUnit == toUnit)
        {
            return quantity;
        }

        // Weight conversions.
        if (fromUnit == "kg" && toUnit == "g")
            return quantity * 1000m;

        if (fromUnit == "g" && toUnit == "kg")
            return quantity / 1000m;

        // Volume conversions.
        if (fromUnit == "l" && toUnit == "ml")
            return quantity * 1000m;

        if (fromUnit == "ml" && toUnit == "l")
            return quantity / 1000m;

        // Spoon conversions: 1 tbsp = 3 tsp.
        if (fromUnit == "tbsp" && toUnit == "tsp")
            return quantity * 3m;

        if (fromUnit == "tsp" && toUnit == "tbsp")
            return quantity / 3m;

        // Unknown or incompatible units cannot be converted safely.
        throw new InvalidOperationException(
            $"Cannot convert from '{fromUnit}' to '{toUnit}'.");
    }

    private static string NormalizeUnit(string unit)
    {
        return (unit ?? string.Empty).Trim().ToLowerInvariant() switch
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
