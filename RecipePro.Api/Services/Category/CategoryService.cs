using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Category;
using RecipePro.Api.Services.Images;  
using Microsoft.AspNetCore.Http;  

namespace RecipePro.Api.Services.Category;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _context;
    private readonly IImageService _imageService;
    public CategoryService(
        AppDbContext context,
        IImageService imageService)
    {
        _context = context;
        _imageService = imageService;
    }

    public async Task<List<CategoryResponse>> GetAllAsync()
    {
        return await _context.Categories
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new CategoryResponse
            {
                    Id = x.Id,
                    Name = x.Name,
                    Description = x.Description,
                    ImageUrl = x.ImageUrl,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<CategoryResponse?> GetByIdAsync(long id)
    {
        return await _context.Categories
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new CategoryResponse
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                ImageUrl = x.ImageUrl,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<CategoryResponse> CreateAsync(
        CategoryRequest request)
    {
        var normalizedName = request.Name.Trim();

        var exists = await _context.Categories
            .AnyAsync(x => x.Name == normalizedName);

        if (exists)
        {
            throw new InvalidOperationException(
                "A category with this name already exists.");
        }

        var category = new Models.Category
        {
            Name = normalizedName,
            Description = request.Description?.Trim()
        };

        _context.Categories.Add(category);

        await _context.SaveChangesAsync();

        return new CategoryResponse
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            ImageUrl = category.ImageUrl,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }

    public async Task<CategoryResponse?> UpdateAsync(
        long id,
        CategoryRequest request)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(x => x.Id == id);

        if (category == null)
        {
            return null;
        }

        var normalizedName = request.Name.Trim();

        var duplicate = await _context.Categories
            .AnyAsync(x =>
                x.Id != id &&
                x.Name == normalizedName);

        if (duplicate)
        {
            throw new InvalidOperationException(
                "A category with this name already exists.");
        }

        category.Name = normalizedName;
        category.Description = request.Description?.Trim();

        await _context.SaveChangesAsync();

        return new CategoryResponse
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            ImageUrl = category.ImageUrl,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }

    public async Task<bool> DeleteAsync(long id)
{
    var category = await _context.Categories
        .FirstOrDefaultAsync(x => x.Id == id);

    if (category == null)
    {
        return false;
    }

    var hasRecipes = await _context.Recipes
        .AnyAsync(x => x.CategoryId == id);

    if (hasRecipes)
    {
        throw new InvalidOperationException(
            "Cannot delete this category because recipes are associated with it.");
    }

    _context.Categories.Remove(category);

    await _context.SaveChangesAsync();

    return true;
}
public async Task<CategoryResponse?> UploadImageAsync(
    long id,
    IFormFile file,
    CancellationToken cancellationToken = default)
{
    var category = await _context.Categories
        .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    if (category == null)
    {
        return null;
    }

    var imageUrl = await _imageService.UploadCategoryImageAsync(
        file,
        cancellationToken);

    category.ImageUrl = imageUrl;

    await _context.SaveChangesAsync(cancellationToken);

    return new CategoryResponse
    {
        Id = category.Id,
        Name = category.Name,
        Description = category.Description,
        ImageUrl = category.ImageUrl,
        CreatedAt = category.CreatedAt,
        UpdatedAt = category.UpdatedAt
    };
}
}