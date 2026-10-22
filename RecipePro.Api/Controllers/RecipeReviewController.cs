
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Recipe;
using RecipePro.Api.Models;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/recipes/{recipeId:long}/reviews")]
public class RecipeReviewController : ControllerBase
{
    private readonly AppDbContext _context;
  
    public RecipeReviewController(AppDbContext context)
    {
        _context = context;
    }

    private long? GetCurrentUserId()
    {
        var value =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ??
            User.FindFirstValue("userId") ??
            User.FindFirstValue("id");

        return long.TryParse(value, out var userId)
            ? userId
            : null;
    }

    // GET: api/recipes/1reviews/
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RecipeReviewResponse>>> GetAll(
        long recipeId,
        CancellationToken cancellationToken)
    {
        var recipeExists = await _context.Recipes
            .AnyAsync(x => x.Id == recipeId, cancellationToken);

        if (!recipeExists)
            return NotFound(new { message = "Recipe not found." });

        var reviews = await _context.RecipeReviews
            .AsNoTracking()
            .Where(x => x.RecipeId == recipeId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new RecipeReviewResponse
            {
                Id = x.Id,
                RecipeId = x.RecipeId,
                UserId = x.UserId,
                UserName = x.User.Name,
                Rating = x.Rating,
                Comment = x.Comment,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(reviews);
    }

    // GET: api/recipes/1/reviews/5
    [HttpGet("{id:long}")]
    public async Task<ActionResult<RecipeReviewResponse>> GetById(
        long recipeId,
        long id,
        CancellationToken cancellationToken)
    {
        var review = await _context.RecipeReviews
            .AsNoTracking()
            .Where(x => x.RecipeId == recipeId && x.Id == id)
            .Select(x => new RecipeReviewResponse
            {
                Id = x.Id,
                RecipeId = x.RecipeId,
                UserId = x.UserId,
                UserName = x.User.Name,
                Rating = x.Rating,
                Comment = x.Comment,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (review == null)
            return NotFound(new { message = "Review not found." });

        return Ok(review);
    }

    // POST: api/recipes/1/reviews
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RecipeReviewResponse>> Create(
        long recipeId,
        [FromBody] RecipeReviewRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId == null)
            return Unauthorized(new
            {
                message = "Unable to identify the logged-in user from the token."
            });

        var recipeExists = await _context.Recipes
            .AnyAsync(x => x.Id == recipeId, cancellationToken);

        if (!recipeExists)
            return NotFound(new { message = "Recipe not found." });

        var userExists = await _context.ApplicationUsers
            .AnyAsync(x => x.Id == userId.Value, cancellationToken);

        if (!userExists)
            return Unauthorized(new { message = "User account not found." });

        var alreadyReviewed = await _context.RecipeReviews
            .AnyAsync(
                x => x.RecipeId == recipeId && x.UserId == userId.Value,
                cancellationToken);

        if (alreadyReviewed)
            return Conflict(new
            {
                message = "You have already reviewed this recipe. Update your existing review instead."
            });

        var review = new RecipeReview
        {
            RecipeId = recipeId,
            UserId = userId.Value,
            Rating = request.Rating,
            Comment = request.Comment?.Trim()
        };

        _context.RecipeReviews.Add(review);
        await _context.SaveChangesAsync(cancellationToken);

        var response = await _context.RecipeReviews
            .AsNoTracking()
            .Where(x => x.Id == review.Id)
            .Select(x => new RecipeReviewResponse
            {
                Id = x.Id,
                RecipeId = x.RecipeId,
                UserId = x.UserId,
                UserName = x.User.Name,
                Rating = x.Rating,
                Comment = x.Comment,
                CreatedAt = x.CreatedAt
            })
            .FirstAsync(cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { recipeId, id = review.Id },
            response);
    }

    // PUT: api/recipes/1/reviews/5
    [Authorize]
    [HttpPut("{id:long}")]
    public async Task<ActionResult<RecipeReviewResponse>> Update(
        long recipeId,
        long id,
        [FromBody] RecipeReviewRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId == null)
            return Unauthorized(new
            {
                message = "Unable to identify the logged-in user from the token."
            });

        var review = await _context.RecipeReviews
            .FirstOrDefaultAsync(
                x => x.Id == id && x.RecipeId == recipeId,
                cancellationToken);

        if (review == null)
            return NotFound(new { message = "Review not found." });

        if (review.UserId != userId.Value &&
            !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        review.Rating = request.Rating;
        review.Comment = request.Comment?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        var response = await _context.RecipeReviews
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new RecipeReviewResponse
            {
                Id = x.Id,
                RecipeId = x.RecipeId,
                UserId = x.UserId,
                UserName = x.User.Name,
                Rating = x.Rating,
                Comment = x.Comment,
                CreatedAt = x.CreatedAt
            })
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    // DELETE: api/recipes/1/reviews/5
    [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long recipeId,
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();

        if (userId == null)
            return Unauthorized(new
            {
                message = "Unable to identify the logged-in user from the token."
            });

        var review = await _context.RecipeReviews
            .FirstOrDefaultAsync(
                x => x.Id == id && x.RecipeId == recipeId,
                cancellationToken);

        if (review == null)
            return NotFound(new { message = "Review not found." });

        if (review.UserId != userId.Value &&
            !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        _context.RecipeReviews.Remove(review);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
