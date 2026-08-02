ALTER TABLE `product`
  ADD COLUMN `sku` VARCHAR(64) NULL,
  ADD COLUMN `lowStockThreshold` INTEGER NOT NULL DEFAULT 5;

UPDATE `product` SET `sku` = CONCAT('SKU-', `code`) WHERE `sku` IS NULL;
ALTER TABLE `product` MODIFY `sku` VARCHAR(64) NOT NULL;
CREATE UNIQUE INDEX `product_sku_key` ON `product`(`sku`);

ALTER TABLE `seller_fulfillment`
  ADD COLUMN `deliveryFailedAt` DATETIME(3) NULL,
  ADD COLUMN `deliveryFailureReason` VARCHAR(500) NULL,
  ADD COLUMN `proofOfDeliveryUrl` VARCHAR(191) NULL,
  ADD COLUMN `proofRecipientName` VARCHAR(191) NULL;

CREATE TABLE `seller_profile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `businessName` VARCHAR(191) NOT NULL,
  `taxCode` VARCHAR(64) NULL,
  `identityNumber` VARCHAR(64) NULL,
  `identityFrontUrl` VARCHAR(191) NULL,
  `identityBackUrl` VARCHAR(191) NULL,
  `businessAddress` VARCHAR(500) NOT NULL,
  `commissionRate` DECIMAL(7,4) NOT NULL DEFAULT 5,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decidedAt` DATETIME(3) NULL,
  `decidedBy` VARCHAR(191) NULL,
  `rejectionReason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `seller_profile_userId_key`(`userId`),
  INDEX `seller_profile_status_submitted_idx`(`status`,`submittedAt`),
  CONSTRAINT `seller_profile_user_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `seller_profile` (`id`,`userId`,`status`,`businessName`,`businessAddress`,`commissionRate`,`submittedAt`,`decidedAt`,`createdAt`,`updatedAt`)
SELECT CONCAT('legacy-', `id`), `id`, 'APPROVED', `name`, 'Legacy seller profile', 5, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `user` WHERE `isSeller` = 1;

CREATE TABLE `inventory_movement` (
  `id` VARCHAR(191) NOT NULL, `productId` VARCHAR(191) NOT NULL, `actorId` VARCHAR(191) NULL,
  `type` VARCHAR(32) NOT NULL, `quantityDelta` INTEGER NOT NULL, `stockBefore` INTEGER NOT NULL, `stockAfter` INTEGER NOT NULL,
  `reason` VARCHAR(500) NOT NULL, `referenceType` VARCHAR(64) NULL, `referenceId` VARCHAR(191) NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `inventory_movement_idempotencyKey_key`(`idempotencyKey`),
  INDEX `inventory_movement_product_created_idx`(`productId`,`createdAt`),
  CONSTRAINT `inventory_movement_product_fk` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_movement_actor_fk` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `delivery_attempt` (
  `id` VARCHAR(191) NOT NULL, `fulfillmentId` VARCHAR(191) NOT NULL, `shipperId` VARCHAR(191) NOT NULL,
  `outcome` VARCHAR(32) NOT NULL, `proofUrl` VARCHAR(191) NULL, `recipientName` VARCHAR(191) NULL, `note` VARCHAR(500) NULL,
  `latitude` DECIMAL(10,7) NULL, `longitude` DECIMAL(10,7) NULL, `idempotencyKey` VARCHAR(191) NOT NULL,
  `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  UNIQUE INDEX `delivery_attempt_idempotencyKey_key`(`idempotencyKey`), INDEX `delivery_attempt_fulfillment_idx`(`fulfillmentId`,`attemptedAt`),
  CONSTRAINT `delivery_attempt_fulfillment_fk` FOREIGN KEY (`fulfillmentId`) REFERENCES `seller_fulfillment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `delivery_attempt_shipper_fk` FOREIGN KEY (`shipperId`) REFERENCES `user`(`id`) ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cod_collection` (
  `id` VARCHAR(191) NOT NULL, `fulfillmentId` VARCHAR(191) NOT NULL, `collectedById` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(19,4) NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'VND', `status` VARCHAR(32) NOT NULL DEFAULT 'COLLECTED',
  `collectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `remittedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `cod_collection_fulfillmentId_key`(`fulfillmentId`), INDEX `cod_collection_status_idx`(`status`,`collectedAt`),
  CONSTRAINT `cod_collection_fulfillment_fk` FOREIGN KEY (`fulfillmentId`) REFERENCES `seller_fulfillment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cod_collection_collector_fk` FOREIGN KEY (`collectedById`) REFERENCES `user`(`id`) ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payout_request` (
  `id` VARCHAR(191) NOT NULL, `sellerId` VARCHAR(191) NOT NULL, `bankInfoId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(19,4) NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'VND', `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `processedAt` DATETIME(3) NULL, `processedBy` VARCHAR(191) NULL,
  `rejectionReason` VARCHAR(500) NULL, PRIMARY KEY (`id`), INDEX `payout_request_seller_status_idx`(`sellerId`,`status`,`requestedAt`),
  CONSTRAINT `payout_request_seller_fk` FOREIGN KEY (`sellerId`) REFERENCES `user`(`id`) ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `seller_settlement` (
  `id` VARCHAR(191) NOT NULL, `fulfillmentId` VARCHAR(191) NOT NULL, `sellerId` VARCHAR(191) NOT NULL,
  `grossAmount` DECIMAL(19,4) NOT NULL, `commissionRate` DECIMAL(7,4) NOT NULL, `commissionAmount` DECIMAL(19,4) NOT NULL,
  `netAmount` DECIMAL(19,4) NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'VND', `status` VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `paidAt` DATETIME(3) NULL, `payoutRequestId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `seller_settlement_fulfillmentId_key`(`fulfillmentId`),
  INDEX `seller_settlement_seller_status_idx`(`sellerId`,`status`,`availableAt`), INDEX `seller_settlement_payoutRequestId_idx`(`payoutRequestId`),
  CONSTRAINT `seller_settlement_fulfillment_fk` FOREIGN KEY (`fulfillmentId`) REFERENCES `seller_fulfillment`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `seller_settlement_seller_fk` FOREIGN KEY (`sellerId`) REFERENCES `user`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `seller_settlement_payout_fk` FOREIGN KEY (`payoutRequestId`) REFERENCES `payout_request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fulfillment_return` (
  `id` VARCHAR(191) NOT NULL, `fulfillmentId` VARCHAR(191) NOT NULL, `requesterId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'REQUESTED', `reason` VARCHAR(500) NOT NULL, `evidenceUrl` VARCHAR(191) NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `decidedAt` DATETIME(3) NULL, `completedAt` DATETIME(3) NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL, PRIMARY KEY (`id`), UNIQUE INDEX `fulfillment_return_idempotencyKey_key`(`idempotencyKey`),
  INDEX `fulfillment_return_status_idx`(`fulfillmentId`,`status`),
  CONSTRAINT `fulfillment_return_fulfillment_fk` FOREIGN KEY (`fulfillmentId`) REFERENCES `seller_fulfillment`(`id`) ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;