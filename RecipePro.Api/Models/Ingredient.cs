
    using RecipePro.Api.Models.Common;
    using RecipePro.Api.Models.Enums;

    namespace RecipePro.Api.Models;

    public class Ingredient : AuditableEntity
    {
        public string Name { get; set; } = string.Empty;

        public string? PhotoUrl { get; set; }

        // Measurement conversion
        public decimal? GramsPerMilliliter { get; set; }

        public decimal? GramsPerPiece { get; set; }

        // Purchase details
        public decimal? PurchasePrice { get; set; }

        public decimal? PurchaseQuantity { get; set; }

        public string? PurchaseUnit { get; set; }

        // Ingredient classification: Veg / Non-Veg
        public IngredientDietType IngredientType { get; set; }
            = IngredientDietType.Veg;

        // Wastage details
        public decimal? WastageQuantity { get; set; }

        public string? WastageUnit { get; set; }

        // Caution warning
        public bool IsCautionRequired { get; set; } = false;

        public string? CautionMessage { get; set; }

        // Storage and shelf life
        public string? StorageInstructions { get; set; }

        public int? ShelfLifeDays { get; set; }

        // Additional details
        public string? Brand { get; set; }

        public string? Notes { get; set; }

        // Recipe relationship
        public ICollection<RecipeIngredient> RecipeIngredients { get; set; }
            = new List<RecipeIngredient>();

        public IngredientStatus Status { get; set; }
        = IngredientStatus.Active;

    }
