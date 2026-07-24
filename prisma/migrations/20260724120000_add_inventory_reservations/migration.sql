ALTER TABLE `product`
  ADD COLUMN `reservedQuantity` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `inventory_reservation` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `orderItemId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `status` ENUM('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `releasedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `inv_res_orderItem_key` (`orderItemId`),
  INDEX `inv_res_status_expires_idx` (`status`, `expiresAt`),
  INDEX `inv_res_order_status_idx` (`orderId`, `status`),
  INDEX `inv_res_product_status_idx` (`productId`, `status`),
  CONSTRAINT `inv_res_quantity_chk` CHECK (`quantity` > 0),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `outbox_event` (
  `id` VARCHAR(191) NOT NULL,
  `aggregateType` VARCHAR(64) NOT NULL,
  `aggregateId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(96) NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  UNIQUE INDEX `outbox_event_idem_key` (`idempotencyKey`),
  INDEX `outbox_event_status_available_idx` (`status`, `availableAt`),
  INDEX `outbox_event_aggregate_idx` (`aggregateType`, `aggregateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inventory_reservation`
  ADD CONSTRAINT `inv_res_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `inv_res_orderitem_fk` FOREIGN KEY (`orderItemId`) REFERENCES `orderitem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `inv_res_product_fk` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `outbox_event`
  ADD CONSTRAINT `outbox_event_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `product`
  ADD CONSTRAINT `product_stock_nonnegative_chk` CHECK (`stockQuantity` >= 0),
  ADD CONSTRAINT `product_reserved_nonnegative_chk` CHECK (`reservedQuantity` >= 0),
  ADD CONSTRAINT `product_reserved_lte_stock_chk` CHECK (`reservedQuantity` <= `stockQuantity`);
