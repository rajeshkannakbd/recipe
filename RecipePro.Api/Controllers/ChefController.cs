
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Chef;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/chefs")]
public class ChefController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChefController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/chefs
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChefResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var chefs = await _context.Chefs
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ChefResponse
            {
                Id = x.Id,
                Name = x.Name,
                Biography = x.Biography,
                PhotoUrl = x.PhotoUrl,
                SourceUrl = x.SourceUrl,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(chefs);
    }

    // GET: api/chefs/1
    [HttpGet("{id:long}")]
    public async Task<ActionResult<ChefResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var chef = await _context.Chefs
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ChefResponse
            {
                Id = x.Id,
                Name = x.Name,
                Biography = x.Biography,
                PhotoUrl = x.PhotoUrl,
                SourceUrl = x.SourceUrl,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (chef == null)
        {
            return NotFound(new
            {
                message = "Chef not found."
            });
        }

        return Ok(chef);
    }

    // POST: api/chefs
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ChefResponse>> Create(
        [FromBody] ChefRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        var duplicate = await _context.Chefs
            .AnyAsync(
                x => x.Name == name,
                cancellationToken);

        if (duplicate)
        {
            return Conflict(new
            {
                message = "A chef with this name already exists."
            });
        }

        var chef = new Chef
        {
            Name = name,
            Biography = request.Biography?.Trim(),
            PhotoUrl = request.PhotoUrl?.Trim(),
            SourceUrl = request.SourceUrl?.Trim()
        };

        _context.Chefs.Add(chef);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new ChefResponse
        {
            Id = chef.Id,
            Name = chef.Name,
            Biography = chef.Biography,
            PhotoUrl = chef.PhotoUrl,
            SourceUrl = chef.SourceUrl,
            RecipeCount = 0,
            CreatedAt = chef.CreatedAt
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = chef.Id },
            response);
    }

    // PUT: api/chefs/1
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<ChefResponse>> Update(
        long id,
        [FromBody] ChefRequest request,
        CancellationToken cancellationToken)
    {
        var chef = await _context.Chefs
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (chef == null)
        {
            return NotFound(new
            {
                message = "Chef not found."
            });
        }

        var name = request.Name.Trim();

        var duplicate = await _context.Chefs
            .AnyAsync(
                x => x.Id != id && x.Name == name,
                cancellationToken);

        if (duplicate)
        {
            return Conflict(new
            {
                message = "Another chef already uses this name."
            });
        }

        chef.Name = name;
        chef.Biography = request.Biography?.Trim();
        chef.PhotoUrl = request.PhotoUrl?.Trim();
        chef.SourceUrl = request.SourceUrl?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        var response = await _context.Chefs
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ChefResponse
            {
                Id = x.Id,
                Name = x.Name,
                Biography = x.Biography,
                PhotoUrl = x.PhotoUrl,
                SourceUrl = x.SourceUrl,
                RecipeCount = x.Recipes.Count(),
                CreatedAt = x.CreatedAt
            })
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    // DELETE: api/chefs/1
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var chef = await _context.Chefs
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (chef == null)
        {
            return NotFound(new
            {
                message = "Chef not found."
            });
        }

        // Keep the recipes; remove only their chef association.
        var recipes = await _context.Recipes
            .Where(x => x.ChefId == id)
            .ToListAsync(cancellationToken);

        foreach (var recipe in recipes)
        {
            recipe.ChefId = null;
        }

        _context.Chefs.Remove(chef);

        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
