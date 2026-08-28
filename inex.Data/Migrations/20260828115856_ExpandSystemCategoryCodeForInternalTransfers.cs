using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExpandSystemCategoryCodeForInternalTransfers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "system_code",
                table: "category",
                type: "varchar(32)",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(15)",
                oldMaxLength: 15,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql("""
                UPDATE category
                SET system_code = 'internal-transfer'
                WHERE system_code = 'internal_xfer';
                """);

            migrationBuilder.Sql("""
                INSERT INTO category (user_fk, is_enabled, is_system, system_code, created_by, updated_by, `key`, name)
                SELECT users.Id,
                       TRUE,
                       TRUE,
                       'internal-transfer',
                       users.Id,
                       users.Id,
                       'internal-transfer',
                       CASE WHEN users.LanguageCode = 'ru' THEN 'Внутренний перевод' ELSE 'Internal transfer' END
                FROM AspNetUsers AS users
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM category AS categories
                    WHERE categories.user_fk = users.Id
                      AND categories.system_code = 'internal-transfer'
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE category
                SET system_code = 'internal_xfer'
                WHERE system_code = 'internal-transfer';
                """);

            migrationBuilder.AlterColumn<string>(
                name: "system_code",
                table: "category",
                type: "varchar(15)",
                maxLength: 15,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(32)",
                oldMaxLength: 32,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
