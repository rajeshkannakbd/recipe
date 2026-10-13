namespace RecipePro.Api.Models;

public class ApplicationRole
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; }
        = new List<RolePermission>();
}