using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Favorites;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly AppDbContext _context;

    public FavoritesController(AppDbContext context)
    {
        _context = context;
    }

    private long? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        return long.TryParse(userId, out var id)
            ? id
            : null;
    }

    // GET: api/favorites
    // Returns each favorite entry, including its unique favoriteId.
    [HttpGet]
    public async Task<IActionResult> GetMyFavorites()
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorites = await _context.Favorites
            .AsNoTracking()
            .Where(x => x.UserId == userId.Value)
            .Include(x => x.Recipe)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                favoriteId = x.Id,
                recipeId = x.RecipeId,
                recipeName = x.Recipe.Name,
                requiredServings = x.RequiredServings,
                createdAt = x.CreatedAt,
                updatedAt = x.UpdatedAt
            })
            .ToListAsync();

        return Ok(favorites);
    }

    // POST: api/favorites/{recipeId}
    // Adds a basic favorite if one does not already exist.
    [HttpPost("{recipeId:long}")]
    public async Task<IActionResult> AddFavorite(long recipeId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var recipeExists = await _context.Recipes
            .AnyAsync(x => x.Id == recipeId);

        if (!recipeExists)
        {
            return NotFound(new
            {
                message = "Recipe not found."
            });
        }

        // Keep basic favorites idempotent. Customized entries are
        // handled separately by the customize endpoint.
        var alreadyExists = await _context.Favorites
            .AnyAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId &&
                !x.Ingredients.Any());

        if (alreadyExists)
        {
            return Ok(new
            {
                message = "Basic favorite already exists.",
                recipeId
            });
        }

        var now = DateTime.UtcNow;

        var favorite = new Favorite
        {
            UserId = userId.Value,
            RecipeId = recipeId,
            RequiredServings = 1,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Favorites.Add(favorite);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Recipe added to favorites.",
            favoriteId = favorite.Id,
            recipeId
        });
    }

    // POST: api/favorites/{recipeId}/customize
    // Creates a new customized favorite.
    // Rejects a duplicate customization instead of updating an existing one.
    [HttpPost("{recipeId:long}/customize")]
    public async Task<IActionResult> SaveCustomizedFavorite(
        long recipeId,
        [FromBody] SaveFavoriteRequest request)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        if (request is null)
        {
            return BadRequest(new
            {
                message = "A customization request is required."
            });
        }

        if (request.RequiredServings <= 0)
        {
            return BadRequest(new
            {
                message = "Required servings must be greater than zero."
            });
        }

        var recipe = await _context.Recipes
            .Include(x => x.RecipeIngredients)
            .FirstOrDefaultAsync(x => x.Id == recipeId);

        if (recipe is null)
        {
            return NotFound(new
            {
                message = "Recipe not found."
            });
        }

        if (request.Ingredients is null ||
            request.Ingredients.Count == 0)
        {
            return BadRequest(new
            {
                message = "At least one ingredient is required."
            });
        }

        if (request.Ingredients.Any(x =>
            x.IngredientId <= 0 ||
            x.Quantity <= 0 ||
            string.IsNullOrWhiteSpace(x.Unit)))
        {
            return BadRequest(new
            {
                message = "Each ingredient must have a valid ID, positive quantity, and unit."
            });
        }

        // Ensure all selected ingredients belong to this recipe.
        var recipeIngredientIds = recipe.RecipeIngredients
            .Select(x => x.IngredientId)
            .ToHashSet();

        if (request.Ingredients.Any(x =>
            !recipeIngredientIds.Contains(x.IngredientId)))
        {
            return BadRequest(new
            {
                message = "One or more ingredients do not belong to this recipe."
            });
        }

        // A customization can contain each ingredient only once.
        if (request.Ingredients
            .GroupBy(x => x.IngredientId)
            .Any(g => g.Count() > 1))
        {
            return BadRequest(new
            {
                message = "Duplicate ingredient IDs are not allowed."
            });
        }

        // Normalize the request into a stable order so ingredient array
        // ordering does not affect duplicate detection.
        var requestedIngredients = request.Ingredients
            .OrderBy(x => x.IngredientId)
            .ToList();

        var existingFavorites = await _context.Favorites
            .AsNoTracking()
            .Where(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId &&
                x.RequiredServings == request.RequiredServings)
            .Include(x => x.Ingredients)
            .ToListAsync();

        // Duplicate means same recipe, servings, ingredient IDs,
        // quantities, and units. Ingredient ordering is ignored.
        var duplicateExists = existingFavorites.Any(existing =>
        {
            if (existing.Ingredients.Count != requestedIngredients.Count)
                return false;

            var existingIngredients = existing.Ingredients
                .OrderBy(x => x.IngredientId)
                .ToList();

            for (var i = 0; i < requestedIngredients.Count; i++)
            {
                var saved = existingIngredients[i];
                var requested = requestedIngredients[i];

                if (saved.IngredientId != requested.IngredientId ||
                    saved.Quantity != requested.Quantity ||
                    !string.Equals(
                        saved.Unit?.Trim(),
                        requested.Unit.Trim(),
                        StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            return true;
        });

        if (duplicateExists)
        {
            return Conflict(new
            {
                message = "This exact recipe customization is already saved.",
                recipeId
            });
        }

        var now = DateTime.UtcNow;

        var favorite = new Favorite
        {
            UserId = userId.Value,
            RecipeId = recipeId,
            RequiredServings = request.RequiredServings,
            CreatedAt = now,
            UpdatedAt = now,
            Ingredients = requestedIngredients
                .Select(x => new FavoriteIngredient
                {
                    IngredientId = x.IngredientId,
                    Quantity = x.Quantity,
                    Unit = x.Unit.Trim()
                })
                .ToList()
        };

        _context.Favorites.Add(favorite);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Customized recipe saved to favorites.",
            favoriteId = favorite.Id,
            recipeId,
            requiredServings = favorite.RequiredServings
        });
    }

    // GET: api/favorites/entries/{favoriteId}
    // Retrieves one specific favorite entry owned by the current user.
    [HttpGet("entries/{favoriteId:long}")]
    public async Task<IActionResult> GetFavoriteEntry(long favoriteId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorite = await _context.Favorites
            .AsNoTracking()
            .Include(x => x.Recipe)
            .Include(x => x.Ingredients)
                .ThenInclude(x => x.Ingredient)
            .FirstOrDefaultAsync(x =>
                x.Id == favoriteId &&
                x.UserId == userId.Value);

        if (favorite is null)
        {
            return NotFound(new
            {
                message = "Favorite entry not found."
            });
        }

        return Ok(new
        {
            favoriteId = favorite.Id,
            recipeId = favorite.RecipeId,
            recipeName = favorite.Recipe.Name,
            requiredServings = favorite.RequiredServings,
            favorite.CreatedAt,
            favorite.UpdatedAt,
            ingredients = favorite.Ingredients
                .OrderBy(x => x.IngredientId)
                .Select(x => new
                {
                    x.IngredientId,
                    ingredientName = x.Ingredient.Name,
                    ingredientPhotoUrl = x.Ingredient.PhotoUrl,
                    x.Quantity,
                    x.Unit
                })
                .ToList()
        });
    }

    // Compatibility endpoint:
    // GET: api/favorites/{recipeId}/customize
    // Returns the most recently saved customization for that recipe.
    [HttpGet("{recipeId:long}/customize")]
    public async Task<IActionResult> GetCustomizedFavorite(long recipeId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorite = await _context.Favorites
            .AsNoTracking()
            .Where(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId &&
                x.Ingredients.Any())
            .OrderByDescending(x => x.UpdatedAt)
            .Include(x => x.Recipe)
            .Include(x => x.Ingredients)
                .ThenInclude(x => x.Ingredient)
            .FirstOrDefaultAsync();

        if (favorite is null)
        {
            return NotFound(new
            {
                message = "Customized favorite not found."
            });
        }

        return Ok(new
        {
            favoriteId = favorite.Id,
            recipeId = favorite.RecipeId,
            recipeName = favorite.Recipe.Name,
            requiredServings = favorite.RequiredServings,
            favorite.CreatedAt,
            favorite.UpdatedAt,
            ingredients = favorite.Ingredients.Select(x => new
            {
                x.IngredientId,
                ingredientName = x.Ingredient.Name,
                ingredientPhotoUrl = x.Ingredient.PhotoUrl,
                x.Quantity,
                x.Unit
            }).ToList()
        });
    }

    // DELETE: api/favorites/entries/{favoriteId}
    // Removes only the selected entry owned by the current user.
    [HttpDelete("entries/{favoriteId:long}")]
    public async Task<IActionResult> RemoveFavoriteEntry(long favoriteId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorite = await _context.Favorites
            .FirstOrDefaultAsync(x =>
                x.Id == favoriteId &&
                x.UserId == userId.Value);

        if (favorite is null)
            return NoContent();

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // Compatibility endpoint:
    // DELETE: api/favorites/{recipeId}
    // Removes the most recently saved entry for the recipe.
    [HttpDelete("{recipeId:long}")]
    public async Task<IActionResult> RemoveFavorite(long recipeId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorite = await _context.Favorites
            .Where(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (favorite is null)
            return NoContent();

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}