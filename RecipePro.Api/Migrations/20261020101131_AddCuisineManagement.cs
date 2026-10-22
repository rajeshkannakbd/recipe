using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCuisineManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cuisines",
                columns: table => new
                {
                    Id = table.Column<long>(
                        type: "bigint",
                        nullable: false)
                        .Annotation(
                            "MySql:ValueGenerationStrategy",
                            MySqlValueGenerationStrategy.IdentityColumn),

                    Name = table.Column<string>(
                        type: "varchar(100)",
                        maxLength: 100,
                        nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),

                    CreatedAt = table.Column<DateTime>(
                        type: "datetime(6)",
                        nullable: false),

                    CreatedBy = table.Column<long>(
                        type: "bigint",
                        nullable: true),

                    UpdatedAt = table.Column<DateTime>(
                        type: "datetime(6)",
                        nullable: true),

                    UpdatedBy = table.Column<long>(
                        type: "bigint",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cuisines", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<long>(
                name: "CuisineId",
                table: "Recipes",
                type: "bigint",
                nullable: true);

            // Copy existing cuisine names into the new Cuisines table.
            migrationBuilder.Sql(
                """
                INSERT INTO Cuisines (Name, CreatedAt)
                SELECT DISTINCT TRIM(Cuisine), UTC_TIMESTAMP(6)
                FROM Recipes
                WHERE Cuisine IS NOT NULL
                AND TRIM(Cuisine) <> ''
                """);

            // Connect each existing recipe to its matching cuisine record.
            migrationBuilder.Sql(
                """
                UPDATE Recipes r
                INNER JOIN Cuisines c
                    ON LOWER(TRIM(r.Cuisine)) = LOWER(c.Name)
                SET r.CuisineId = c.Id
                WHERE r.Cuisine IS NOT NULL
                AND TRIM(r.Cuisine) <> ''
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Recipes_CuisineId",
                table: "Recipes",
                column: "CuisineId");

            migrationBuilder.CreateIndex(
                name: "IX_Cuisines_Name",
                table: "Cuisines",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Recipes_Cuisines_CuisineId",
                table: "Recipes",
                column: "CuisineId",
                principalTable: "Cuisines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Recipes_Cuisines_CuisineId",
                table: "Recipes");

            migrationBuilder.DropTable(
                name: "Cuisines");

            migrationBuilder.DropIndex(
                name: "IX_Recipes_CuisineId",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "CuisineId",
                table: "Recipes");
        }
    }
}
