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
    [HttpGet]
    public async Task<IActionResult> GetMyFavorites()
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorites = await _context.Favorites
            .AsNoTracking()
            .Where(x => x.UserId == userId.Value)
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

    // GET: api/favorites/check?recipeId=10&requiredServings=5
    [HttpGet("check")]
    public async Task<IActionResult> CheckFavorite(
        [FromQuery] long recipeId,
        [FromQuery] int requiredServings)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        if (recipeId <= 0 || requiredServings <= 0)
        {
            return BadRequest(new
            {
                message = "Invalid recipe ID or serving count."
            });
        }

        var exists = await _context.Favorites
            .AsNoTracking()
            .AnyAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId &&
                x.RequiredServings == requiredServings);

        return Ok(new
        {
            exists
        });
    }

    // POST: api/favorites/{recipeId}
    // Adds a basic favorite with 1 serving.
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

        // Only one favorite per user, recipe, and serving count.
        var alreadyExists = await _context.Favorites
            .AnyAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId &&
                x.RequiredServings == 1);

        if (alreadyExists)
        {
            return Ok(new
            {
                message = "Recipe is already saved for 1 serving.",
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
    // Only one favorite is allowed per user, recipe, and serving count.
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

        // Fast duplicate check: no ingredient loading or comparison.
        var duplicateExists = await _context.Favorites
            .AsNoTracking()
            .AnyAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId &&
                x.RequiredServings == request.RequiredServings);

        if (duplicateExists)
        {
            return Conflict(new
            {
                message = "This recipe is already saved for this serving count.",
                recipeId,
                requiredServings = request.RequiredServings
            });
        }

        var requestedIngredients = request.Ingredients
            .OrderBy(x => x.IngredientId)
            .ToList();

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

    // GET: api/favorites/{recipeId}/customize
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

            ingredients = favorite.Ingredients
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

    // DELETE: api/favorites/entries/{favoriteId}
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

    // DELETE: api/favorites/{recipeId}
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