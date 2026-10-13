using Microsoft.AspNetCore.Mvc;
using RecipePro.Api.DTOs.Category;
using RecipePro.Api.Services.Category;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace RecipePro.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoryController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll()
    {
        var categories = await _categoryService.GetAllAsync();

        return Ok(categories);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<CategoryResponse>> GetById(long id)
    {
        var category = await _categoryService.GetByIdAsync(id);

        if (category == null)
        {
            return NotFound();
        }

        return Ok(category);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]

    public async Task<ActionResult<CategoryResponse>> Create(
        CategoryRequest request)
    {
        try
        {
            var category =
                await _categoryService.CreateAsync(request);

            return CreatedAtAction(
                nameof(GetById),
                new { id = category.Id },
                category);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CategoryResponse>> Update(
        long id,
        CategoryRequest request)
    {
        try
        {
            var category =
                await _categoryService.UpdateAsync(id, request);

            if (category == null)
            {
                return NotFound();
            }

            return Ok(category);
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
    try
    {
        var deleted = await _categoryService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound(new
            {
                message = "Category not found."
            });
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
public async Task<ActionResult<CategoryResponse>> UploadImage(
    long id,
    IFormFile file,
    CancellationToken cancellationToken)
{
    try
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new
            {
                message = "Please select an image."
            });
        }

        var category = await _categoryService.UploadImageAsync(
            id,
            file,
            cancellationToken);

        if (category == null)
        {
            return NotFound(new
            {
                message = "Category not found."
            });
        }

        return Ok(category);
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new
        {
            message = ex.Message
        });
    }
    catch (InvalidOperationException ex)
    {
        return StatusCode(StatusCodes.Status502BadGateway, new
        {
            message = ex.Message
        });
    }
}
}