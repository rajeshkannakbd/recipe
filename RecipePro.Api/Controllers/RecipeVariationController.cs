
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/recipes/{recipeId:long}/variations")]
public class RecipeVariationController : ControllerBase
{
    private readonly AppDbContext _context;

    public RecipeVariationController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<RecipeVariationResponse>>> GetAll(
        long recipeId)
    {
        var recipeExists = await _context.Recipes
            .AnyAsync(x => x.Id == recipeId);

        if (!recipeExists)
            return NotFound(new { message = "Recipe not found." });

        var variations = await _context.RecipeVariations
            .AsNoTracking()
            .Where(x => x.RecipeId == recipeId)
            .OrderBy(x => x.Name)
            .Select(x => new RecipeVariationResponse
            {
                Id = x.Id,
                RecipeId = x.RecipeId,
                Name = x.Name,
                Description = x.Description,
                IngredientChangesJson = x.IngredientChangesJson,
                ProcedureChanges = x.ProcedureChanges,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(variations);
    }

    [HttpGet("{variationId:long}")]
    public async Task<ActionResult<RecipeVariationResponse>> GetById(
        long recipeId,
        long variationId)
    {
        var variation = await _context.RecipeVariations
            .AsNoTracking()
            .Where(x => x.RecipeId == recipeId && x.Id == variationId)
            .Select(x => new RecipeVariationResponse
            {
                Id = x.Id,
                RecipeId = x.RecipeId,
                Name = x.Name,
                Description = x.Description,
                IngredientChangesJson = x.IngredientChangesJson,
                ProcedureChanges = x.ProcedureChanges,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (variation == null)
            return NotFound(new { message = "Recipe variation not found." });

        return Ok(variation);
    }

    [HttpPost]
    public async Task<ActionResult<RecipeVariationResponse>> Create(
        long recipeId,
        [FromBody] RecipeVariationRequest request)
    {
        var recipeExists = await _context.Recipes
            .AnyAsync(x => x.Id == recipeId);

        if (!recipeExists)
            return NotFound(new { message = "Recipe not found." });

        if (!string.IsNullOrWhiteSpace(request.IngredientChangesJson))
        {
            try
            {
                using var document =
                    JsonDocument.Parse(request.IngredientChangesJson);
            }
            catch (JsonException)
            {
                return BadRequest(new
                {
                    message = "IngredientChangesJson must contain valid JSON."
                });
            }
        }

        var variation = new RecipeVariation
        {
            RecipeId = recipeId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IngredientChangesJson = request.IngredientChangesJson,
            ProcedureChanges = request.ProcedureChanges?.Trim()
        };

        _context.RecipeVariations.Add(variation);
        await _context.SaveChangesAsync();

        var response = new RecipeVariationResponse
        {
            Id = variation.Id,
            RecipeId = variation.RecipeId,
            Name = variation.Name,
            Description = variation.Description,
            IngredientChangesJson = variation.IngredientChangesJson,
            ProcedureChanges = variation.ProcedureChanges,
            CreatedAt = variation.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new { recipeId, variationId = variation.Id },
            response);
    }

    [HttpPut("{variationId:long}")]
    public async Task<ActionResult<RecipeVariationResponse>> Update(
        long recipeId,
        long variationId,
        [FromBody] RecipeVariationRequest request)
    {
        var variation = await _context.RecipeVariations
            .FirstOrDefaultAsync(x =>
                x.Id == variationId && x.RecipeId == recipeId);

        if (variation == null)
            return NotFound(new { message = "Recipe variation not found." });

        if (!string.IsNullOrWhiteSpace(request.IngredientChangesJson))
        {
            try
            {
                using var document =
                    JsonDocument.Parse(request.IngredientChangesJson);
            }
            catch (JsonException)
            {
                return BadRequest(new
                {
                    message = "IngredientChangesJson must contain valid JSON."
                });
            }
        }

        variation.Name = request.Name.Trim();
        variation.Description = request.Description?.Trim();
        variation.IngredientChangesJson = request.IngredientChangesJson;
        variation.ProcedureChanges = request.ProcedureChanges?.Trim();

        await _context.SaveChangesAsync();

        return Ok(new RecipeVariationResponse
        {
            Id = variation.Id,
            RecipeId = variation.RecipeId,
            Name = variation.Name,
            Description = variation.Description,
            IngredientChangesJson = variation.IngredientChangesJson,
            ProcedureChanges = variation.ProcedureChanges,
            CreatedAt = variation.CreatedAt
        });
    }

    [HttpDelete("{variationId:long}")]
    public async Task<IActionResult> Delete(
        long recipeId,
        long variationId)
    {
        var variation = await _context.RecipeVariations
            .FirstOrDefaultAsync(x =>
                x.Id == variationId && x.RecipeId == recipeId);

        if (variation == null)
            return NotFound(new { message = "Recipe variation not found." });

        _context.RecipeVariations.Remove(variation);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
