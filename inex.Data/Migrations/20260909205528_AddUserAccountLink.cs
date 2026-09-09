using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAccountLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_account_link",
                columns: table => new
                {
                    user_account_link_pk = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    master_user_fk = table.Column<int>(type: "int", nullable: false),
                    linked_user_fk = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    accepted_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    revoked_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    active_linked_user_fk = table.Column<int>(type: "int", nullable: true, computedColumnSql: "CASE WHEN `status` = 1 THEN `linked_user_fk` ELSE NULL END", stored: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_account_link", x => x.user_account_link_pk);
                    table.CheckConstraint("CK_user_account_link__different_users", "`master_user_fk` <> `linked_user_fk`");
                    table.ForeignKey(
                        name: "user_account_link__linked_user__FK",
                        column: x => x.linked_user_fk,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "user_account_link__master_user__FK",
                        column: x => x.master_user_fk,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_user_account_link__master_user",
                table: "user_account_link",
                column: "master_user_fk");

            migrationBuilder.CreateIndex(
                name: "IX_user_account_link_linked_user_fk",
                table: "user_account_link",
                column: "linked_user_fk");

            migrationBuilder.CreateIndex(
                name: "UX_user_account_link__active_linked_user",
                table: "user_account_link",
                column: "active_linked_user_fk",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_account_link");
        }
    }
}
