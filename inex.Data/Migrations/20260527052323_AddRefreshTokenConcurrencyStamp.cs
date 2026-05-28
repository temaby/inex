using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshTokenConcurrencyStamp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConcurrencyStamp",
                table: "RefreshTokens",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "00000000000000000000000000000000")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "RefreshTokens");
        }
    }
}
