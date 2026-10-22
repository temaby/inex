START TRANSACTION;

CREATE TABLE `internal_transfer_request` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `MasterUserId` int NOT NULL,
    `LinkedUserId` int NOT NULL,
    `MasterUsername` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
    `LinkedUsername` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
    `AcceptedAccountId` int NULL,
    `LinkId` int NOT NULL,
    `SubmissionKey` varchar(36) CHARACTER SET utf8mb4 NOT NULL,
    `OriginalAccountId` int NOT NULL,
    `CurrencyId` int NOT NULL,
    `Currency` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
    `MasterValue` decimal(12,2) NOT NULL,
    `OperationDate` datetime(6) NOT NULL,
    `OriginalComment` varchar(255) CHARACTER SET utf8mb4 NULL,
    `MasterTransactionId` int NULL,
    `LinkedTransactionId` int NULL,
    `Status` int NOT NULL,
    `RequestedAt` datetime(6) NOT NULL,
    `DecidedAt` datetime(6) NULL,
    `DecidedBy` int NULL,
    `Version` char(36) COLLATE ascii_general_ci NOT NULL,
    `created` timestamp NOT NULL,
    `updated` timestamp NOT NULL,
    `created_by` int NULL,
    `updated_by` int NULL,
    CONSTRAINT `PK_internal_transfer_request` PRIMARY KEY (`Id`),
    CONSTRAINT `CK_transfer_request_participants` CHECK (`MasterUserId` <> `LinkedUserId`),
    CONSTRAINT `CK_transfer_request_value` CHECK (`MasterValue` <> 0),
    CONSTRAINT `FK_internal_transfer_request_AspNetUsers_LinkedUserId` FOREIGN KEY (`LinkedUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_internal_transfer_request_AspNetUsers_MasterUserId` FOREIGN KEY (`MasterUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_internal_transfer_request_currency_CurrencyId` FOREIGN KEY (`CurrencyId`) REFERENCES `currency` (`currency_pk`) ON DELETE RESTRICT,
    CONSTRAINT `FK_internal_transfer_request_transaction_LinkedTransactionId` FOREIGN KEY (`LinkedTransactionId`) REFERENCES `transaction` (`transaction_pk`) ON DELETE SET NULL,
    CONSTRAINT `FK_internal_transfer_request_transaction_MasterTransactionId` FOREIGN KEY (`MasterTransactionId`) REFERENCES `transaction` (`transaction_pk`) ON DELETE SET NULL,
    CONSTRAINT `FK_internal_transfer_request_user_account_link_LinkId` FOREIGN KEY (`LinkId`) REFERENCES `user_account_link` (`user_account_link_pk`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_internal_transfer_request_CurrencyId` ON `internal_transfer_request` (`CurrencyId`);

CREATE UNIQUE INDEX `IX_internal_transfer_request_LinkedTransactionId` ON `internal_transfer_request` (`LinkedTransactionId`);

CREATE INDEX `IX_internal_transfer_request_LinkedUserId_Status_Id` ON `internal_transfer_request` (`LinkedUserId`, `Status`, `Id`);

CREATE INDEX `IX_internal_transfer_request_LinkId` ON `internal_transfer_request` (`LinkId`);

CREATE UNIQUE INDEX `IX_internal_transfer_request_MasterTransactionId` ON `internal_transfer_request` (`MasterTransactionId`);

CREATE INDEX `IX_internal_transfer_request_MasterUserId_Status_Id` ON `internal_transfer_request` (`MasterUserId`, `Status`, `Id`);

CREATE UNIQUE INDEX `IX_internal_transfer_request_MasterUserId_SubmissionKey` ON `internal_transfer_request` (`MasterUserId`, `SubmissionKey`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20261016145417_AddInternalTransferRequests', '8.0.30');

COMMIT;

