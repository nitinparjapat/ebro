using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrothersStoreApi.Migrations
{
    [Migration("20260605120000_FixOriginalPriceForAllProviders")]
    public partial class FixOriginalPriceForAllProviders : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some earlier migrations used Postgres-specific quoting for SQL updates.
            // Ensure OriginalPrice is always valid for both SQL Server and Postgres.
            if ((migrationBuilder.ActiveProvider ?? string.Empty).Contains("Npgsql"))
            {
                migrationBuilder.Sql(
                    "UPDATE \"Products\" " +
                    "SET \"OriginalPrice\" = \"Price\" " +
                    "WHERE \"OriginalPrice\" <= 0 OR \"OriginalPrice\" < \"Price\";"
                );
            }
            else
            {
                migrationBuilder.Sql(
                    "UPDATE Products " +
                    "SET OriginalPrice = Price " +
                    "WHERE OriginalPrice <= 0 OR OriginalPrice < Price;"
                );
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: data correction migration.
        }
    }
}
