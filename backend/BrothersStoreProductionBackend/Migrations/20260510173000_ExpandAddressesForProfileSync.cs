using BrothersStoreApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrothersStoreApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260510173000_ExpandAddressesForProfileSync")]
public class ExpandAddressesForProfileSync : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Label",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<bool>(
            name: "IsDefault",
            table: "Addresses",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<string>(
            name: "FullName",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Mobile",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "AlternateMobile",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Pincode",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "AddressLine1",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "AddressLine2",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Landmark",
            table: "Addresses",
            type: "text",
            nullable: false,
            defaultValue: "");

        // Best-effort backfill for legacy data so older addresses still show up.
        migrationBuilder.Sql("UPDATE \"Addresses\" SET \"AddressLine1\" = COALESCE(NULLIF(\"AddressLine1\", ''), \"Line1\") WHERE \"AddressLine1\" = '';");
        migrationBuilder.Sql("UPDATE \"Addresses\" SET \"Pincode\" = COALESCE(NULLIF(\"Pincode\", ''), \"PostalCode\") WHERE \"Pincode\" = '';");
        migrationBuilder.Sql("UPDATE \"Addresses\" SET \"Label\" = CASE WHEN \"Label\" = '' THEN 'Home' ELSE \"Label\" END;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Label", table: "Addresses");
        migrationBuilder.DropColumn(name: "IsDefault", table: "Addresses");
        migrationBuilder.DropColumn(name: "FullName", table: "Addresses");
        migrationBuilder.DropColumn(name: "Mobile", table: "Addresses");
        migrationBuilder.DropColumn(name: "AlternateMobile", table: "Addresses");
        migrationBuilder.DropColumn(name: "Pincode", table: "Addresses");
        migrationBuilder.DropColumn(name: "AddressLine1", table: "Addresses");
        migrationBuilder.DropColumn(name: "AddressLine2", table: "Addresses");
        migrationBuilder.DropColumn(name: "Landmark", table: "Addresses");
    }
}

