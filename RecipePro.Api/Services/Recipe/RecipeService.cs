    using Microsoft.EntityFrameworkCore;
    using RecipePro.Api.Data;
    using RecipePro.Api.DTOs.Recipe;
    using RecipePro.Api.Models;
    using Microsoft.AspNetCore.Http;
    using RecipePro.Api.Services.Images;

    namespace RecipePro.Api.Services.Recipe;

    public class RecipeService : IRecipeService
    {
            private readonly AppDbContext _context;
        private readonly IImageService _imageService;

        public RecipeService(
            AppDbContext context,
            IImageService imageService)
        {
            _context = context;
            _imageService = imageService;
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
                                : request.PhotoUrl.Trim()
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
            var recipes = await _context.Recipes
                .AsNoTracking()
                .Include(x => x.Category)
                .Include(x => x.RecipeIngredients)
                    .ThenInclude(x => x.Ingredient)
                .Include(x => x.Procedures)
                .OrderBy(x => x.Name)
                .ToListAsync();

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

    var calculatedIngredients = recipe.RecipeIngredients
        .OrderBy(x => x.Id)
        .Select(x =>
        {
            decimal calculatedQuantity = Math.Round(
                x.Quantity * multiplier * 4m,
                MidpointRounding.AwayFromZero
            ) / 4m;

            // Calculate price before changing the display unit.
            decimal? estimatedCost = CalculateIngredientCost(
                calculatedQuantity,
                x.Unit,
                x.Ingredient);

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
                    => quantity *
                       x.Ingredient.GramsPerMilliliter.Value,

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
                    => quantity *
                       x.Ingredient.GramsPerPiece.Value,

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

            return new CalculatedIngredientResponse
            {
                IngredientId = x.IngredientId,
                IngredientName = x.Ingredient.Name,
                IngredientPhotoUrl =
                    x.Ingredient.PhotoUrl ?? string.Empty,
                BaseQuantity = x.Quantity,
                RequiredQuantity = converted.Quantity,
                Unit = converted.Unit,
                EstimatedCost = estimatedCost
            };
        })
        .ToList();

    bool isCostEstimateComplete =
        calculatedIngredients.All(
            x => x.EstimatedCost.HasValue);

    decimal? estimatedTotalCost = isCostEstimateComplete
        ? Math.Round(
            calculatedIngredients.Sum(
                x => x.EstimatedCost!.Value),
            2,
            MidpointRounding.AwayFromZero)
        : null;

    return new RecipeCalculationResponse
    {
        RecipeId = recipe.Id,
        RecipeName = recipe.Name,
        BaseServings = recipe.BaseServings,
        RequiredServings = request.RequiredServings,

        EstimatedCookedWeightGrams =
            estimatedCookedWeightGrams,

        EstimatedTotalWeightGrams =
            isWeightEstimateComplete
                ? Math.Round(
                    totalWeightGrams,
                    2,
                    MidpointRounding.AwayFromZero)
                : null,

        IsWeightEstimateComplete =
            isWeightEstimateComplete,

        EstimatedTotalCost = estimatedTotalCost,
        IsCostEstimateComplete = isCostEstimateComplete,

        Ingredients = calculatedIngredients
    };
}

private static decimal? CalculateIngredientCost(
    decimal requiredQuantity,
    string recipeUnit,
    RecipePro.Api.Models.Ingredient ingredient)
{
    if (!ingredient.PurchasePrice.HasValue ||
        !ingredient.PurchaseQuantity.HasValue ||
        ingredient.PurchasePrice.Value < 0m ||
        ingredient.PurchaseQuantity.Value <= 0m ||
        string.IsNullOrWhiteSpace(ingredient.PurchaseUnit))
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

    static decimal? ToBaseQuantity(
        decimal quantity,
        string unit)
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
    string normalizedPurchaseUnit =
        NormalizeUnit(ingredient.PurchaseUnit);

    bool recipeIsWeight =
        normalizedRecipeUnit is "g" or "kg";

    bool purchaseIsWeight =
        normalizedPurchaseUnit is "g" or "kg";

    bool recipeIsVolume =
        normalizedRecipeUnit is "ml" or "l" or "tsp" or "tbsp";

    bool purchaseIsVolume =
        normalizedPurchaseUnit is "ml" or "l" or "tsp" or "tbsp";

    bool recipeIsPiece = normalizedRecipeUnit == "piece";
    bool purchaseIsPiece = normalizedPurchaseUnit == "piece";

    // Weight, volume and piece units cannot be interchanged
    // without ingredient-specific conversion information.
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
        ingredient.PurchaseQuantity.Value,
        normalizedPurchaseUnit);

    if (!requiredBase.HasValue ||
        !purchaseBase.HasValue ||
        purchaseBase.Value <= 0m)
    {
        return null;
    }

    decimal cost =
        requiredBase.Value /
        purchaseBase.Value *
        ingredient.PurchasePrice.Value;

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
    }