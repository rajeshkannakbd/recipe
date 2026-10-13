using Microsoft.EntityFrameworkCore;
using RecipePro.Api.Models;
using RecipePro.Api.Models.Common;


namespace RecipePro.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Ingredient> Ingredients => Set<Ingredient>();

    public DbSet<Recipe> Recipes => Set<Recipe>();

    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
 
    public DbSet<RecipeProcedure> RecipeProcedures => Set<RecipeProcedure>();

    public DbSet<ApplicationUser> ApplicationUsers => Set<ApplicationUser>();

    public DbSet<ApplicationRole> ApplicationRoles => Set<ApplicationRole>();

    public DbSet<Permission> Permissions => Set<Permission>();

    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<RecipeRevision> RecipeRevisions => Set<RecipeRevision>();

    public DbSet<Favorite> Favorites => Set<Favorite>();

    public DbSet<FavoriteIngredient> FavoriteIngredients { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureCategory(modelBuilder);
        ConfigureIngredient(modelBuilder);
        ConfigureRecipe(modelBuilder);
        ConfigureRecipeIngredient(modelBuilder);
        ConfigureRecipeProcedure(modelBuilder);

        modelBuilder.Entity<Category>().HasData(
            new Category
            {
                Id = 1,
                Name = "Beverages",
                Description = "Tea, coffee, juices and other beverages.",
                CreatedAt = new DateTime(
                    2026, 1, 1, 0, 0, 0,
                    DateTimeKind.Utc
                )
            },
            new Category
            {
                Id = 2,
                Name = "Tiffin",
                Description = "Breakfast and tiffin recipes.",
                CreatedAt = new DateTime(
                    2026, 1, 1, 0, 0, 0,
                    DateTimeKind.Utc
                )
            },
            new Category
            {
                Id = 3,
                Name = "Meals",
                Description = "Lunch, dinner and meal recipes.",
                CreatedAt = new DateTime(
                    2026, 1, 1, 0, 0, 0,
                    DateTimeKind.Utc
                )
            }
        );
        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(200).IsRequired();
            entity.Property(x => x.PasswordHash).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(30).IsRequired();

            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<ApplicationRole>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(30).IsRequired();
            entity.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Code).HasMaxLength(100).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(x => new { x.RoleId, x.PermissionId });

            entity.HasOne(x => x.Role)
                .WithMany(x => x.RolePermissions)
                .HasForeignKey(x => x.RoleId);

            entity.HasOne(x => x.Permission)
                .WithMany()
                .HasForeignKey(x => x.PermissionId);
        });

        modelBuilder.Entity<RecipeRevision>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.SnapshotJson)
                .HasColumnType("longtext")
                .IsRequired();

            entity.Property(x => x.ApprovalStatus)
                .HasMaxLength(30)
                .IsRequired();

            entity.HasIndex(x => x.RecipeId);
        });
modelBuilder.Entity<Favorite>(entity =>
{
    entity.HasKey(x => x.Id);

    entity.HasIndex(x => new
    {
        x.UserId,
        x.RecipeId
    }).IsUnique();

    entity.HasOne(x => x.User)
        .WithMany()
        .HasForeignKey(x => x.UserId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(x => x.Recipe)
        .WithMany()
        .HasForeignKey(x => x.RecipeId)
        .OnDelete(DeleteBehavior.Cascade);
});
modelBuilder.Entity<FavoriteIngredient>()
    .HasOne(x => x.Favorite)
    .WithMany(x => x.Ingredients)
    .HasForeignKey(x => x.FavoriteId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<FavoriteIngredient>()
    .HasOne(x => x.Ingredient)
    .WithMany()
    .HasForeignKey(x => x.IngredientId)
    .OnDelete(DeleteBehavior.Restrict);

    }

    private static void ConfigureCategory(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.HasIndex(x => x.Name)
                .IsUnique();
        });
    }

    private static void ConfigureIngredient(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ingredient>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(x => x.PhotoUrl)
                .HasMaxLength(500);

            entity.HasIndex(x => x.Name)
                .IsUnique();
        });
    }

    private static void ConfigureRecipe(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.Description)
                .HasMaxLength(1000);

            entity.Property(x => x.BaseServings)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasConversion<int>()
                .IsRequired();

            entity.Property(x => x.PhotoUrl)
                .HasMaxLength(500);

            entity.HasIndex(x => x.CategoryId);

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Recipes)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(table =>
                {
                    table.HasCheckConstraint(
                        "CK_Recipe_BaseServings_Positive",
                        "`BaseServings` > 0"
                    );
                });
        });
    }

    private static void ConfigureRecipeIngredient(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Quantity)
                .HasPrecision(18, 3)
                .IsRequired();

            entity.Property(x => x.Unit)
                .IsRequired()
                .HasMaxLength(30);

            entity.HasIndex(x => new
            {
                x.RecipeId,
                x.IngredientId
            })
            .IsUnique();

            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.RecipeIngredients)
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Ingredient)
                .WithMany(x => x.RecipeIngredients)
                .HasForeignKey(x => x.IngredientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_RecipeIngredient_Quantity_Positive",
                    "`Quantity` > 0"
                );
            });
        });
    }

    private static void ConfigureRecipeProcedure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RecipeProcedure>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.Description)
                .IsRequired()
                .HasMaxLength(2000);

            entity.HasIndex(x => new
            {
                x.RecipeId,
                x.StepNumber
            })
            .IsUnique();

            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.Procedures)
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(table =>
                {
                    table.HasCheckConstraint(
                        "CK_RecipeProcedure_StepNumber_Positive",
                        "`StepNumber` > 0"
                    );
                });
        });
    }
    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        ApplyAuditInformation();

        return await base.SaveChangesAsync(cancellationToken);
    }
    private void ApplyAuditInformation()
    {
        var entries = ChangeTracker
            .Entries<AuditableEntity>();

        var now = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
    private static void ConfigureFavorite(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Favorite>(entity =>
    {
        entity.HasKey(x => x.Id);

        entity.HasIndex(x => new
        {
            x.UserId,
            x.RecipeId
        }).IsUnique();

        entity.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(x => x.Recipe)
            .WithMany()
            .HasForeignKey(x => x.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);
    });
}

}