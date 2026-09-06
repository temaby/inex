using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations;

[Migration("20260906163000_AddAccountTransactionsOverviewVisibility")]
public partial class AddAccountTransactionsOverviewVisibility : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "is_favourite",
            table: "account",
            type: "tinyint(1)",
            nullable: false,
            defaultValue: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "is_favourite",
            table: "account");
    }
}
