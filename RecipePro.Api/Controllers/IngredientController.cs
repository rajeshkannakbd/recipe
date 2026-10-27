using Microsoft.AspNetCore.Mvc;
using RecipePro.Api.DTOs.Ingredient;
using RecipePro.Api.Services.Ingredient;
using Microsoft.AspNetCore.Authorization;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/ingredients")]
public class IngredientController : ControllerBase
{
    private readonly IIngredientService _ingredientService;

    public IngredientController(
        IIngredientService ingredientService)
    {
        _ingredientService = ingredientService;
    }

    [HttpGet]
    public async Task<ActionResult<List<IngredientResponse>>> GetAll()
    {
        var ingredients =
            await _ingredientService.GetAllAsync();

        return Ok(ingredients);
    }

    [HttpGet("{id:long}")]
    [Authorize(Roles = "Admin")]

    public async Task<ActionResult<IngredientResponse>> GetById(
        long id)
    {
        var ingredient =
            await _ingredientService.GetByIdAsync(id);

        if (ingredient == null)
        {
            return NotFound();
        }

        return Ok(ingredient);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IngredientResponse>> Create(
        IngredientRequest request)
    {
        try
        {
            var ingredient =
                await _ingredientService.CreateAsync(request);

            return CreatedAtAction(
                nameof(GetById),
                new { id = ingredient.Id },
                ingredient);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IngredientResponse>> Update(
        long id,
        IngredientRequest request)
    {
        try
        {
            var ingredient =
                await _ingredientService.UpdateAsync(id, request);

            if (ingredient == null)
            {
                return NotFound();
            }

            return Ok(ingredient);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            var deleted =
                await _ingredientService.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }
    [HttpPost("{id:long}/image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<IngredientResponse>> UploadImage(
        long id,
        IFormFile file)
    {
        try
        {
            var ingredient =
                await _ingredientService.UploadImageAsync(id, file);

            if (ingredient == null)
            {
                return NotFound(new
                {
                    message = "Ingredient not found."
                });
            }

            return Ok(ingredient);
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
}