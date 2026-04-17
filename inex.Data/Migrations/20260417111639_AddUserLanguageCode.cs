using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLanguageCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LanguageCode",
                table: "AspNetUsers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5553), new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5556) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5557), new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5558) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5559), new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5560) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5561), new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5561) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5562), new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5563) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5564), new DateTime(2026, 4, 17, 11, 16, 37, 995, DateTimeKind.Utc).AddTicks(5564) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LanguageCode",
                table: "AspNetUsers");

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1229), new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1234) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1266), new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1267) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1268), new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1269) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1270), new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1270) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1271), new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1272) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1273), new DateTime(2026, 3, 28, 18, 57, 40, 501, DateTimeKind.Utc).AddTicks(1273) });
        }
    }
}
