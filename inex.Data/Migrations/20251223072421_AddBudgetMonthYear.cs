using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetMonthYear : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "user_pk",
                table: "user",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "transaction_pk",
                table: "transaction",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "tag_pk",
                table: "tag",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "exchange_rate_pk",
                table: "exchange_rate",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "currency_pk",
                table: "currency",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "category_pk",
                table: "category",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "budget_pk",
                table: "budget",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AddColumn<int>(
                name: "month",
                table: "budget",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "year",
                table: "budget",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "account_pk",
                table: "account",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7462), new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7466) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7470), new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7471) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7473), new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7474) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7476), new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7476) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7478), new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7479) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7481), new DateTime(2025, 12, 23, 7, 24, 21, 195, DateTimeKind.Utc).AddTicks(7481) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "month",
                table: "budget");

            migrationBuilder.DropColumn(
                name: "year",
                table: "budget");

            migrationBuilder.AlterColumn<int>(
                name: "user_pk",
                table: "user",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "transaction_pk",
                table: "transaction",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "tag_pk",
                table: "tag",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "exchange_rate_pk",
                table: "exchange_rate",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "currency_pk",
                table: "currency",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "category_pk",
                table: "category",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "budget_pk",
                table: "budget",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "account_pk",
                table: "account",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

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
        }
    }
}
