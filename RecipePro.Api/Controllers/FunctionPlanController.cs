
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.FunctionPlan;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/function-plans")]
public class FunctionPlanController : ControllerBase
{
    private readonly AppDbContext _context;

    public FunctionPlanController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/function-plans
    // Returns only the logged-in user's function plans.
    [HttpGet]
    public async Task<ActionResult<List<FunctionPlanResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new
            {
                message = "User ID not found in login token."
            });
        }

        var plans = await _context.FunctionPlans
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Include(x => x.Recipes)
                .ThenInclude(x => x.Recipe)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(plans.Select(MapResponse).ToList());
    }

    // GET: api/function-plans/1
    // Returns a plan only if it belongs to the logged-in user.
    [HttpGet("{id:long}")]
    public async Task<ActionResult<FunctionPlanResponse>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new
            {
                message = "User ID not found in login token."
            });
        }

        var plan = await LoadPlanAsync(
            id,
            userId,
            cancellationToken);

        if (plan is null)
        {
            return NotFound(new
            {
                message = "Function plan not found."
            });
        }

        return Ok(MapResponse(plan));
    }

    // POST: api/function-plans
    // Creates a function plan owned by the logged-in user.
    [HttpPost]
    public async Task<ActionResult<FunctionPlanResponse>> Create(
        [FromBody] FunctionPlanRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new
            {
                message = "User ID not found in login token."
            });
        }

        var validationError = ValidateRequest(request);

        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var recipeIds = request.Recipes
            .Select(x => x.RecipeId)
            .Distinct()
            .ToList();

        if (recipeIds.Count != request.Recipes.Count)
        {
            return BadRequest(new
            {
                message = "A recipe can only be added once to a function plan."
            });
        }

        var existingRecipeIds = await _context.Recipes
            .Where(x => recipeIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (existingRecipeIds.Count != recipeIds.Count)
        {
            return BadRequest(new
            {
                message = "One or more selected recipes do not exist."
            });
        }

        var plan = new FunctionPlan
        {
            Name = request.Name.Trim(),
            EventDate = request.EventDate,
            Notes = NormalizeOptionalText(request.Notes),

            // Never take the owner ID from the request body.
            UserId = userId,

            Recipes = request.Recipes.Select(item =>
                new FunctionPlanRecipe
                {
                    RecipeId = item.RecipeId,
                    RequiredServings = item.RequiredServings
                }).ToList()
        };

        _context.FunctionPlans.Add(plan);

        await _context.SaveChangesAsync(cancellationToken);

        var savedPlan = await LoadPlanAsync(
            plan.Id,
            userId,
            cancellationToken);

        if (savedPlan is null)
        {
            return Problem(
                title: "Function plan saved",
                detail: "The saved function plan could not be loaded.");
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = plan.Id },
            MapResponse(savedPlan));
    }

    // PUT: api/function-plans/1
    // Updates only a plan owned by the logged-in user.
    [HttpPut("{id:long}")]
    public async Task<ActionResult<FunctionPlanResponse>> Update(
        long id,
        [FromBody] FunctionPlanRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new
            {
                message = "User ID not found in login token."
            });
        }

        var plan = await _context.FunctionPlans
            .Include(x => x.Recipes)
            .FirstOrDefaultAsync(
                x => x.Id == id && x.UserId == userId,
                cancellationToken);

        if (plan is null)
        {
            return NotFound(new
            {
                message = "Function plan not found."
            });
        }

        var validationError = ValidateRequest(request);

        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var recipeIds = request.Recipes
            .Select(x => x.RecipeId)
            .Distinct()
            .ToList();

        if (recipeIds.Count != request.Recipes.Count)
        {
            return BadRequest(new
            {
                message = "A recipe can only be added once to a function plan."
            });
        }

        var existingRecipeIds = await _context.Recipes
            .Where(x => recipeIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (existingRecipeIds.Count != recipeIds.Count)
        {
            return BadRequest(new
            {
                message = "One or more selected recipes do not exist."
            });
        }

        plan.Name = request.Name.Trim();
        plan.EventDate = request.EventDate;
        plan.Notes = NormalizeOptionalText(request.Notes);
        plan.UpdatedAt = DateTime.UtcNow;

        _context.FunctionPlanRecipes.RemoveRange(plan.Recipes);
        plan.Recipes.Clear();

        foreach (var item in request.Recipes)
        {
            plan.Recipes.Add(new FunctionPlanRecipe
            {
                FunctionPlanId = plan.Id,
                RecipeId = item.RecipeId,
                RequiredServings = item.RequiredServings
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var updatedPlan = await LoadPlanAsync(
            id,
            userId,
            cancellationToken);

        if (updatedPlan is null)
        {
            return NotFound(new
            {
                message = "Function plan not found."
            });
        }

        return Ok(MapResponse(updatedPlan));
    }

    // DELETE: api/function-plans/1
    // Deletes only a plan owned by the logged-in user.
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new
            {
                message = "User ID not found in login token."
            });
        }

        var plan = await _context.FunctionPlans
            .FirstOrDefaultAsync(
                x => x.Id == id && x.UserId == userId,
                cancellationToken);

        if (plan is null)
        {
            return NotFound(new
            {
                message = "Function plan not found."
            });
        }

        _context.FunctionPlans.Remove(plan);

        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    // Loads a plan only when its owner matches the authenticated user.
    private Task<FunctionPlan?> LoadPlanAsync(
        long id,
        string userId,
        CancellationToken cancellationToken)
    {
        return _context.FunctionPlans
            .AsNoTracking()
            .Where(x => x.Id == id && x.UserId == userId)
            .Include(x => x.Recipes)
                .ThenInclude(x => x.Recipe)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private string? GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("userId")
            ?? User.FindFirstValue("id");
    }

    private static string? ValidateRequest(FunctionPlanRequest request)
    {
        if (request is null)
        {
            return "Request body is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Function plan name is required.";
        }

        if (request.Recipes is null || request.Recipes.Count == 0)
        {
            return "Add at least one recipe to the function plan.";
        }

        if (request.Recipes.Any(x =>
                x.RecipeId <= 0 ||
                x.RequiredServings < 1 ||
                x.RequiredServings > 100000))
        {
            return "Every recipe must have a valid ID and serving count.";
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static FunctionPlanResponse MapResponse(FunctionPlan plan)
    {
        return new FunctionPlanResponse
        {
            Id = plan.Id,
            Name = plan.Name,
            EventDate = plan.EventDate,
            Notes = plan.Notes,
            CreatedAt = plan.CreatedAt,
            UpdatedAt = plan.UpdatedAt,

            Recipes = plan.Recipes
                .OrderBy(x => x.Id)
                .Select(x => new FunctionPlanRecipeResponse
                {
                    RecipeId = x.RecipeId,
                    RecipeName = x.Recipe.Name,
                    BaseServings = x.Recipe.BaseServings,
                    RequiredServings = x.RequiredServings
                })
                .ToList()
        };
    }
}
