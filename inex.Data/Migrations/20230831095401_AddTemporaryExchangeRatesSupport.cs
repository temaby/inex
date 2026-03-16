using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    public partial class AddTemporaryExchangeRatesSupport : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "user_pk",
                table: "user",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "transaction_pk",
                table: "transaction",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "tag_pk",
                table: "tag",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.UpdateData(
                table: "exchange_rate",
                keyColumn: "to_code",
                keyValue: null,
                column: "to_code",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "to_code",
                table: "exchange_rate",
                type: "varchar(3)",
                maxLength: 3,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(3)",
                oldMaxLength: 3,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "exchange_rate",
                keyColumn: "from_code",
                keyValue: null,
                column: "from_code",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "from_code",
                table: "exchange_rate",
                type: "varchar(3)",
                maxLength: 3,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(3)",
                oldMaxLength: 3,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "exchange_rate_pk",
                table: "exchange_rate",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AddColumn<bool>(
                name: "is_temporary",
                table: "exchange_rate",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<int>(
                name: "currency_pk",
                table: "currency",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "category_pk",
                table: "category",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AlterColumn<int>(
                name: "account_pk",
                table: "account",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .Annotation("Relational:ColumnOrder", 1)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5615), new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5617) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5619), new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5620) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5621), new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5622) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5623), new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5623) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5625), new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5626) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5627), new DateTime(2023, 8, 31, 9, 54, 1, 176, DateTimeKind.Utc).AddTicks(5627) });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_temporary",
                table: "exchange_rate");

            migrationBuilder.AlterColumn<int>(
                name: "user_pk",
                table: "user",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.AlterColumn<int>(
                name: "transaction_pk",
                table: "transaction",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.AlterColumn<int>(
                name: "tag_pk",
                table: "tag",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.AlterColumn<string>(
                name: "to_code",
                table: "exchange_rate",
                type: "varchar(3)",
                maxLength: 3,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(3)",
                oldMaxLength: 3)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "from_code",
                table: "exchange_rate",
                type: "varchar(3)",
                maxLength: 3,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(3)",
                oldMaxLength: 3)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "exchange_rate_pk",
                table: "exchange_rate",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.AlterColumn<int>(
                name: "currency_pk",
                table: "currency",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.AlterColumn<int>(
                name: "category_pk",
                table: "category",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.AlterColumn<int>(
                name: "account_pk",
                table: "account",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn)
                .OldAnnotation("Relational:ColumnOrder", 1);

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 1,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(1395), new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(1739) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 2,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2024), new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2025) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 3,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2027), new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2028) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 4,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2029), new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2030) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 5,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2032), new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2032) });

            migrationBuilder.UpdateData(
                table: "currency",
                keyColumn: "currency_pk",
                keyValue: 6,
                columns: new[] { "created", "updated" },
                values: new object[] { new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2034), new DateTime(2021, 12, 14, 13, 30, 41, 944, DateTimeKind.Utc).AddTicks(2035) });
        }
    }
}
