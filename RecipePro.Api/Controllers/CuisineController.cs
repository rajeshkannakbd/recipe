using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Cuisine;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/cuisines")]
public class CuisineController : ControllerBase
{
    private readonly AppDbContext _context;

    public CuisineController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/cuisines
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CuisineResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var cuisines = await _context.Cuisines
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new CuisineResponse
            {
                Id = x.Id,
                Name = x.Name,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(cuisines);
    }

    // GET: api/cuisines/1
    [HttpGet("{id:long}")]
    public async Task<ActionResult<CuisineResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var cuisine = await _context.Cuisines
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new CuisineResponse
            {
                Id = x.Id,
                Name = x.Name,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (cuisine is null)
        {
            return NotFound(new { message = "Cuisine not found." });
        }

        return Ok(cuisine);
    }

    // POST: api/cuisines
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CuisineResponse>> Create(
        [FromBody] CuisineRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        var duplicate = await _context.Cuisines
            .AnyAsync(
                x => x.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (duplicate)
        {
            return Conflict(new
            {
                message = "A cuisine with this name already exists."
            });
        }

        var cuisine = new Cuisine
        {
            Name = name
        };

        _context.Cuisines.Add(cuisine);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new CuisineResponse
        {
            Id = cuisine.Id,
            Name = cuisine.Name,
            RecipeCount = 0,
            CreatedAt = cuisine.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = cuisine.Id },
            response);
    }

    // PUT: api/cuisines/1
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<CuisineResponse>> Update(
        long id,
        [FromBody] CuisineRequest request,
        CancellationToken cancellationToken)
    {
        var cuisine = await _context.Cuisines
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (cuisine is null)
        {
            return NotFound(new { message = "Cuisine not found." });
        }

        var name = request.Name.Trim();

        var duplicate = await _context.Cuisines
            .AnyAsync(
                x => x.Id != id &&
                     x.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (duplicate)
        {
            return Conflict(new
            {
                message = "Another cuisine already uses this name."
            });
        }

        cuisine.Name = name;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new CuisineResponse
        {
            Id = cuisine.Id,
            Name = cuisine.Name,
            RecipeCount = await _context.Recipes
                .CountAsync(x => x.CuisineId == id, cancellationToken),
            CreatedAt = cuisine.CreatedAt
        });
    }

    // DELETE: api/cuisines/1
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var cuisine = await _context.Cuisines
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (cuisine is null)
        {
            return NotFound(new { message = "Cuisine not found." });
        }

        var isUsed = await _context.Recipes
            .AnyAsync(x => x.CuisineId == id, cancellationToken);

        if (isUsed)
        {
            return Conflict(new
            {
                message = "This cuisine is assigned to recipes. Reassign those recipes before deleting it."
            });
        }

        _context.Cuisines.Remove(cuisine);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}