using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.RecipeTag;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/recipe-tags")]
public class RecipeTagController : ControllerBase
{
    private readonly AppDbContext _context;

    public RecipeTagController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/recipe-tags
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RecipeTagResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var tags = await _context.RecipeTags
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new RecipeTagResponse
            {
                Id = x.Id,
                Name = x.Name,
                RecipeCount = x.RecipeTags.Count()
            })
            .ToListAsync(cancellationToken);

        return Ok(tags);
    }

    // GET: api/recipe-tags/1
    [HttpGet("{id:long}")]
    public async Task<ActionResult<RecipeTagResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var tag = await _context.RecipeTags
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new RecipeTagResponse
            {
                Id = x.Id,
                Name = x.Name,
                RecipeCount = x.RecipeTags.Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (tag is null)
        {
            return NotFound(new { message = "Recipe tag not found." });
        }

        return Ok(tag);
    }

    // POST: api/recipe-tags
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<RecipeTagResponse>> Create(
        [FromBody] RecipeTagRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        if (name.Contains(','))
        {
            return BadRequest(new
            {
                message = "Submit each tag separately. Do not include commas."
            });
        }

        var duplicate = await _context.RecipeTags
            .AnyAsync(x => x.Name.ToLower() == name.ToLower(), cancellationToken);

        if (duplicate)
        {
            return Conflict(new { message = "This recipe tag already exists." });
        }

        var tag = new RecipeTag { Name = name };

        _context.RecipeTags.Add(tag);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new RecipeTagResponse
        {
            Id = tag.Id,
            Name = tag.Name,
            RecipeCount = 0
        };

        return CreatedAtAction(nameof(GetById), new { id = tag.Id }, response);
    }

    // PUT: api/recipe-tags/1
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<RecipeTagResponse>> Update(
        long id,
        [FromBody] RecipeTagRequest request,
        CancellationToken cancellationToken)
    {
        var tag = await _context.RecipeTags
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (tag is null)
        {
            return NotFound(new { message = "Recipe tag not found." });
        }

        var name = request.Name.Trim();

        if (name.Contains(','))
        {
            return BadRequest(new
            {
                message = "Submit each tag separately. Do not include commas."
            });
        }

        var duplicate = await _context.RecipeTags
            .AnyAsync(
                x => x.Id != id && x.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (duplicate)
        {
            return Conflict(new { message = "This recipe tag already exists." });
        }

        tag.Name = name;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new RecipeTagResponse
        {
            Id = tag.Id,
            Name = tag.Name,
            RecipeCount = await _context.RecipeTagMappings
                .CountAsync(x => x.RecipeTagId == id, cancellationToken)
        });
    }

    // DELETE: api/recipe-tags/1
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var tag = await _context.RecipeTags
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (tag is null)
        {
            return NotFound(new { message = "Recipe tag not found." });
        }

        // AppDbContext configures RecipeTagMappings to cascade on tag deletion.
        _context.RecipeTags.Remove(tag);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
