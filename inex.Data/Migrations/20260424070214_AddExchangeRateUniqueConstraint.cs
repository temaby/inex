using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExchangeRateUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2021, 12, 14, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rate_created_from_code_to_code",
                table: "exchange_rate",
                columns: new[] { "created", "from_code", "to_code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_exchange_rate_created_from_code_to_code",
                table: "exchange_rate");

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
    }
}
