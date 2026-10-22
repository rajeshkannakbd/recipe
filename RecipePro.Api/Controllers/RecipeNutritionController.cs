
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/recipes/{recipeId:long}/nutrition")]
public class RecipeNutritionController : ControllerBase
{
    private readonly AppDbContext _context;

    public RecipeNutritionController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<RecipeNutritionResponse>> Get(long recipeId)
    {
        var nutrition = await _context.RecipeNutritions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RecipeId == recipeId);

        if (nutrition == null)
        {
            var recipeExists = await _context.Recipes
                .AnyAsync(x => x.Id == recipeId);

            if (!recipeExists)
                return NotFound(new { message = "Recipe not found." });

            return NotFound(new { message = "Nutrition information not found." });
        }

        return Ok(ToResponse(nutrition));
    }

    [HttpPost]
    public async Task<ActionResult<RecipeNutritionResponse>> Save(
        long recipeId,
        [FromBody] RecipeNutritionRequest request)
    {
        var recipeExists = await _context.Recipes
            .AnyAsync(x => x.Id == recipeId);

        if (!recipeExists)
            return NotFound(new { message = "Recipe not found." });

        var nutrition = await _context.RecipeNutritions
            .FirstOrDefaultAsync(x => x.RecipeId == recipeId);

        var isNew = nutrition == null;

        if (isNew)
        {
            nutrition = new RecipeNutrition
            {
                RecipeId = recipeId,
                IsVerified = false
            };

            _context.RecipeNutritions.Add(nutrition);
        }

        nutrition!.CaloriesKcal = request.CaloriesKcal;
        nutrition.ProteinGrams = request.ProteinGrams;
        nutrition.CarbohydratesGrams = request.CarbohydratesGrams;
        nutrition.FatGrams = request.FatGrams;
        nutrition.FiberGrams = request.FiberGrams;
        nutrition.SugarGrams = request.SugarGrams;
        nutrition.SodiumMilligrams = request.SodiumMilligrams;
        nutrition.DataSource = request.DataSource?.Trim();

        // Never trust a client-provided verification flag.
        // Existing verification is preserved when updating.

        await _context.SaveChangesAsync();

        return Ok(ToResponse(nutrition));
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(long recipeId)
    {
        var nutrition = await _context.RecipeNutritions
            .FirstOrDefaultAsync(x => x.RecipeId == recipeId);

        if (nutrition == null)
            return NotFound(new { message = "Nutrition information not found." });

        _context.RecipeNutritions.Remove(nutrition);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static RecipeNutritionResponse ToResponse(
        RecipeNutrition nutrition)
    {
        return new RecipeNutritionResponse
        {
            Id = nutrition.Id,
            RecipeId = nutrition.RecipeId,
            CaloriesKcal = nutrition.CaloriesKcal,
            ProteinGrams = nutrition.ProteinGrams,
            CarbohydratesGrams = nutrition.CarbohydratesGrams,
            FatGrams = nutrition.FatGrams,
            FiberGrams = nutrition.FiberGrams,
            SugarGrams = nutrition.SugarGrams,
            SodiumMilligrams = nutrition.SodiumMilligrams,
            DataSource = nutrition.DataSource,
            IsVerified = nutrition.IsVerified
        };
    }
}
