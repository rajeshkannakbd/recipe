using Microsoft.AspNetCore.Http;
using RecipePro.Api.DTOs.Recipe;

namespace RecipePro.Api.Services.Recipe;

public interface IRecipeService
{
    Task<RecipeResponse> CreateAsync(
        RecipeRequest request);

    Task<List<RecipeResponse>> GetAllAsync();

    Task<RecipeResponse?> GetByIdAsync(long id);

    Task<RecipeCalculationResponse?> CalculateAsync(
        long id,
        RecipeCalculationRequest request);

    Task<RecipeResponse?> UpdateAsync(
        long id,
        RecipeRequest request);

    Task<bool> DeleteAsync(long id);

    Task<RecipeResponse?> UploadImageAsync(
        long id,
        IFormFile file);
}