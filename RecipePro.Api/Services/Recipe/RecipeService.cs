using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.Models;
using Microsoft.AspNetCore.Http;
using RecipePro.Api.Services.Images;
using RecipePro.Api.DTOs.RecipeTag;
using RecipePro.Api.Services.Prices;

namespace RecipePro.Api.Services.Recipe;

public class RecipeService : IRecipeService
{
    private readonly AppDbContext _context;
    private readonly IImageService _imageService;
    private readonly IMandiPriceService _mandiPriceService;

    public RecipeService(
        AppDbContext context,
        IImageService imageService,
        IMandiPriceService mandiPriceService)
    {
        _context = context;
        _imageService = imageService;
        _mandiPriceService = mandiPriceService;
    }
    public async Task<RecipeResponse> CreateAsync(
        RecipeRequest request)
    {
        var categoryExists = await _context.Categories
            .AnyAsync(x => x.Id == request.CategoryId);

        if (!categoryExists)
        {
            throw new InvalidOperationException(
                "The selected category does not exist.");
        }

        await ValidateRecipeMetadataAsync(request);
        await ValidateTagIdsAsync(request.TagIds);
        await ValidateCuisineIdAsync(request.CuisineId);

        var ingredientIds = request.Ingredients
            .Select(x => x.IngredientId)
            .ToList();

        var ingredients = await _context.Ingredients
            .Where(x => ingredientIds.Contains(x.Id))
            .ToListAsync();

        if (ingredients.Count != ingredientIds.Distinct().Count())
        {
            throw new InvalidOperationException(
                "One or more selected ingredients do not exist.");
        }

        var duplicateIngredients = request.Ingredients
            .GroupBy(x => x.IngredientId)
            .Any(x => x.Count() > 1);

        if (duplicateIngredients)
        {
            throw new InvalidOperationException(
                "The same ingredient cannot be added more than once.");
        }

        var duplicateSteps = request.Procedures
            .GroupBy(x => x.StepNumber)
            .Any(x => x.Count() > 1);

        if (duplicateSteps)
        {
            throw new InvalidOperationException(
                "Procedure step numbers must be unique.");
        }

        var recipe = new Models.Recipe
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CategoryId = request.CategoryId,
            BaseServings = request.BaseServings,
            BaseCookedWeightGrams = request.BaseCookedWeightGrams,
            Status = request.Status,
            PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl)
                            ? null
                            : request.PhotoUrl.Trim(),
            CuisineId = request.CuisineId,
            MealType = request.MealType?.Trim(),
            ChefId = request.ChefId,
            CookingStyleId = request.CookingStyleId,
            PreparationTimeMinutes = request.PreparationTimeMinutes,
            CookingTimeMinutes = request.CookingTimeMinutes,
            StorageInstructions = request.StorageInstructions?.Trim(),
            ShelfLifeHours = request.ShelfLifeHours,
            SourceName = request.SourceName?.Trim(),
            SourceUrl = request.SourceUrl?.Trim()
        };

        foreach (var item in request.Ingredients)
        {
            recipe.RecipeIngredients.Add(
                new RecipeIngredient
                {
                    IngredientId = item.IngredientId,
                    Quantity = item.Quantity,
                    Unit = item.Unit.Trim()
                });
        }

        foreach (var procedure in request.Procedures)
        {
            recipe.Procedures.Add(
                new RecipeProcedure
                {
                    StepNumber = procedure.StepNumber,
                    Title = procedure.Title.Trim(),
                    Description = procedure.Description.Trim()
                });
        }

        foreach (var tagId in request.TagIds.Distinct())
        {
            recipe.RecipeTags.Add(new RecipeTagMapping
            {
                RecipeTagId = tagId
            });
        }

        _context.Recipes.Add(recipe);

        await _context.SaveChangesAsync();

        return await GetResponseAsync(recipe.Id);
    }

    private async Task<RecipeResponse> GetResponseAsync(long id)
    {
        var recipe = await _context.Recipes
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.RecipeIngredients)
                .ThenInclude(x => x.Ingredient)
            .Include(x => x.Procedures)
            .Include(x => x.Chef)
            .Include(x => x.CookingStyle)
            .Include(x => x.CuisineEntity)
            .Include(x => x.RecipeTags)
            .ThenInclude(x => x.RecipeTag)
            .FirstAsync(x => x.Id == id);

        return new RecipeResponse
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Description = recipe.Description,
            CategoryId = recipe.CategoryId,
            CategoryName = recipe.Category.Name,
            BaseServings = recipe.BaseServings,
            BaseCookedWeightGrams = recipe.BaseCookedWeightGrams,
            Status = recipe.Status.ToString(),
            PhotoUrl = recipe.PhotoUrl,
            CreatedAt = recipe.CreatedAt,
            UpdatedAt = recipe.UpdatedAt,
            Cuisine = recipe.Cuisine,
            MealType = recipe.MealType,

            ChefId = recipe.ChefId,
            ChefName = recipe.Chef?.Name,

            CookingStyleId = recipe.CookingStyleId,
            CookingStyleName = recipe.CookingStyle?.Name,

            PreparationTimeMinutes = recipe.PreparationTimeMinutes,
            CookingTimeMinutes = recipe.CookingTimeMinutes,

            StorageInstructions = recipe.StorageInstructions,
            ShelfLifeHours = recipe.ShelfLifeHours,

            SourceName = recipe.SourceName,
            SourceUrl = recipe.SourceUrl,

            Tags = recipe.RecipeTags
            .Select(x => new RecipeTagResponse
            {
                Id = x.RecipeTag.Id,
                Name = x.RecipeTag.Name
            })
            .OrderBy(x => x.Name)
            .ToList(),

            Ingredients = recipe.RecipeIngredients
                .OrderBy(x => x.Id)
                .Select(x => new RecipeIngredientResponse
                {
                    IngredientId = x.IngredientId,
                    IngredientName = x.Ingredient.Name,
                    IngredientPhotoUrl =
                        x.Ingredient.PhotoUrl ?? string.Empty,
                    Quantity = x.Quantity,
                    Unit = x.Unit
                })

                .ToList(),

            Procedures = recipe.Procedures
                .OrderBy(x => x.StepNumber)
                .Select(x => new RecipeProcedureResponse
                {
                    StepNumber = x.StepNumber,
                    Title = x.Title,
                    Description = x.Description
                })
                .ToList()
        };
    }
 
public async Task<List<RecipeResponse>> GetAllAsync()
{
    // Load recipes and related collections without tracking.
    // SplitQuery avoids one large JOIN across multiple collections.
    var recipes = await _context.Recipes
        .AsNoTracking()
        .AsSplitQuery()
        .Include(x => x.Category)
        .Include(x => x.RecipeIngredients)
            .ThenInclude(x => x.Ingredient)
        .Include(x => x.Procedures)
        .Include(x => x.Chef)
        .Include(x => x.CookingStyle)
        .Include(x => x.CuisineEntity)
        .Include(x => x.RecipeTags)
            .ThenInclude(x => x.RecipeTag)
        .OrderBy(x => x.Name)
        .ToListAsync();

    // Collect all distinct tag IDs from the loaded recipes.
    var tagIds = recipes
        .SelectMany(r => r.RecipeTags)
        .Select(t => t.RecipeTagId)
        .Distinct()
        .ToList();

    // Count recipes per tag in one grouped query instead of
    // issuing a separate COUNT query for every tag.
    var tagCounts = await _context.RecipeTagMappings
        .AsNoTracking()
        .Where(m => tagIds.Contains(m.RecipeTagId))
        .GroupBy(m => m.RecipeTagId)
        .Select(g => new
        {
            TagId = g.Key,
            RecipeCount = g.Count()
        })
        .ToDictionaryAsync(x => x.TagId, x => x.RecipeCount);

    var recipeIds = recipes.Select(recipe => recipe.Id).ToList();
    var reviewStats = recipeIds.Count == 0
        ? new Dictionary<long, (double AverageRating, int ReviewCount)>()
        : await _context.RecipeReviews
            .AsNoTracking()
            .Where(review => recipeIds.Contains(review.RecipeId))
            .GroupBy(review => review.RecipeId)
            .Select(group => new
            {
                RecipeId = group.Key,
                AverageRating = group.Average(review => (double)review.Rating),
                ReviewCount = group.Count()
            })
            .ToDictionaryAsync(
                item => item.RecipeId,
                item => (item.AverageRating, item.ReviewCount));

    return recipes.Select(recipe => new RecipeResponse
    {
        Id = recipe.Id,
        Name = recipe.Name,
        Description = recipe.Description,
        CategoryId = recipe.CategoryId,
        CategoryName = recipe.Category.Name,
        BaseServings = recipe.BaseServings,
        BaseCookedWeightGrams = recipe.BaseCookedWeightGrams,
        Status = recipe.Status.ToString(),
        PhotoUrl = recipe.PhotoUrl,
        CreatedAt = recipe.CreatedAt,
        UpdatedAt = recipe.UpdatedAt,
        AverageRating = reviewStats.GetValueOrDefault(recipe.Id).AverageRating,
        ReviewCount = reviewStats.GetValueOrDefault(recipe.Id).ReviewCount,
        Cuisine = recipe.Cuisine,
        MealType = recipe.MealType,

        ChefId = recipe.ChefId,
        ChefName = recipe.Chef?.Name,

        CookingStyleId = recipe.CookingStyleId,
        CookingStyleName = recipe.CookingStyle?.Name,

        PreparationTimeMinutes = recipe.PreparationTimeMinutes,
        CookingTimeMinutes = recipe.CookingTimeMinutes,

        StorageInstructions = recipe.StorageInstructions,
        ShelfLifeHours = recipe.ShelfLifeHours,

        SourceName = recipe.SourceName,
        SourceUrl = recipe.SourceUrl,

        Tags = recipe.RecipeTags
            .Select(x => new RecipeTagResponse
            {
                Id = x.RecipeTag.Id,
                Name = x.RecipeTag.Name,
                RecipeCount = tagCounts.TryGetValue(
                    x.RecipeTagId, out var count)
                    ? count
                    : 0
            })
            .OrderBy(x => x.Name)
            .ToList(),

        Ingredients = recipe.RecipeIngredients
            .OrderBy(x => x.Id)
            .Select(x => new RecipeIngredientResponse
            {
                IngredientId = x.IngredientId,
                IngredientName = x.Ingredient.Name,
                IngredientPhotoUrl =
                    x.Ingredient.PhotoUrl ?? string.Empty,
                Quantity = x.Quantity,
                Unit = x.Unit
            })
            .ToList(),

        Procedures = recipe.Procedures
            .OrderBy(x => x.StepNumber)
            .Select(x => new RecipeProcedureResponse
            {
                StepNumber = x.StepNumber,
                Title = x.Title,
                Description = x.Description
            })
            .ToList()
    }).ToList();
}
public async Task<RecipeResponse?> GetByIdAsync(long id)
    {
        var recipe = await _context.Recipes
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.RecipeIngredients)
                .ThenInclude(x => x.Ingredient)
            .Include(x => x.Procedures)
            .Include(x => x.Chef)
            .Include(x => x.CookingStyle)
            .Include(x => x.CuisineEntity)
            .Include(x => x.RecipeTags)
            .ThenInclude(x => x.RecipeTag)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (recipe == null)
        {
            return null;
        }

        return new RecipeResponse
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Description = recipe.Description,
            CategoryId = recipe.CategoryId,
            CategoryName = recipe.Category.Name,
            BaseServings = recipe.BaseServings,
            BaseCookedWeightGrams = recipe.BaseCookedWeightGrams,
            Status = recipe.Status.ToString(),
            PhotoUrl = recipe.PhotoUrl,
            CreatedAt = recipe.CreatedAt,
            UpdatedAt = recipe.UpdatedAt,
            Cuisine = recipe.Cuisine,
            MealType = recipe.MealType,

            ChefId = recipe.ChefId,
            ChefName = recipe.Chef?.Name,

            CookingStyleId = recipe.CookingStyleId,
            CookingStyleName = recipe.CookingStyle?.Name,

            PreparationTimeMinutes = recipe.PreparationTimeMinutes,
            CookingTimeMinutes = recipe.CookingTimeMinutes,

            StorageInstructions = recipe.StorageInstructions,
            ShelfLifeHours = recipe.ShelfLifeHours,

            SourceName = recipe.SourceName,
            SourceUrl = recipe.SourceUrl,
            Tags = recipe.RecipeTags
            .Select(x => new RecipeTagResponse
            {
                Id = x.RecipeTag.Id,
                Name = x.RecipeTag.Name,
                RecipeCount = _context.RecipeTagMappings
            .Count(m => m.RecipeTagId == x.RecipeTag.Id)
            })
            .OrderBy(x => x.Name)
            .ToList(),

            Ingredients = recipe.RecipeIngredients
                .OrderBy(x => x.Id)
                .Select(x => new RecipeIngredientResponse
                {
                    IngredientId = x.IngredientId,
                    IngredientName = x.Ingredient.Name,
                    IngredientPhotoUrl =
                        x.Ingredient.PhotoUrl ?? string.Empty,
                    Quantity = x.Quantity,
                    Unit = x.Unit
                })
                .ToList(),

            Procedures = recipe.Procedures
                .OrderBy(x => x.StepNumber)
                .Select(x => new RecipeProcedureResponse
                {
                    StepNumber = x.StepNumber,
                    Title = x.Title,
                    Description = x.Description
                })
                .ToList()
        };
    }


    public async Task<RecipeCalculationResponse?> CalculateAsync(
        long id,
        RecipeCalculationRequest request)
    {
        var recipe = await _context.Recipes
            .AsNoTracking()
            .Include(x => x.RecipeIngredients)
                .ThenInclude(x => x.Ingredient)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (recipe == null)
        {
            return null;
        }

        if (recipe.BaseServings <= 0)
        {
            throw new InvalidOperationException(
                "Base servings must be greater than zero.");
        }

        if (request.RequiredServings <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(request.RequiredServings),
                "Required servings must be greater than zero.");
        }

        decimal multiplier =
            (decimal)request.RequiredServings / recipe.BaseServings;

        decimal totalWeightGrams = 0m;
        bool isWeightEstimateComplete = true;

        decimal? estimatedCookedWeightGrams =
            recipe.BaseCookedWeightGrams.HasValue
                ? Math.Round(
                    recipe.BaseCookedWeightGrams.Value * multiplier,
                    2,
                    MidpointRounding.AwayFromZero)
                : null;

        var calculatedIngredients =
            new List<CalculatedIngredientResponse>();

        foreach (var x in recipe.RecipeIngredients.OrderBy(x => x.Id))
        {
            decimal calculatedQuantity = Math.Round(
                x.Quantity * multiplier * 4m,
                MidpointRounding.AwayFromZero) / 4m;

            decimal? scaledWastageQuantity = null;
            string? scaledWastageUnit = null;

            if (x.Ingredient.WastageQuantity.HasValue &&
                x.Ingredient.WastageQuantity.Value > 0 &&
                !string.IsNullOrWhiteSpace(x.Ingredient.WastageUnit) &&
                x.Quantity > 0)
            {
                scaledWastageQuantity = Math.Round(
                    (calculatedQuantity / x.Quantity) *
                    x.Ingredient.WastageQuantity.Value,
                    2,
                    MidpointRounding.AwayFromZero);

                scaledWastageUnit = x.Ingredient.WastageUnit.Trim();
            }

            // Fetch a live mandi price. If the government API has no matching
            // record or is unavailable, keep the cost null rather than inventing
            // a price or silently using an unrelated stored price.
            var mandiPrice = await _mandiPriceService.GetPriceAsync(
                x.Ingredient.Name);

            if (mandiPrice is null)
            {
                Console.WriteLine(
                    $"[MANDI PRICE] No price returned for {x.Ingredient.Name}");
            }

            decimal? estimatedCost = null;
            string priceSource = "Unavailable";

            // Prefer a valid government mandi price. If it cannot calculate a
            // cost for this recipe unit, try the admin's saved purchase details.
            if (mandiPrice is not null)
            {
                estimatedCost = CalculateIngredientCost(
                    calculatedQuantity,
                    x.Unit,
                    mandiPrice.PricePerKg,
                    1m,
                    "kg");

                if (estimatedCost.HasValue)
                {
                    priceSource = "GovernmentApi";
                }
            }

            if (!estimatedCost.HasValue)
            {
                if (x.Ingredient.PurchasePrice.HasValue &&
                    x.Ingredient.PurchaseQuantity.HasValue &&
                    !string.IsNullOrWhiteSpace(x.Ingredient.PurchaseUnit))
                {
                    estimatedCost = CalculateIngredientCost(
                        calculatedQuantity,
                        x.Unit,
                        x.Ingredient.PurchasePrice.Value,
                        x.Ingredient.PurchaseQuantity.Value,
                        x.Ingredient.PurchaseUnit);
                }

                if (estimatedCost.HasValue)
                {
                    priceSource = "Admin";
                }
            }

            if (mandiPrice is not null)
            {
                Console.WriteLine(
                    $"[MANDI PRICE] {mandiPrice.Commodity} | " +
                    $"Market: {mandiPrice.Market} | " +
                    $"District: {mandiPrice.District} | " +
                    $"Arrival date: {mandiPrice.ArrivalDate} | " +
                    $"Price/kg: ₹{mandiPrice.PricePerKg} | " +
                    $"Ingredient cost: {estimatedCost?.ToString() ?? "N/A"}");
            }

            var converted = ConvertQuantity(
                calculatedQuantity,
                x.Unit);

            string unit = converted.Unit
                .Trim()
                .ToLowerInvariant();

            decimal quantity = converted.Quantity;

            decimal? ingredientWeightGrams = unit switch
            {
                "g" or "gram" or "grams" => quantity,

                "kg" or "kilogram" or "kilograms"
                    => quantity * 1000m,

                "ml" or "milliliter" or "milliliters"
                    when x.Ingredient.GramsPerMilliliter.HasValue
                    => quantity * x.Ingredient.GramsPerMilliliter.Value,

                "l" or "liter" or "liters"
                    when x.Ingredient.GramsPerMilliliter.HasValue
                    => quantity * 1000m *
                       x.Ingredient.GramsPerMilliliter.Value,

                "tsp" or "teaspoon" or "teaspoons"
                    when x.Ingredient.GramsPerMilliliter.HasValue
                    => quantity * 5m *
                       x.Ingredient.GramsPerMilliliter.Value,

                "tbsp" or "tablespoon" or "tablespoons"
                    when x.Ingredient.GramsPerMilliliter.HasValue
                    => quantity * 15m *
                       x.Ingredient.GramsPerMilliliter.Value,

                "piece" or "pieces" or "pc" or "pcs"
                    when x.Ingredient.GramsPerPiece.HasValue
                    => quantity * x.Ingredient.GramsPerPiece.Value,

                _ => null
            };

            if (ingredientWeightGrams.HasValue)
            {
                totalWeightGrams += ingredientWeightGrams.Value;
            }
            else
            {
                isWeightEstimateComplete = false;
            }

            calculatedIngredients.Add(new CalculatedIngredientResponse
            {
                IngredientId = x.IngredientId,
                IngredientName = x.Ingredient.Name,
                IngredientPhotoUrl = x.Ingredient.PhotoUrl ?? string.Empty,
                BaseQuantity = x.Quantity,
                RequiredQuantity = converted.Quantity,
                Unit = converted.Unit,
                EstimatedCost = estimatedCost,
                PriceSource = priceSource,
                PriceMarket = priceSource == "GovernmentApi" ? mandiPrice?.Market : null,
                PriceDistrict = priceSource == "GovernmentApi" ? mandiPrice?.District : null,
                PriceArrivalDate = priceSource == "GovernmentApi" ? mandiPrice?.ArrivalDate : null,
                WastageQuantity = scaledWastageQuantity,
                WastageUnit = scaledWastageUnit,
            });
        }

        bool isCostEstimateComplete =
            calculatedIngredients.All(x => x.EstimatedCost.HasValue);

        var availableCosts = calculatedIngredients
            .Where(x => x.EstimatedCost.HasValue)
            .Select(x => x.EstimatedCost!.Value)
            .ToList();

        decimal? estimatedTotalCost = availableCosts.Count > 0
            ? Math.Round(
                availableCosts.Sum(),
                2,
                MidpointRounding.AwayFromZero)
            : null;

        return new RecipeCalculationResponse
        {
            RecipeId = recipe.Id,
            RecipeName = recipe.Name,
            BaseServings = recipe.BaseServings,
            RequiredServings = request.RequiredServings,

            EstimatedCookedWeightGrams = estimatedCookedWeightGrams,

            EstimatedTotalWeightGrams = isWeightEstimateComplete
                ? Math.Round(
                    totalWeightGrams,
                    2,
                    MidpointRounding.AwayFromZero)
                : null,

            IsWeightEstimateComplete = isWeightEstimateComplete,
            EstimatedTotalCost = estimatedTotalCost,
            IsCostEstimateComplete = isCostEstimateComplete,
            Ingredients = calculatedIngredients
        };
    }

    private static decimal? CalculateIngredientCost(
        decimal requiredQuantity,
        string recipeUnit,
        decimal purchasePrice,
        decimal purchaseQuantity,
        string purchaseUnit)
    {
        if (purchasePrice < 0m || purchaseQuantity <= 0m)
        {
            return null;
        }

        static string NormalizeUnit(string unit)
        {
            return unit.Trim().ToLowerInvariant() switch
            {
                "gram" or "grams" => "g",
                "kilogram" or "kilograms" => "kg",
                "milliliter" or "milliliters" => "ml",
                "liter" or "liters" => "l",
                "teaspoon" or "teaspoons" => "tsp",
                "tablespoon" or "tablespoons" => "tbsp",
                "piece" or "pieces" or "pc" or "pcs" => "piece",
                _ => unit.Trim().ToLowerInvariant()
            };
        }

        static decimal? ToBaseQuantity(decimal quantity, string unit)
        {
            return NormalizeUnit(unit) switch
            {
                "g" => quantity,
                "kg" => quantity * 1000m,
                "ml" => quantity,
                "l" => quantity * 1000m,
                "tsp" => quantity * 5m,
                "tbsp" => quantity * 15m,
                "piece" => quantity,
                _ => null
            };
        }

        string normalizedRecipeUnit = NormalizeUnit(recipeUnit);
        string normalizedPurchaseUnit = NormalizeUnit(purchaseUnit);

        bool recipeIsWeight = normalizedRecipeUnit is "g" or "kg";
        bool purchaseIsWeight = normalizedPurchaseUnit is "g" or "kg";

        bool recipeIsVolume =
            normalizedRecipeUnit is "ml" or "l" or "tsp" or "tbsp";
        bool purchaseIsVolume =
            normalizedPurchaseUnit is "ml" or "l" or "tsp" or "tbsp";

        bool recipeIsPiece = normalizedRecipeUnit == "piece";
        bool purchaseIsPiece = normalizedPurchaseUnit == "piece";

        // Mandi prices are converted to ₹/kg. Do not estimate costs for
        // volume or piece units unless a reliable conversion is available.
        if ((recipeIsWeight && !purchaseIsWeight) ||
            (recipeIsVolume && !purchaseIsVolume) ||
            (recipeIsPiece && !purchaseIsPiece))
        {
            return null;
        }

        decimal? requiredBase = ToBaseQuantity(
            requiredQuantity,
            normalizedRecipeUnit);

        decimal? purchaseBase = ToBaseQuantity(
            purchaseQuantity,
            normalizedPurchaseUnit);

        if (!requiredBase.HasValue ||
            !purchaseBase.HasValue ||
            purchaseBase.Value <= 0m)
        {
            return null;
        }

        decimal cost =
            requiredBase.Value / purchaseBase.Value * purchasePrice;

        return Math.Round(
            cost,
            2,
            MidpointRounding.AwayFromZero);
    }

    private static (decimal Quantity, string Unit) ConvertQuantity(
            decimal quantity,
            string unit)
    {
        unit = unit.Trim().ToLowerInvariant();

        // Weight: grams to kilograms
        if (unit is "g" or "gram" or "grams")
        {
            if (quantity >= 1000)
            {
                return (
                    Math.Round(
                        (quantity / 1000m) * 4,
                        MidpointRounding.AwayFromZero
                    ) / 4,
                    "kg"
                );
            }

            return (
                Math.Round(quantity, 2),
                "g"
            );
        }

        // Volume: milliliters to liters
        if (unit is "ml" or "milliliter" or "milliliters")
        {
            if (quantity >= 1000)
            {
                return (
                    Math.Round(
                        (quantity / 1000m) * 4,
                        MidpointRounding.AwayFromZero
                    ) / 4,
                    "L"
                );
            }

            return (
                Math.Round(quantity, 2),
                "ml"
            );
        }

        // Teaspoons to tablespoons
        // 1 tablespoon = 3 teaspoons
        if (unit is "tsp" or "teaspoon" or "teaspoons")
        {
            if (quantity >= 3)
            {
                // Calculate the exact raw conversion first
                decimal totalTablespoons = quantity / 3m;

                // Round up or down to the nearest whole number with no decimals
                decimal roundedTablespoons = Math.Round(totalTablespoons, 0, MidpointRounding.AwayFromZero);

                return (roundedTablespoons, "tbsp");
            }

            return (
                Math.Round(quantity, 0, MidpointRounding.AwayFromZero),
                "tsp"
            );
        }



        // Other units remain unchanged.
        return (
            Math.Round(quantity, 2),
            unit
        );
    }
    public async Task<RecipeResponse?> UpdateAsync(
                long id,
                RecipeRequest request)
    {
        var recipe = await _context.Recipes
            .Include(x => x.RecipeIngredients)
            .Include(x => x.Procedures)
            .Include(x => x.RecipeTags)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (recipe == null)
        {
            return null;
        }

        // Check category
        var categoryExists = await _context.Categories
            .AnyAsync(x => x.Id == request.CategoryId);

        if (!categoryExists)
        {
            throw new InvalidOperationException(
                "The selected category does not exist.");
        }

        await ValidateRecipeMetadataAsync(request);
        await ValidateTagIdsAsync(request.TagIds);
        await ValidateCuisineIdAsync(request.CuisineId);

        // Check ingredients
        var ingredientIds = request.Ingredients
            .Select(x => x.IngredientId)
            .ToList();

        var existingIngredientCount = await _context.Ingredients
            .CountAsync(x => ingredientIds.Contains(x.Id));

        if (existingIngredientCount != ingredientIds.Distinct().Count())
        {
            throw new InvalidOperationException(
                "One or more selected ingredients do not exist.");
        }

        // Duplicate ingredients
        var duplicateIngredients = request.Ingredients
            .GroupBy(x => x.IngredientId)
            .Any(x => x.Count() > 1);

        if (duplicateIngredients)
        {
            throw new InvalidOperationException(
                "The same ingredient cannot be added more than once.");
        }

        // Duplicate procedure steps
        var duplicateSteps = request.Procedures
            .GroupBy(x => x.StepNumber)
            .Any(x => x.Count() > 1);

        if (duplicateSteps)
        {
            throw new InvalidOperationException(
                "Procedure step numbers must be unique.");
        }

        // Update recipe fields
        recipe.Name = request.Name.Trim();
        recipe.Description = request.Description?.Trim();
        recipe.CategoryId = request.CategoryId;
        recipe.BaseServings = request.BaseServings;
        recipe.BaseCookedWeightGrams = request.BaseCookedWeightGrams;
        recipe.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.PhotoUrl))
        {
            recipe.PhotoUrl = request.PhotoUrl.Trim();
        }
        recipe.CuisineId = request.CuisineId;
        recipe.MealType = request.MealType?.Trim();
        recipe.ChefId = request.ChefId;
        recipe.CookingStyleId = request.CookingStyleId;
        recipe.PreparationTimeMinutes = request.PreparationTimeMinutes;
        recipe.CookingTimeMinutes = request.CookingTimeMinutes;
        recipe.StorageInstructions = request.StorageInstructions?.Trim();
        recipe.ShelfLifeHours = request.ShelfLifeHours;
        recipe.SourceName = request.SourceName?.Trim();
        recipe.SourceUrl = request.SourceUrl?.Trim();


        // Remove old ingredients
        _context.RecipeIngredients.RemoveRange(
            recipe.RecipeIngredients);

        // Add updated ingredients
        foreach (var item in request.Ingredients)
        {
            recipe.RecipeIngredients.Add(
                new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = item.IngredientId,
                    Quantity = item.Quantity,
                    Unit = item.Unit.Trim()
                });
        }

        // Remove old procedures
        _context.RecipeProcedures.RemoveRange(
            recipe.Procedures);

        // Add updated procedures
        foreach (var procedure in request.Procedures)
        {
            recipe.Procedures.Add(
                new RecipeProcedure
                {
                    RecipeId = recipe.Id,
                    StepNumber = procedure.StepNumber,
                    Title = procedure.Title.Trim(),
                    Description = procedure.Description.Trim()
                });
        }

        _context.RecipeTagMappings.RemoveRange(recipe.RecipeTags);
        recipe.RecipeTags.Clear();

        // Add the updated tag mappings.
        foreach (var tagId in request.TagIds.Distinct())
        {
            recipe.RecipeTags.Add(new RecipeTagMapping
            {
                RecipeId = recipe.Id,
                RecipeTagId = tagId
            });
        }

        await _context.SaveChangesAsync();

        return await GetResponseAsync(recipe.Id);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var recipe = await _context.Recipes
            .FirstOrDefaultAsync(x => x.Id == id);

        if (recipe == null)
        {
            return false;
        }

        _context.Recipes.Remove(recipe);

        await _context.SaveChangesAsync();

        return true;
    }
    public async Task<RecipeResponse?> UploadImageAsync(
        long id,
        IFormFile file)
    {
        var recipe = await _context.Recipes
            .FirstOrDefaultAsync(x => x.Id == id);

        if (recipe == null)
        {
            return null;
        }

        var imageUrl =
            await _imageService.UploadRecipeImageAsync(file);

        recipe.PhotoUrl = imageUrl;



        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }
    private async Task ValidateRecipeMetadataAsync(RecipeRequest request)
    {
        if (request.ChefId.HasValue)
        {
            var chefExists = await _context.Chefs
                .AnyAsync(x => x.Id == request.ChefId.Value);

            if (!chefExists)
            {
                throw new InvalidOperationException(
                    "The selected chef does not exist.");
            }
        }

        if (request.CookingStyleId.HasValue)
        {
            var cookingStyleExists = await _context.CookingStyles
                .AnyAsync(x => x.Id == request.CookingStyleId.Value);

            if (!cookingStyleExists)
            {
                throw new InvalidOperationException(
                    "The selected cooking style does not exist.");
            }
        }
    }
    private async Task ValidateTagIdsAsync(List<long> tagIds)
    {
        var distinctTagIds = tagIds.Distinct().ToList();

        if (distinctTagIds.Any(id => id <= 0))
        {
            throw new InvalidOperationException(
                "Tag IDs must be greater than zero.");
        }

        var existingCount = await _context.RecipeTags
            .CountAsync(x => distinctTagIds.Contains(x.Id));

        if (existingCount != distinctTagIds.Count)
        {
            throw new InvalidOperationException(
                "One or more recipe tags do not exist.");
        }
    }

    private async Task ValidateCuisineIdAsync(long? cuisineId)
    {
        if (!cuisineId.HasValue)
        {
            return;
        }

        var exists = await _context.Cuisines
            .AnyAsync(x => x.Id == cuisineId.Value);

        if (!exists)
        {
            throw new InvalidOperationException(
                "The selected cuisine does not exist.");
        }
    }
}
