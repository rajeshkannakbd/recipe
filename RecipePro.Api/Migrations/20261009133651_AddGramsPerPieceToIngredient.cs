using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApi.Migrations
{
    public partial class AddGramsPerPieceToIngredient : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // GramsPerPiece already exists in the database.
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Preserve the existing GramsPerPiece column.
        }
    }
}