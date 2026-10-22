
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.Models;
using System.Text.Json;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/recipe-ingredients/{recipeIngredientId:long}/substitutions")]
public class IngredientSubstitutionController : ControllerBase
{
    private readonly AppDbContext _context;

    public IngredientSubstitutionController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/recipe-ingredients/1/substitutions
    [HttpGet]
    public async Task<ActionResult<IEnumerable<IngredientSubstitutionResponse>>> GetAll(
        long recipeIngredientId,
        CancellationToken cancellationToken)
    {
        var recipeIngredientExists = await _context.RecipeIngredients
            .AnyAsync(x => x.Id == recipeIngredientId, cancellationToken);

        if (!recipeIngredientExists)
            return NotFound("Recipe ingredient not found.");

        var items = await _context.IngredientSubstitutions
            .AsNoTracking()
            .Where(x => x.RecipeIngredientId == recipeIngredientId)
            .Include(x => x.SubstituteIngredient)
            .OrderBy(x => x.Id)
            .Select(x => new IngredientSubstitutionResponse
            {
                Id = x.Id,
                RecipeIngredientId = x.RecipeIngredientId,
                SubstituteIngredientId = x.SubstituteIngredientId,
                SubstituteIngredientName = x.SubstituteIngredient.Name,
                Quantity = x.Quantity,
                Unit = x.Unit,
                Instructions = x.Instructions
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    // GET: api/recipe-ingredients/1/substitutions/2
    [HttpGet("{id:long}")]
    public async Task<ActionResult<IngredientSubstitutionResponse>> GetById(
        long recipeIngredientId,
        long id,
        CancellationToken cancellationToken)
    {
        var item = await _context.IngredientSubstitutions
            .AsNoTracking()
            .Where(x =>
                x.Id == id &&
                x.RecipeIngredientId == recipeIngredientId)
            .Include(x => x.SubstituteIngredient)
            .Select(x => new IngredientSubstitutionResponse
            {
                Id = x.Id,
                RecipeIngredientId = x.RecipeIngredientId,
                SubstituteIngredientId = x.SubstituteIngredientId,
                SubstituteIngredientName = x.SubstituteIngredient.Name,
                Quantity = x.Quantity,
                Unit = x.Unit,
                Instructions = x.Instructions
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (item == null)
            return NotFound("Ingredient substitution not found.");

        return Ok(item);
    }

    // POST: api/recipe-ingredients/1/substitutions
    [HttpPost]
    public async Task<ActionResult<IngredientSubstitutionResponse>> Create(
        long recipeIngredientId,
        [FromBody] IngredientSubstitutionRequest request,
        CancellationToken cancellationToken)
    {
        var recipeIngredient = await _context.RecipeIngredients
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == recipeIngredientId,
                cancellationToken);

        if (recipeIngredient == null)
            return NotFound("Recipe ingredient not found.");

        if (recipeIngredient.IngredientId == request.SubstituteIngredientId)
            return BadRequest(
                "The substitute ingredient must be different from the original ingredient.");

        var substituteExists = await _context.Ingredients
            .AnyAsync(
                x => x.Id == request.SubstituteIngredientId,
                cancellationToken);

        if (!substituteExists)
            return BadRequest("Substitute ingredient not found.");

        var entity = new IngredientSubstitution
        {
            RecipeIngredientId = recipeIngredientId,
            SubstituteIngredientId = request.SubstituteIngredientId,
            Quantity = request.Quantity,
            Unit = request.Unit?.Trim(),
            Instructions = request.Instructions?.Trim()
        };

        _context.IngredientSubstitutions.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var result = await _context.IngredientSubstitutions
            .AsNoTracking()
            .Where(x => x.Id == entity.Id)
            .Include(x => x.SubstituteIngredient)
            .Select(x => new IngredientSubstitutionResponse
            {
                Id = x.Id,
                RecipeIngredientId = x.RecipeIngredientId,
                SubstituteIngredientId = x.SubstituteIngredientId,
                SubstituteIngredientName = x.SubstituteIngredient.Name,
                Quantity = x.Quantity,
                Unit = x.Unit,
                Instructions = x.Instructions
            })
            .FirstAsync(cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { recipeIngredientId, id = entity.Id },
            result);
    }

    // PUT: api/recipe-ingredients/1/substitutions/2
    [HttpPut("{id:long}")]
    public async Task<ActionResult<IngredientSubstitutionResponse>> Update(
        long recipeIngredientId,
        long id,
        [FromBody] IngredientSubstitutionRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _context.IngredientSubstitutions
            .FirstOrDefaultAsync(
                x => x.Id == id &&
                     x.RecipeIngredientId == recipeIngredientId,
                cancellationToken);

        if (entity == null)
            return NotFound("Ingredient substitution not found.");

        var recipeIngredient = await _context.RecipeIngredients
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == recipeIngredientId,
                cancellationToken);

        if (recipeIngredient == null)
            return NotFound("Recipe ingredient not found.");

        if (recipeIngredient.IngredientId == request.SubstituteIngredientId)
            return BadRequest(
                "The substitute ingredient must be different from the original ingredient.");

        var substituteExists = await _context.Ingredients
            .AnyAsync(
                x => x.Id == request.SubstituteIngredientId,
                cancellationToken);

        if (!substituteExists)
            return BadRequest("Substitute ingredient not found.");

        entity.SubstituteIngredientId = request.SubstituteIngredientId;
        entity.Quantity = request.Quantity;
        entity.Unit = request.Unit?.Trim();
        entity.Instructions = request.Instructions?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        var result = await _context.IngredientSubstitutions
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Include(x => x.SubstituteIngredient)
            .Select(x => new IngredientSubstitutionResponse
            {
                Id = x.Id,
                RecipeIngredientId = x.RecipeIngredientId,
                SubstituteIngredientId = x.SubstituteIngredientId,
                SubstituteIngredientName = x.SubstituteIngredient.Name,
                Quantity = x.Quantity,
                Unit = x.Unit,
                Instructions = x.Instructions
            })
            .FirstAsync(cancellationToken);

        return Ok(result);
    }

    // DELETE: api/recipe-ingredients/1/substitutions/2
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long recipeIngredientId,
        long id,
        CancellationToken cancellationToken)
    {
        var entity = await _context.IngredientSubstitutions
            .FirstOrDefaultAsync(
                x => x.Id == id &&
                     x.RecipeIngredientId == recipeIngredientId,
                cancellationToken);

        if (entity == null)
            return NotFound("Ingredient substitution not found.");

        _context.IngredientSubstitutions.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
