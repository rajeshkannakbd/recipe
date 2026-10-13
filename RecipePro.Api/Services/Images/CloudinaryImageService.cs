
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using RecipePro.Api.Configuration;
using RecipePro.Api.Services.Images;

namespace RecipePro.Api.Services.Images;

public class CloudinaryImageService : IImageService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryImageService(CloudinarySettings settings)
    {
        var account = new Account(
            settings.CloudName,
            settings.ApiKey,
            settings.ApiSecret);

        _cloudinary = new Cloudinary(account);
    }

    public Task<string> UploadCategoryImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        return UploadImageAsync(
            file, "recipepro/categories", cancellationToken);
    }

    public Task<string> UploadIngredientImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        return UploadImageAsync(
            file, "recipepro/ingredients", cancellationToken);
    }

    public Task<string> UploadRecipeImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        return UploadImageAsync(
            file, "recipepro/recipes", cancellationToken);
    }

    private async Task<string> UploadImageAsync(
        IFormFile file,
        string folder,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("Please select an image.");
        }

        const long maxFileSize = 5 * 1024 * 1024;

        if (file.Length > maxFileSize)
        {
            throw new ArgumentException(
                "Image size must not exceed 5 MB.");
        }

        var allowedTypes = new[]
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

        if (!allowedTypes.Contains(
                file.ContentType,
                StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                "Only JPG, PNG, and WebP images are allowed.");
        }

        await using var stream = file.OpenReadStream();

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = folder,
            UseFilename = true,
            UniqueFilename = true,
            Overwrite = false
        };

        var result = await _cloudinary.UploadAsync(uploadParams);

        cancellationToken.ThrowIfCancellationRequested();

        if (result.Error != null)
        {
            throw new InvalidOperationException(
                $"Cloudinary upload failed: {result.Error.Message}");
        }

        return result.SecureUrl?.ToString()
            ?? throw new InvalidOperationException(
                "Cloudinary did not return an image URL.");
    }
}
