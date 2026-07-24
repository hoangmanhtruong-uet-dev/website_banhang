-- Durable request idempotency, payment/refund dedupe, and webhook event inbox.
ALTER TABLE `order`
    ADD COLUMN `idempotencyScope` VARCHAR(191) NULL,
    ADD COLUMN `idempotencyKey` VARCHAR(255) NULL;
CREATE UNIQUE INDEX `order_idempotencyScope_idempotencyKey_key` ON `order`(`idempotencyScope`, `idempotencyKey`);

CREATE TABLE `idempotency_record` (
    `id` VARCHAR(191) NOT NULL, `key` VARCHAR(255) NOT NULL, `scopeId` VARCHAR(191) NOT NULL,
    `operation` VARCHAR(191) NOT NULL, `method` VARCHAR(16) NOT NULL, `requestHash` CHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PROCESSING', `responseStatus` INTEGER NULL,
    `responseBody` LONGTEXT NULL, `resourceType` VARCHAR(64) NULL, `resourceId` VARCHAR(191) NULL,
    `errorCode` VARCHAR(191) NULL, `lockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL, `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `idempotency_record_scopeId_operation_key_key`(`scopeId`, `operation`, `key`),
    INDEX `idempotency_record_expiresAt_idx`(`expiresAt`), INDEX `idempotency_record_status_lockedAt_idx`(`status`, `lockedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment` (
    `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL, `status` VARCHAR(32) NOT NULL DEFAULT 'completed', `operation` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(255) NOT NULL, `provider` VARCHAR(64) NOT NULL DEFAULT 'internal_wallet',
    `providerIdempotencyKey` VARCHAR(191) NOT NULL, `providerTransactionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `payment_orderId_key`(`orderId`), UNIQUE INDEX `payment_providerIdempotencyKey_key`(`providerIdempotencyKey`),
    UNIQUE INDEX `payment_providerTransactionId_key`(`providerTransactionId`),
    UNIQUE INDEX `payment_userId_operation_idempotencyKey_key`(`userId`, `operation`, `idempotencyKey`),
    INDEX `payment_userId_createdAt_idx`(`userId`, `createdAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `refund` (
    `id` VARCHAR(191) NOT NULL, `paymentId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL, `status` VARCHAR(32) NOT NULL DEFAULT 'completed', `operation` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(255) NOT NULL, `provider` VARCHAR(64) NOT NULL DEFAULT 'internal_wallet',
    `providerRefundId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL, UNIQUE INDEX `refund_providerRefundId_key`(`providerRefundId`),
    UNIQUE INDEX `refund_userId_operation_idempotencyKey_key`(`userId`, `operation`, `idempotencyKey`),
    INDEX `refund_paymentId_createdAt_idx`(`paymentId`, `createdAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `webhook_event` (
    `id` VARCHAR(191) NOT NULL, `provider` VARCHAR(64) NOT NULL, `providerEventId` VARCHAR(191) NOT NULL,
    `requestHash` CHAR(64) NOT NULL, `eventType` VARCHAR(191) NOT NULL, `status` VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
    `orderId` VARCHAR(191) NULL, `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `webhook_event_provider_providerEventId_key`(`provider`, `providerEventId`),
    INDEX `webhook_event_status_createdAt_idx`(`status`, `createdAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `idempotency_record` ADD CONSTRAINT `idempotency_record_scopeId_fkey` FOREIGN KEY (`scopeId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `payment` ADD CONSTRAINT `payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `refund` ADD CONSTRAINT `refund_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `refund_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;