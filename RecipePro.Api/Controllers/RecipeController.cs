using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.Services.Recipe;
using Microsoft.AspNetCore.Authorization;
using RecipePro.Api.Data;


namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/recipes")]
public class RecipeController : ControllerBase
{
    private readonly IRecipeService _recipeService;
    private readonly AppDbContext _context;

    public RecipeController(
        AppDbContext context,
        IRecipeService recipeService)
    {
        _context = context;
        _recipeService = recipeService;

    }

    [HttpPost]
    public async Task<ActionResult<RecipeResponse>> Create(
        RecipeRequest request)
    {
        try
        {
            var recipe =
                await _recipeService.CreateAsync(request);

            return CreatedAtAction(
                nameof(Create),
                new { id = recipe.Id },
                recipe);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<RecipeResponse>>> GetAll()
    {
        var recipes = await _recipeService.GetAllAsync();

        return Ok(recipes);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RecipeResponse>> GetById(long id)
    {
        var recipe = await _recipeService.GetByIdAsync(id);

        if (recipe == null)
        {
            return NotFound(new
            {
                message = "Recipe not found."
            });
        }

        return Ok(recipe);
    }
    [HttpPost("{id:long}/calculate")]

    public async Task<ActionResult<RecipeCalculationResponse>> Calculate(
            long id,
            RecipeCalculationRequest request)
    {
        var result = await _recipeService.CalculateAsync(
            id,
            request);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Recipe not found."
            });
        }

        return Ok(result);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<RecipeResponse>> Update(
          long id,
          RecipeRequest request)
    {
        try
        {
            var recipe = await _recipeService.UpdateAsync(
                id,
                request);

            if (recipe == null)
            {
                return NotFound(new
                {
                    message = "Recipe not found."
                });
            }

            return Ok(recipe);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await _recipeService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound(new
            {
                message = "Recipe not found."
            });
        }

        return NoContent();
    }
    [HttpPost("{id:long}/image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<RecipeResponse>> UploadImage(
        long id,
        IFormFile file)
    {
        try
        {
            var recipe =
                await _recipeService.UploadImageAsync(id, file);

            if (recipe == null)
            {
                return NotFound(new
                {
                    message = "Recipe not found."
                });
            }

            return Ok(recipe);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }

    // GET: api/recipes/cuisines
    [HttpGet("cuisines")]
    public async Task<ActionResult<IEnumerable<string>>> GetCuisines(
        CancellationToken cancellationToken)
    {
        var cuisines = await _context.Recipes
            .AsNoTracking()
            .Where(r => r.Cuisine != null && r.Cuisine.Trim() != "")
            .Select(r => r.Cuisine!.Trim())
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(cancellationToken);

        return Ok(cuisines);
    }
}