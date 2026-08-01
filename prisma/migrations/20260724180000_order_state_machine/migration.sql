CREATE TEMPORARY TABLE order_state_migration_preflight (
  invalidCount INTEGER NOT NULL,
  CONSTRAINT order_state_legacy_preflight CHECK (invalidCount = 0)
);
INSERT INTO order_state_migration_preflight (invalidCount)
SELECT COUNT(*) FROM `order`
WHERE `status` NOT IN ('pending','processing','confirmed','shipped','delivered','cancelled','returned','expired','payment_review','refund_required','refunded','paid','payment_failed','packing','shipping','refund_pending','return_requested','return_approved','return_rejected','returning');
DROP TEMPORARY TABLE order_state_migration_preflight;
UPDATE `order` SET `status` = 'confirmed' WHERE `status` = 'processing';
UPDATE `order` SET `status` = 'shipping' WHERE `status` = 'shipped';
UPDATE `order` SET `status` = 'refund_pending' WHERE `status` = 'refund_required';

ALTER TABLE `order`
  ADD COLUMN `paidAt` DATETIME(3) NULL,
  ADD COLUMN `confirmedAt` DATETIME(3) NULL,
  ADD COLUMN `packingStartedAt` DATETIME(3) NULL,
  ADD COLUMN `shippedAt` DATETIME(3) NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `returnRequestedAt` DATETIME(3) NULL,
  ADD COLUMN `returnedAt` DATETIME(3) NULL,
  ADD COLUMN `refundPendingAt` DATETIME(3) NULL,
  ADD COLUMN `refundedAt` DATETIME(3) NULL,
  ADD COLUMN `statusVersion` INTEGER NOT NULL DEFAULT 0;

UPDATE `order` SET `deliveredAt` = COALESCE(`deliveredAt`, `updatedAt`) WHERE `status` = 'delivered';

CREATE TABLE `order_status_transition` (
  `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `fromStatus` VARCHAR(32) NOT NULL, `toStatus` VARCHAR(32) NOT NULL,
  `actorType` VARCHAR(32) NOT NULL, `actorId` VARCHAR(191) NULL,
  `reason` VARCHAR(500) NULL, `metadata` TEXT NULL,
  `idempotencyKey` VARCHAR(191) NULL, `requestHash` CHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `order_transition_idem_key`(`idempotencyKey`),
  INDEX `order_transition_order_created_idx`(`orderId`, `createdAt`),
  INDEX `order_transition_actor_idx`(`actorType`, `actorId`), PRIMARY KEY (`id`),
  CONSTRAINT `order_transition_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_return` (
  `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'REQUESTED', `reason` VARCHAR(500) NOT NULL,
  `requestedBy` VARCHAR(191) NOT NULL, `idempotencyKey` VARCHAR(191) NOT NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decidedAt` DATETIME(3) NULL, `completedAt` DATETIME(3) NULL,
  UNIQUE INDEX `order_return_idem_key`(`idempotencyKey`),
  INDEX `order_return_order_status_idx`(`orderId`, `status`), PRIMARY KEY (`id`),
  CONSTRAINT `order_return_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
