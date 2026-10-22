
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.CookingStyle;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/cooking-styles")]
public class CookingStyleController : ControllerBase
{
    private readonly AppDbContext _context;

    public CookingStyleController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/cooking-styles
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CookingStyleResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var styles = await _context.CookingStyles
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new CookingStyleResponse
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(styles);
    }

    // GET: api/cooking-styles/1
    [HttpGet("{id:long}")]
    public async Task<ActionResult<CookingStyleResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var style = await _context.CookingStyles
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new CookingStyleResponse
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (style == null)
        {
            return NotFound(new
            {
                message = "Cooking style not found."
            });
        }

        return Ok(style);
    }

    // POST: api/cooking-styles
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CookingStyleResponse>> Create(
        [FromBody] CookingStyleRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        var exists = await _context.CookingStyles
            .AnyAsync(x => x.Name == name, cancellationToken);

        if (exists)
        {
            return Conflict(new
            {
                message = "A cooking style with this name already exists."
            });
        }

        var style = new CookingStyle
        {
            Name = name,
            Description = request.Description?.Trim()
        };

        _context.CookingStyles.Add(style);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new CookingStyleResponse
        {
            Id = style.Id,
            Name = style.Name,
            Description = style.Description,
            RecipeCount = 0,
            CreatedAt = style.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = style.Id },
            response);
    }

    // PUT: api/cooking-styles/1
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<CookingStyleResponse>> Update(
        long id,
        [FromBody] CookingStyleRequest request,
        CancellationToken cancellationToken)
    {
        var style = await _context.CookingStyles
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (style == null)
        {
            return NotFound(new
            {
                message = "Cooking style not found."
            });
        }

        var name = request.Name.Trim();

        var duplicate = await _context.CookingStyles
            .AnyAsync(
                x => x.Id != id && x.Name == name,
                cancellationToken);

        if (duplicate)
        {
            return Conflict(new
            {
                message = "Another cooking style already uses this name."
            });
        }

        style.Name = name;
        style.Description = request.Description?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        var response = await _context.CookingStyles
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new CookingStyleResponse
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    // DELETE: api/cooking-styles/1
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var style = await _context.CookingStyles
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (style == null)
        {
            return NotFound(new
            {
                message = "Cooking style not found."
            });
        }

        // Preserve recipes and remove their cooking-style association.
        var recipes = await _context.Recipes
            .Where(x => x.CookingStyleId == id)
            .ToListAsync(cancellationToken);

        foreach (var recipe in recipes)
        {
            recipe.CookingStyleId = null;
        }

        _context.CookingStyles.Remove(style);

        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
