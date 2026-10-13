
namespace RecipePro.Api.DTOs.Category;

public class CategoryResponse
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
}
