using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrothersStoreApi.Migrations
{
    public partial class AddProductAndReviewIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryName",
                table: "Products",
                column: "CategoryName");

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive",
                table: "Products",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ProductId_Status_ApprovedAt",
                table: "Reviews",
                columns: new[] { "ProductId", "Status", "ApprovedAt" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_CategoryName",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_ProductId_Status_ApprovedAt",
                table: "Reviews");
        }
    }
}
