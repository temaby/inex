using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    public partial class AddBudgetsSupport : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "budget_fk",
                table: "category",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "budget",
                columns: table => new
                {
                    budget_pk = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_fk = table.Column<int>(type: "int", nullable: false),
                    value = table.Column<decimal>(type: "DECIMAL(12,2)", nullable: false),
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
                    table.PrimaryKey("PK_budget", x => x.budget_pk);
                    table.ForeignKey(
                        name: "budget__user__FK",
                        column: x => x.user_fk,
                        principalTable: "user",
                        principalColumn: "user_pk",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9488), new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9490) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9492), new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9492) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9494), new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9494) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9495), new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9495) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9496), new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9497) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9498), new DateTime(2023, 9, 18, 6, 4, 31, 198, DateTimeKind.Utc).AddTicks(9498) });

            migrationBuilder.CreateIndex(
                name: "IX_category_budget_fk",
                table: "category",
                column: "budget_fk");

            migrationBuilder.CreateIndex(
                name: "IX_budget_user_fk",
                table: "budget",
                column: "user_fk");

            migrationBuilder.AddForeignKey(
                name: "category__budget__FK",
                table: "category",
                column: "budget_fk",
                principalTable: "budget",
                principalColumn: "budget_pk");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "category__budget__FK",
                table: "category");

            migrationBuilder.DropTable(
                name: "budget");

            migrationBuilder.DropIndex(
                name: "IX_category_budget_fk",
                table: "category");

            migrationBuilder.DropColumn(
                name: "budget_fk",
                table: "category");

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3363), new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3367) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3368), new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3369) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3370), new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3370) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3371), new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3372) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3373), new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3373) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3374), new DateTime(2023, 9, 16, 13, 11, 53, 175, DateTimeKind.Utc).AddTicks(3374) });
        }
    }
}
