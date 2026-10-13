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

    // Existing endpoint: return the current user's favorite recipe IDs.
    [HttpGet]
    public async Task<IActionResult> GetMyFavorites()
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var recipeIds = await _context.Favorites
            .Where(x => x.UserId == userId.Value)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.RecipeId)
            .ToListAsync();

        return Ok(recipeIds);
    }

    // Existing endpoint: add a favorite without custom quantities.
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

        var alreadyExists = await _context.Favorites
            .AnyAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId);

        if (alreadyExists)
        {
            return Ok(new
            {
                message = "Recipe is already in your favorites.",
                recipeId
            });
        }

        var favorite = new Favorite
        {
            UserId = userId.Value,
            RecipeId = recipeId,
            RequiredServings = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Favorites.Add(favorite);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Recipe added to favorites.",
            recipeId
        });
    }

    // New endpoint: save or update customized recipe quantities.
    [HttpPost("{recipeId:long}/customize")]
    public async Task<IActionResult> SaveCustomizedFavorite(
        long recipeId,
        [FromBody] SaveFavoriteRequest request)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

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

        // Prevent saving ingredient IDs that don't belong to this recipe.
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

        // Prevent duplicate ingredient IDs in the request.
        if (request.Ingredients
            .GroupBy(x => x.IngredientId)
            .Any(g => g.Count() > 1))
        {
            return BadRequest(new
            {
                message = "Duplicate ingredient IDs are not allowed."
            });
        }

        var now = DateTime.UtcNow;

        var favorite = await _context.Favorites
            .Include(x => x.Ingredients)
            .FirstOrDefaultAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId);

        if (favorite is null)
        {
            favorite = new Favorite
            {
                UserId = userId.Value,
                RecipeId = recipeId,
                CreatedAt = now
            };

            _context.Favorites.Add(favorite);
        }

        favorite.RequiredServings = request.RequiredServings;
        favorite.UpdatedAt = now;

        // Replace this user's saved ingredient quantities.
        _context.FavoriteIngredients.RemoveRange(
            favorite.Ingredients
        );

        favorite.Ingredients = request.Ingredients
            .Select(x => new FavoriteIngredient
            {
                IngredientId = x.IngredientId,
                Quantity = x.Quantity,
                Unit = x.Unit
            })
            .ToList();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Customized recipe saved to favorites.",
            recipeId,
            requiredServings = favorite.RequiredServings
        });
    }

    // New endpoint: retrieve the current user's saved recipe details.
    [HttpGet("{recipeId:long}/customize")]
    public async Task<IActionResult> GetCustomizedFavorite(
        long recipeId)
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
                x.UserId == userId.Value &&
                x.RecipeId == recipeId);

        if (favorite is null)
        {
            return NotFound(new
            {
                message = "Favorite recipe not found."
            });
        }

        var response = new
        {
            favorite.Id,
            favorite.RecipeId,
            RecipeName = favorite.Recipe.Name,
            favorite.RequiredServings,
            favorite.CreatedAt,
            favorite.UpdatedAt,
            Ingredients = favorite.Ingredients.Select(x => new
            {
                x.IngredientId,
                IngredientName = x.Ingredient.Name,
                IngredientPhotoUrl = x.Ingredient.PhotoUrl,
                x.Quantity,
                x.Unit
            }).ToList()
        };

        return Ok(response);
    }

    // Existing endpoint: remove a favorite.
    [HttpDelete("{recipeId:long}")]
    public async Task<IActionResult> RemoveFavorite(long recipeId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized();

        var favorite = await _context.Favorites
            .FirstOrDefaultAsync(x =>
                x.UserId == userId.Value &&
                x.RecipeId == recipeId);

        if (favorite is null)
            return NoContent();

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}