using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace inex.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInternalTransferRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "internal_transfer_request",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    MasterUserId = table.Column<int>(type: "int", nullable: false),
                    LinkedUserId = table.Column<int>(type: "int", nullable: false),
                    MasterUsername = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false).Annotation("MySql:CharSet", "utf8mb4"),
                    LinkedUsername = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false).Annotation("MySql:CharSet", "utf8mb4"),
                    AcceptedAccountId = table.Column<int>(type: "int", nullable: true),
                    LinkId = table.Column<int>(type: "int", nullable: false),
                    SubmissionKey = table.Column<string>(type: "varchar(36)", maxLength: 36, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    OriginalAccountId = table.Column<int>(type: "int", nullable: false),
                    CurrencyId = table.Column<int>(type: "int", nullable: false),
                    Currency = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MasterValue = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    OperationDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    OriginalComment = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MasterTransactionId = table.Column<int>(type: "int", nullable: true),
                    LinkedTransactionId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DecidedBy = table.Column<int>(type: "int", nullable: true),
                    Version = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    created = table.Column<DateTime>(type: "timestamp", nullable: false),
                    updated = table.Column<DateTime>(type: "timestamp", nullable: false),
                    created_by = table.Column<int>(type: "int", nullable: true),
                    updated_by = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_internal_transfer_request", x => x.Id);
                    table.CheckConstraint("CK_transfer_request_participants", "`MasterUserId` <> `LinkedUserId`");
                    table.CheckConstraint("CK_transfer_request_value", "`MasterValue` <> 0");
                    table.ForeignKey(
                        name: "FK_internal_transfer_request_AspNetUsers_LinkedUserId",
                        column: x => x.LinkedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_internal_transfer_request_AspNetUsers_MasterUserId",
                        column: x => x.MasterUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_internal_transfer_request_currency_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currency",
                        principalColumn: "currency_pk",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_internal_transfer_request_transaction_LinkedTransactionId",
                        column: x => x.LinkedTransactionId,
                        principalTable: "transaction",
                        principalColumn: "transaction_pk",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_internal_transfer_request_transaction_MasterTransactionId",
                        column: x => x.MasterTransactionId,
                        principalTable: "transaction",
                        principalColumn: "transaction_pk",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_internal_transfer_request_user_account_link_LinkId",
                        column: x => x.LinkId,
                        principalTable: "user_account_link",
                        principalColumn: "user_account_link_pk",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_CurrencyId",
                table: "internal_transfer_request",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_LinkedTransactionId",
                table: "internal_transfer_request",
                column: "LinkedTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_LinkedUserId_Status_Id",
                table: "internal_transfer_request",
                columns: new[] { "LinkedUserId", "Status", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_LinkId",
                table: "internal_transfer_request",
                column: "LinkId");

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_MasterTransactionId",
                table: "internal_transfer_request",
                column: "MasterTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_MasterUserId_Status_Id",
                table: "internal_transfer_request",
                columns: new[] { "MasterUserId", "Status", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_internal_transfer_request_MasterUserId_SubmissionKey",
                table: "internal_transfer_request",
                columns: new[] { "MasterUserId", "SubmissionKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "internal_transfer_request");

        }
    }
}
