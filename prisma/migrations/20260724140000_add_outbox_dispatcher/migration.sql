-- Data-preserving upgrade: existing outbox rows retain status, attempts, schedule and payload.
ALTER TABLE `outbox_event`
  DROP INDEX `outbox_event_status_available_idx`,
  CHANGE COLUMN `attempts` `attemptCount` INTEGER NOT NULL DEFAULT 0,
  CHANGE COLUMN `availableAt` `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `maxAttempts` INTEGER NOT NULL DEFAULT 10 AFTER `attemptCount`,
  ADD COLUMN `lockedAt` DATETIME(3) NULL AFTER `nextAttemptAt`,
  ADD COLUMN `lockedUntil` DATETIME(3) NULL AFTER `lockedAt`,
  ADD COLUMN `lockedBy` VARCHAR(191) NULL AFTER `lockedUntil`,
  ADD COLUMN `deadLetteredAt` DATETIME(3) NULL AFTER `processedAt`,
  ADD COLUMN `lastError` TEXT NULL AFTER `deadLetteredAt`,
  ADD COLUMN `lastErrorCode` VARCHAR(64) NULL AFTER `lastError`,
  ADD INDEX `outbox_status_next_idx` (`status`, `nextAttemptAt`, `id`),
  ADD INDEX `outbox_status_lease_idx` (`status`, `lockedUntil`),
  ADD INDEX `outbox_type_status_idx` (`eventType`, `status`),
  ADD CONSTRAINT `outbox_attempt_count_chk` CHECK (`attemptCount` >= 0),
  ADD CONSTRAINT `outbox_max_attempts_chk` CHECK (`maxAttempts` > 0);

ALTER TABLE `payment`
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `providerTransactionId`,
  ADD COLUMN `refundedAmount` DOUBLE NOT NULL DEFAULT 0 AFTER `currency`,
  ADD CONSTRAINT `payment_refunded_nonnegative_chk` CHECK (`refundedAmount` >= 0),
  ADD CONSTRAINT `payment_refunded_lte_amount_chk` CHECK (`refundedAmount` <= `amount`);

ALTER TABLE `refund`
  MODIFY COLUMN `providerRefundId` VARCHAR(191) NULL,
  ADD COLUMN `sourceEventId` VARCHAR(191) NULL AFTER `providerRefundId`,
  ADD COLUMN `approvalKey` VARCHAR(191) NULL AFTER `sourceEventId`,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `approvalKey`,
  ADD COLUMN `approvedBy` VARCHAR(191) NULL AFTER `currency`,
  ADD COLUMN `approvedAt` DATETIME(3) NULL AFTER `approvedBy`,
  ADD COLUMN `completedAt` DATETIME(3) NULL AFTER `approvedAt`,
  ADD COLUMN `failureReason` TEXT NULL AFTER `completedAt`,
  ADD UNIQUE INDEX `refund_source_event_key` (`sourceEventId`),
  ADD UNIQUE INDEX `refund_approval_key` (`approvalKey`),
  ADD CONSTRAINT `refund_amount_positive_chk` CHECK (`amount` > 0);

CREATE TABLE `processed_outbox_event` (
  `id` VARCHAR(191) NOT NULL,
  `consumerName` VARCHAR(96) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `resultHash` CHAR(64) NULL,
  `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `processed_consumer_event_key` (`consumerName`, `eventId`),
  INDEX `processed_event_idx` (`eventId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notification_delivery` (
  `id` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `consumerName` VARCHAR(96) NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(32) NOT NULL DEFAULT 'log',
  `recipient` VARCHAR(191) NOT NULL,
  `template` VARCHAR(96) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `providerMessageId` VARCHAR(191) NULL,
  `providerIdempotencyKey` VARCHAR(191) NOT NULL,
  `lastError` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `notification_idem_key` (`idempotencyKey`),
  UNIQUE INDEX `notification_provider_idem_key` (`providerIdempotencyKey`),
  UNIQUE INDEX `notification_consumer_event_key` (`consumerName`, `eventId`),
  INDEX `notification_status_created_idx` (`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `wallet_ledger` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `refundId` VARCHAR(191) NOT NULL,
  `deterministicKey` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `entryType` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `wallet_ledger_refund_key` (`refundId`),
  UNIQUE INDEX `wallet_ledger_deterministic_key` (`deterministicKey`),
  INDEX `wallet_ledger_user_created_idx` (`userId`, `createdAt`),
  CONSTRAINT `wallet_ledger_amount_positive_chk` CHECK (`amount` > 0),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `domain_audit_log` (
  `id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(96) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `entityType` VARCHAR(64) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `details` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `audit_entity_created_idx` (`entityType`, `entityId`, `createdAt`),
  INDEX `audit_action_created_idx` (`action`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `worker_heartbeat` (
  `workerId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL,
  `version` VARCHAR(64) NOT NULL,
  `lastPollAt` DATETIME(3) NOT NULL,
  `lastSuccessAt` DATETIME(3) NULL,
  `lastErrorAt` DATETIME(3) NULL,
  `inflight` INTEGER NOT NULL DEFAULT 0,
  `expiresAt` DATETIME(3) NOT NULL,
  `lastError` TEXT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `worker_status_expires_idx` (`status`, `expiresAt`),
  PRIMARY KEY (`workerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


ALTER TABLE `wallet_ledger`
  ADD CONSTRAINT `wallet_ledger_user_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `wallet_ledger_refund_fk` FOREIGN KEY (`refundId`) REFERENCES `refund`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
