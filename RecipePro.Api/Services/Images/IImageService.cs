using Microsoft.AspNetCore.Http;

namespace RecipePro.Api.Services.Images;

public interface IImageService
{
    Task<string> UploadCategoryImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default);

    Task<string> UploadIngredientImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default);

    Task<string> UploadRecipeImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default);
}