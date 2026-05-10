using BrothersStoreApi.Data;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrothersStoreApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260510133000_AddPrepaidDiscountRules")]
public class AddPrepaidDiscountRules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PrepaidDiscountRules",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                ProductId = table.Column<int>(type: "integer", nullable: false),
                MinQuantity = table.Column<int>(type: "integer", nullable: false),
                MaxQuantity = table.Column<int>(type: "integer", nullable: true),
                DiscountPerItem = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PrepaidDiscountRules", x => x.Id);
                table.ForeignKey(
                    name: "FK_PrepaidDiscountRules_Products_ProductId",
                    column: x => x.ProductId,
                    principalTable: "Products",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PrepaidDiscountRules_ProductId",
            table: "PrepaidDiscountRules",
            column: "ProductId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "PrepaidDiscountRules");
    }
}

