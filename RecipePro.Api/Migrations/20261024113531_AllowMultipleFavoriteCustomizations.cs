using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApi.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultipleFavoriteCustomizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_RecipeId_New",
                table: "Favorites",
                columns: new[] { "UserId", "RecipeId" });

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_RecipeId",
                table: "Favorites");

            migrationBuilder.RenameIndex(
                name: "IX_Favorites_UserId_RecipeId_New",
                table: "Favorites",
                newName: "IX_Favorites_UserId_RecipeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId_RecipeId_Old",
                table: "Favorites",
                columns: new[] { "UserId", "RecipeId" },
                unique: true);

            migrationBuilder.DropIndex(
                name: "IX_Favorites_UserId_RecipeId",
                table: "Favorites");

            migrationBuilder.RenameIndex(
                name: "IX_Favorites_UserId_RecipeId_Old",
                table: "Favorites",
                newName: "IX_Favorites_UserId_RecipeId");
        }
    }
}
