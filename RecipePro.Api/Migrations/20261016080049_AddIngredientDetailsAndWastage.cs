using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIngredientDetailsAndWastage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Brand",
                table: "Ingredients",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CautionMessage",
                table: "Ingredients",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsCautionRequired",
                table: "Ingredients",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Ingredients",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "ShelfLifeDays",
                table: "Ingredients",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageInstructions",
                table: "Ingredients",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "WastageQuantity",
                table: "Ingredients",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WastageUnit",
                table: "Ingredients",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Brand",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "CautionMessage",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "IsCautionRequired",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "ShelfLifeDays",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "StorageInstructions",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "WastageQuantity",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "WastageUnit",
                table: "Ingredients");
        }
    }
}
