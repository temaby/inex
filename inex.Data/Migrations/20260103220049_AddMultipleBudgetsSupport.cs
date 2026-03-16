using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMultipleBudgetsSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7141), new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7146) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7152), new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7154) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7158), new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7160) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7164), new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7165) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7169), new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7170) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7174), new DateTime(2026, 1, 3, 22, 0, 48, 873, DateTimeKind.Utc).AddTicks(7175) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4328), new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4331) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4335), new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4336) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4338), new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4339) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4341), new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4342) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4343), new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4344) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4346), new DateTime(2026, 1, 3, 21, 58, 55, 689, DateTimeKind.Utc).AddTicks(4347) });
        }
    }
}
