using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

namespace inex.Data.Migrations;

public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterDatabase()
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "currency",
            columns: table => new
            {
                currency_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true),
                key = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                description = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_currency", x => x.currency_pk);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "exchange_rate",
            columns: table => new
            {
                exchange_rate_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                from_code = table.Column<string>(type: "varchar(3)", maxLength: 3, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                to_code = table.Column<string>(type: "varchar(3)", maxLength: 3, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                rate = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_exchange_rate", x => x.exchange_rate_pk);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "user",
            columns: table => new
            {
                user_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                currency_fk = table.Column<int>(type: "int", nullable: false),
                username = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                email = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                password = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                role = table.Column<string>(type: "VARCHAR(5)", nullable: false, defaultValue: "USER")
                    .Annotation("MySql:CharSet", "utf8mb4"),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_user", x => x.user_pk);
                table.ForeignKey(
                    name: "user__currency__FK",
                    column: x => x.currency_fk,
                    principalTable: "currency",
                    principalColumn: "currency_pk",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "account",
            columns: table => new
            {
                account_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                user_fk = table.Column<int>(type: "int", nullable: false),
                currency_fk = table.Column<int>(type: "int", nullable: false),
                is_enabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true),
                key = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                description = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_account", x => x.account_pk);
                table.ForeignKey(
                    name: "account__currency__FK",
                    column: x => x.currency_fk,
                    principalTable: "currency",
                    principalColumn: "currency_pk",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "account__user__FK",
                    column: x => x.user_fk,
                    principalTable: "user",
                    principalColumn: "user_pk",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "category",
            columns: table => new
            {
                category_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                user_fk = table.Column<int>(type: "int", nullable: false),
                parent_fk = table.Column<int>(type: "int", nullable: true),
                is_enabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                is_system = table.Column<bool>(type: "tinyint(1)", nullable: false),
                system_code = table.Column<string>(type: "varchar(15)", maxLength: 15, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true),
                key = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                description = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_category", x => x.category_pk);
                table.ForeignKey(
                    name: "category__category__FK",
                    column: x => x.parent_fk,
                    principalTable: "category",
                    principalColumn: "category_pk",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "category__user__FK",
                    column: x => x.user_fk,
                    principalTable: "user",
                    principalColumn: "user_pk",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "tag",
            columns: table => new
            {
                tag_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                user_fk = table.Column<int>(type: "int", nullable: false),
                tag_type = table.Column<string>(type: "VARCHAR(5)", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true),
                key = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                description = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_tag", x => x.tag_pk);
                table.ForeignKey(
                    name: "tag__user__FK",
                    column: x => x.user_fk,
                    principalTable: "user",
                    principalColumn: "user_pk",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "transaction",
            columns: table => new
            {
                transaction_pk = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                account_fk = table.Column<int>(type: "int", nullable: false),
                category_fk = table.Column<int>(type: "int", nullable: false),
                user_fk = table.Column<int>(type: "int", nullable: false),
                comment = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                value = table.Column<decimal>(type: "DECIMAL(12,2)", nullable: false),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_transaction", x => x.transaction_pk);
                table.ForeignKey(
                    name: "transaction__account__FK",
                    column: x => x.account_fk,
                    principalTable: "account",
                    principalColumn: "account_pk",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "transaction__category__FK",
                    column: x => x.category_fk,
                    principalTable: "category",
                    principalColumn: "category_pk",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "transaction__user__FK",
                    column: x => x.user_fk,
                    principalTable: "user",
                    principalColumn: "user_pk",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "transaction_tag_map",
            columns: table => new
            {
                transaction_fk = table.Column<int>(type: "int", nullable: false),
                tag_fk = table.Column<int>(type: "int", nullable: false),
                created = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                updated = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                created_by = table.Column<int>(type: "int", nullable: true),
                updated_by = table.Column<int>(type: "int", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_transaction_tag_map", x => new { x.transaction_fk, x.tag_fk });
                table.ForeignKey(
                    name: "transaction_tag_map__tag__FK",
                    column: x => x.tag_fk,
                    principalTable: "tag",
                    principalColumn: "tag_pk",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "transaction_tag_map__transaction__FK",
                    column: x => x.transaction_fk,
                    principalTable: "transaction",
                    principalColumn: "transaction_pk",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.InsertData(
            table: "currency",
            columns: new[] { "currency_pk", "created", "created_by", "description", "key", "name", "updated", "updated_by" },
            values: new object[,]
            {
                    { 1, new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(1395), null, null, "USD", "USD", new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(1739), null },
                    { 2, new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2024), null, null, "BYN", "BYN", new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2025), null },
                    { 3, new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2027), null, null, "RUB", "RUB", new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2028), null },
                    { 4, new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2029), null, null, "EUR", "EUR", new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2030), null },
                    { 5, new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2032), null, null, "BYR", "BYR", new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2032), null },
                    { 6, new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2034), null, null, "PLN", "PLN", new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2035), null }
            });

        migrationBuilder.InsertData(
            table: "user",
            columns: new[] { "user_pk", "created_by", "currency_fk", "email", "password", "updated_by", "username" },
            values: new object[] { 1, null, 1, "registration.user@outlook.com", "111111", null, "temaby" });

        migrationBuilder.InsertData(
            table: "category",
            columns: new[] { "category_pk", "created_by", "description", "is_enabled", "is_system", "key", "name", "parent_fk", "system_code", "updated_by", "user_fk" },
            values: new object[] { 1, null, null, true, true, "transfer", "Трансфер", null, "transfer", null, 1 });

        migrationBuilder.CreateIndex(
            name: "IX_account_currency_fk",
            table: "account",
            column: "currency_fk");

        migrationBuilder.CreateIndex(
            name: "IX_account_user_fk",
            table: "account",
            column: "user_fk");

        migrationBuilder.CreateIndex(
            name: "IX_category_parent_fk",
            table: "category",
            column: "parent_fk");

        migrationBuilder.CreateIndex(
            name: "IX_category_user_fk",
            table: "category",
            column: "user_fk");

        migrationBuilder.CreateIndex(
            name: "key__idx",
            table: "currency",
            column: "key",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_tag_user_fk",
            table: "tag",
            column: "user_fk");

        migrationBuilder.CreateIndex(
            name: "IX_transaction_account_fk",
            table: "transaction",
            column: "account_fk");

        migrationBuilder.CreateIndex(
            name: "IX_transaction_category_fk",
            table: "transaction",
            column: "category_fk");

        migrationBuilder.CreateIndex(
            name: "IX_transaction_user_fk",
            table: "transaction",
            column: "user_fk");

        migrationBuilder.CreateIndex(
            name: "IX_transaction_tag_map_tag_fk",
            table: "transaction_tag_map",
            column: "tag_fk");

        migrationBuilder.CreateIndex(
            name: "IX_user_currency_fk",
            table: "user",
            column: "currency_fk");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "exchange_rate");

        migrationBuilder.DropTable(
            name: "transaction_tag_map");

        migrationBuilder.DropTable(
            name: "tag");

        migrationBuilder.DropTable(
            name: "transaction");

        migrationBuilder.DropTable(
            name: "account");

        migrationBuilder.DropTable(
            name: "category");

        migrationBuilder.DropTable(
            name: "user");

        migrationBuilder.DropTable(
            name: "currency");
    }
}
