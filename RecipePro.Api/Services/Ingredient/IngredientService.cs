using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Data;
using RecipePro.Api.DTOs.Ingredient;
using RecipePro.Api.Services.Images;

using Microsoft.AspNetCore.Http;

using RecipePro.Api.Models.Enums;


namespace RecipePro.Api.Services.Ingredient;

public class IngredientService : IIngredientService
{
    private readonly AppDbContext _context;
    private readonly IImageService _imageService;

    public IngredientService(
        AppDbContext context,
        IImageService imageService)
    {
        _context = context;
        _imageService = imageService;
    }

    // Keep your existing CRUD methods below.

    public async Task<List<IngredientResponse>> GetAllAsync()
    {
        return await _context.Ingredients
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new IngredientResponse
            {
                Id = x.Id,
                Name = x.Name,
                PhotoUrl = x.PhotoUrl!,
                PurchasePrice = x.PurchasePrice,
                PurchaseQuantity = x.PurchaseQuantity,
                PurchaseUnit = x.PurchaseUnit,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,

                IngredientType = x.IngredientType,

                WastageQuantity = x.WastageQuantity,
                WastageUnit = x.WastageUnit,

                IsCautionRequired = x.IsCautionRequired,
                CautionMessage = x.CautionMessage,

                StorageInstructions = x.StorageInstructions,
                ShelfLifeDays = x.ShelfLifeDays,

                Brand = x.Brand,
                Notes = x.Notes,
                Status = x.Status,
            })
            .ToListAsync();
    }

    public async Task<IngredientResponse?> GetByIdAsync(long id)
    {
        return await _context.Ingredients
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new IngredientResponse
            {
                Id = x.Id,
                Name = x.Name,
                PhotoUrl = x.PhotoUrl!,
                PurchasePrice = x.PurchasePrice,
                PurchaseQuantity = x.PurchaseQuantity,
                PurchaseUnit = x.PurchaseUnit,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,

                IngredientType = x.IngredientType,

                WastageQuantity = x.WastageQuantity,
                WastageUnit = x.WastageUnit,

                IsCautionRequired = x.IsCautionRequired,
                CautionMessage = x.CautionMessage,

                StorageInstructions = x.StorageInstructions,
                ShelfLifeDays = x.ShelfLifeDays,

                Brand = x.Brand,
                Notes = x.Notes,
                Status = x.Status,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<IngredientResponse> CreateAsync(
        IngredientRequest request)
    {
        var normalizedName = request.Name.Trim();

        var exists = await _context.Ingredients
            .AnyAsync(x => x.Name == normalizedName);

        if (exists)
        {
            throw new InvalidOperationException(
                "An ingredient with this name already exists.");
        }

        if (!Enum.IsDefined(typeof(IngredientDietType),
                            request.IngredientType))
        {
            throw new ArgumentException(
                "Select a valid ingredient type.");
        }

        if (request.IsCautionRequired &&
            string.IsNullOrWhiteSpace(request.CautionMessage))
        {
            throw new ArgumentException(
                "Enter a caution message when the warning is enabled.");
        }
        if (!Enum.IsDefined(typeof(IngredientStatus), request.Status))
        {
            throw new ArgumentException(
                "Select a valid ingredient status.");
        }

        var ingredient = new Models.Ingredient
        {
            Name = normalizedName,
            PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl)
                        ? null
                        : request.PhotoUrl.Trim(),
            PurchasePrice = request.PurchasePrice,
            PurchaseQuantity = request.PurchaseQuantity,
            PurchaseUnit = request.PurchaseUnit?.Trim(),
            IngredientType = request.IngredientType,
            WastageQuantity = request.WastageQuantity,
            WastageUnit = request.WastageUnit?.Trim(),

            IsCautionRequired = request.IsCautionRequired,

            CautionMessage = request.IsCautionRequired
                ? request.CautionMessage?.Trim()
                : null,

            StorageInstructions =
                string.IsNullOrWhiteSpace(request.StorageInstructions)
                    ? null
                    : request.StorageInstructions.Trim(),

            ShelfLifeDays = request.ShelfLifeDays,

            Brand = string.IsNullOrWhiteSpace(request.Brand)
                ? null
                : request.Brand.Trim(),

            Notes = string.IsNullOrWhiteSpace(request.Notes)
                ? null
                : request.Notes.Trim(),

            Status = request.Status,

        };

        _context.Ingredients.Add(ingredient);

        await _context.SaveChangesAsync();

        return MapToResponse(ingredient);
    }

    public async Task<IngredientResponse?> UpdateAsync(
        long id,
        IngredientRequest request)
    {
        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == id);

        if (ingredient == null)
        {
            return null;
        }

        var normalizedName = request.Name.Trim();

        var duplicate = await _context.Ingredients
            .AnyAsync(x =>
                x.Id != id &&
                x.Name == normalizedName);

        if (duplicate)
        {
            throw new InvalidOperationException(
                "An ingredient with this name already exists.");
        }

        ingredient.Name = normalizedName;
        if (!string.IsNullOrWhiteSpace(request.PhotoUrl))
        {
            ingredient.PhotoUrl = request.PhotoUrl.Trim();
        }
        ingredient.PurchasePrice = request.PurchasePrice;
        ingredient.PurchaseQuantity = request.PurchaseQuantity;
        ingredient.PurchaseUnit = request.PurchaseUnit?.Trim();
        ingredient.IngredientType = request.IngredientType;

        ingredient.WastageQuantity = request.WastageQuantity;
        ingredient.WastageUnit = request.WastageUnit?.Trim();

        ingredient.IsCautionRequired = request.IsCautionRequired;

        ingredient.CautionMessage = request.IsCautionRequired
            ? request.CautionMessage?.Trim()
            : null;

        ingredient.StorageInstructions =
            string.IsNullOrWhiteSpace(request.StorageInstructions)
                ? null
                : request.StorageInstructions.Trim();

        ingredient.ShelfLifeDays = request.ShelfLifeDays;

        ingredient.Brand = string.IsNullOrWhiteSpace(request.Brand)
            ? null
            : request.Brand.Trim();

        ingredient.Notes = string.IsNullOrWhiteSpace(request.Notes)
            ? null
            : request.Notes.Trim();


        await _context.SaveChangesAsync();

        return MapToResponse(ingredient);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == id);

        if (ingredient == null)
        {
            return false;
        }

        var isUsed = await _context.RecipeIngredients
            .AnyAsync(x => x.IngredientId == id);

        if (isUsed)
        {
            throw new InvalidOperationException(
                "Cannot delete an ingredient that is used by a recipe.");
        }

        _context.Ingredients.Remove(ingredient);

        await _context.SaveChangesAsync();

        return true;
    }

    private static IngredientResponse MapToResponse(
        Models.Ingredient ingredient)
    {
        return new IngredientResponse
        {
            Id = ingredient.Id,
            Name = ingredient.Name,
            PhotoUrl = ingredient.PhotoUrl!,
            PurchasePrice = ingredient.PurchasePrice,
            PurchaseQuantity = ingredient.PurchaseQuantity,
            PurchaseUnit = ingredient.PurchaseUnit,
            CreatedAt = ingredient.CreatedAt,
            UpdatedAt = ingredient.UpdatedAt,

            IngredientType = ingredient.IngredientType,

            WastageQuantity = ingredient.WastageQuantity,
            WastageUnit = ingredient.WastageUnit,

            IsCautionRequired = ingredient.IsCautionRequired,
            CautionMessage = ingredient.CautionMessage,

            StorageInstructions = ingredient.StorageInstructions,
            ShelfLifeDays = ingredient.ShelfLifeDays,

            Brand = ingredient.Brand,
            Notes = ingredient.Notes,
            Status = ingredient.Status,


        };
    }

    public async Task<IngredientResponse?> UploadImageAsync(
    long id,
    IFormFile file)
    {
        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == id);

        if (ingredient == null)
        {
            return null;
        }

        var imageUrl =
            await _imageService.UploadIngredientImageAsync(file);

        ingredient.PhotoUrl = imageUrl;

        await _context.SaveChangesAsync();

        return MapToResponse(ingredient);


    }
}