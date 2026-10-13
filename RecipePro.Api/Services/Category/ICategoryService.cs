using RecipePro.Api.DTOs.Category;
using Microsoft.AspNetCore.Http;

namespace RecipePro.Api.Services.Category;

public interface ICategoryService
{
    Task<List<CategoryResponse>> GetAllAsync();

    Task<CategoryResponse?> GetByIdAsync(long id);

    Task<CategoryResponse> CreateAsync(CategoryRequest request);

    Task<CategoryResponse?> UpdateAsync(
        long id,
        CategoryRequest request);

    Task<bool> DeleteAsync(long id);

    Task<CategoryResponse?> UploadImageAsync(
    long id,
    IFormFile file,
    CancellationToken cancellationToken = default);
}