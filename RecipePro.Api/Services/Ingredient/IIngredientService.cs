using Microsoft.AspNetCore.Http;
using RecipePro.Api.DTOs.Ingredient;

namespace RecipePro.Api.Services.Ingredient;

public interface IIngredientService
{
    Task<List<IngredientResponse>> GetAllAsync();

    Task<IngredientResponse?> GetByIdAsync(long id);

    Task<IngredientResponse> CreateAsync(
        IngredientRequest request);

    Task<IngredientResponse?> UpdateAsync(
        long id,
        IngredientRequest request);

    Task<bool> DeleteAsync(long id);

    Task<IngredientResponse?> UploadImageAsync(
        long id,
        IFormFile file);


}