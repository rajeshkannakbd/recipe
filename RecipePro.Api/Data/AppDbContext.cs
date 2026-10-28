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


    public DbSet<Chef> Chefs => Set<Chef>();

    public DbSet<CookingStyle> CookingStyles => Set<CookingStyle>();

    public DbSet<RecipeNutrition> RecipeNutritions => Set<RecipeNutrition>();

    public DbSet<RecipeReview> RecipeReviews => Set<RecipeReview>();

    public DbSet<RecipeVariation> RecipeVariations => Set<RecipeVariation>();

    public DbSet<IngredientSubstitution> IngredientSubstitutions
        => Set<IngredientSubstitution>();

    public DbSet<RecipeTag> RecipeTags => Set<RecipeTag>();

    public DbSet<RecipeTagMapping> RecipeTagMappings =>
        Set<RecipeTagMapping>();

    public DbSet<Cuisine> Cuisines => Set<Cuisine>();

    public DbSet<FunctionPlan> FunctionPlans => Set<FunctionPlan>();

    public DbSet<FunctionPlanRecipe> FunctionPlanRecipes
        => Set<FunctionPlanRecipe>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<RecipeTagMapping>(entity =>
        {
            entity.HasKey(x => new { x.RecipeId, x.RecipeTagId });

            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.RecipeTags)
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.RecipeTag)
                .WithMany(x => x.RecipeTags)
                .HasForeignKey(x => x.RecipeTagId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        ConfigureCategory(modelBuilder);
        ConfigureIngredient(modelBuilder);
        ConfigureRecipe(modelBuilder);
        ConfigureRecipeIngredient(modelBuilder);
        ConfigureRecipeProcedure(modelBuilder);

        ConfigureNewRecipeFeatures(modelBuilder);
        ConfigureFunctionPlan(modelBuilder);

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

            // Allow multiple saved customizations for the same recipe.
            // Each favorite entry is identified by its own Id.
            entity.HasIndex(x => new
            {
                x.UserId,
                x.RecipeId
            });

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

        // Map every entity to the lowercase table names already present in Aiven MySQL.
        // MySQL is configured with lower_case_table_names = 0, so table-name casing matters.
        modelBuilder.Entity<Category>().ToTable("categories");
        modelBuilder.Entity<Ingredient>().ToTable("ingredients");
        modelBuilder.Entity<Recipe>().ToTable("recipes");
        modelBuilder.Entity<RecipeIngredient>().ToTable("recipeingredients");
        modelBuilder.Entity<RecipeProcedure>().ToTable("recipeprocedures");
        modelBuilder.Entity<ApplicationUser>().ToTable("applicationusers");
        modelBuilder.Entity<ApplicationRole>().ToTable("applicationroles");
        modelBuilder.Entity<Permission>().ToTable("permissions");
        modelBuilder.Entity<RolePermission>().ToTable("rolepermissions");
        modelBuilder.Entity<RecipeRevision>().ToTable("reciperevisions");
        modelBuilder.Entity<Favorite>().ToTable("favorites");
        modelBuilder.Entity<FavoriteIngredient>().ToTable("favoriteingredients");
        modelBuilder.Entity<Chef>().ToTable("chefs");
        modelBuilder.Entity<CookingStyle>().ToTable("cookingstyles");
        modelBuilder.Entity<RecipeNutrition>().ToTable("recipenutritions");
        modelBuilder.Entity<RecipeReview>().ToTable("recipereviews");
        modelBuilder.Entity<RecipeVariation>().ToTable("recipevariations");
        modelBuilder.Entity<IngredientSubstitution>().ToTable("ingredientsubstitutions");
        modelBuilder.Entity<RecipeTag>().ToTable("recipetags");
        modelBuilder.Entity<RecipeTagMapping>().ToTable("recipetagmappings");
        modelBuilder.Entity<Cuisine>().ToTable("cuisines");
        modelBuilder.Entity<FunctionPlan>().ToTable("functionplans");
        modelBuilder.Entity<FunctionPlanRecipe>().ToTable("functionplanrecipes");
    }


    private static void ConfigureNewRecipeFeatures(ModelBuilder modelBuilder)
    {
        // Chef
        modelBuilder.Entity<Chef>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(150);
            entity.Property(x => x.Biography).HasMaxLength(2000);
            entity.Property(x => x.PhotoUrl).HasMaxLength(500);
            entity.Property(x => x.SourceUrl).HasMaxLength(1000);
        });

        // Cooking style
        modelBuilder.Entity<CookingStyle>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(x => x.Description).HasMaxLength(500);

            entity.HasIndex(x => x.Name).IsUnique();
        });

        // Recipe metadata and optional relationships
        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.Property(x => x.Cuisine).HasMaxLength(100);
            entity.Property(x => x.MealType).HasMaxLength(100);
            entity.Property(x => x.StorageInstructions).HasMaxLength(1000);
            entity.Property(x => x.SourceName).HasMaxLength(200);
            entity.Property(x => x.SourceUrl).HasMaxLength(1000);

            entity.HasOne(x => x.Chef)
                .WithMany(x => x.Recipes)
                .HasForeignKey(x => x.ChefId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.CookingStyle)
                .WithMany(x => x.Recipes)
                .HasForeignKey(x => x.CookingStyleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.ChefId);
            entity.HasIndex(x => x.CookingStyleId);
        });

        modelBuilder.Entity<Cuisine>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.HasIndex(x => x.Name)
                    .IsUnique();
            });

        modelBuilder.Entity<Recipe>()
            .HasOne(x => x.CuisineEntity)
            .WithMany(x => x.Recipes)
            .HasForeignKey(x => x.CuisineId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Recipe>()
            .HasIndex(x => x.CuisineId);

        // Nutrition: one record per recipe
        modelBuilder.Entity<RecipeNutrition>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.CaloriesKcal).HasPrecision(10, 2);
            entity.Property(x => x.ProteinGrams).HasPrecision(10, 2);
            entity.Property(x => x.CarbohydratesGrams).HasPrecision(10, 2);
            entity.Property(x => x.FatGrams).HasPrecision(10, 2);
            entity.Property(x => x.FiberGrams).HasPrecision(10, 2);
            entity.Property(x => x.SugarGrams).HasPrecision(10, 2);
            entity.Property(x => x.SodiumMilligrams).HasPrecision(10, 2);
            entity.Property(x => x.DataSource).HasMaxLength(200);

            entity.HasIndex(x => x.RecipeId).IsUnique();

            entity.HasOne(x => x.Recipe)
                .WithOne(x => x.Nutrition)
                .HasForeignKey<RecipeNutrition>(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Reviews
        modelBuilder.Entity<RecipeReview>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Comment).HasMaxLength(1000);

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_RecipeReview_Rating",
                    "`Rating` >= 1 AND `Rating` <= 5");
            });

            entity.HasIndex(x => new { x.RecipeId, x.UserId })
                .IsUnique();

            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.Reviews)
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Recipe variations
        modelBuilder.Entity<RecipeVariation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(x => x.Description).HasMaxLength(1000);
            entity.Property(x => x.IngredientChangesJson).HasColumnType("longtext");
            entity.Property(x => x.ProcedureChanges).HasMaxLength(4000);

            entity.HasIndex(x => x.RecipeId);

            entity.HasOne(x => x.Recipe)
                .WithMany(x => x.Variations)
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Ingredient substitutions
        modelBuilder.Entity<IngredientSubstitution>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 3);
            entity.Property(x => x.Unit).HasMaxLength(30);
            entity.Property(x => x.Instructions).HasMaxLength(500);

            entity.HasIndex(x => new
            {
                x.RecipeIngredientId,
                x.SubstituteIngredientId
            }).IsUnique();

            entity.HasOne(x => x.RecipeIngredient)
                .WithMany()
                .HasForeignKey(x => x.RecipeIngredientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.SubstituteIngredient)
                .WithMany()
                .HasForeignKey(x => x.SubstituteIngredientId)
                .OnDelete(DeleteBehavior.Restrict);
        });
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
    private static void ConfigureFunctionPlan(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FunctionPlan>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(x => x.Notes)
                .HasMaxLength(2000);

            entity.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<FunctionPlanRecipe>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.RequiredServings)
                .IsRequired();

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_FunctionPlanRecipe_RequiredServings_Positive",
                    "`RequiredServings` > 0");
            });

            entity.HasIndex(x => new
            {
                x.FunctionPlanId,
                x.RecipeId
            }).IsUnique();

            entity.HasOne(x => x.FunctionPlan)
                .WithMany(x => x.Recipes)
                .HasForeignKey(x => x.FunctionPlanId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Recipe)
                .WithMany()
                .HasForeignKey(x => x.RecipeId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}