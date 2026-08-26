-- Distributed fixed-window limiter. Keys are SHA-256 digests, never raw identities.
CREATE TABLE `rate_limit_bucket` (
    `keyHash` CHAR(64) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `windowStart` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rate_limit_expires_idx`(`expiresAt`),
    PRIMARY KEY (`keyHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One row per user and UTC day. All quota counters are changed with guarded
-- atomic updates; application instances never enforce these counters in memory.
CREATE TABLE `upload_quota_bucket` (
    `userId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `requestCount` INTEGER NOT NULL DEFAULT 0,
    `fileCount` INTEGER NOT NULL DEFAULT 0,
    `bytesUsed` BIGINT NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `upload_quota_expires_idx`(`expiresAt`),
    PRIMARY KEY (`userId`, `periodStart`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reservations make quota compensatable after storage or database failures.
-- Expired RESERVED rows are released by scripts/cleanup-security-buckets.ts.
CREATE TABLE `upload_reservation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `quotaPeriodStart` DATETIME(3) NOT NULL,
    `fileCount` INTEGER NOT NULL,
    `bytesReserved` BIGINT NOT NULL,
    `storageKeys` TEXT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `upload_reservation_cleanup_idx`(`status`, `expiresAt`),
    INDEX `upload_reservation_user_created_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Every accepted upload is attributed to the authenticated session owner.
-- purpose/resourceId is subsequently verified when an avatar or product uses it.
CREATE TABLE `upload_asset` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `purpose` VARCHAR(32) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(64) NOT NULL,
    `sizeBytes` BIGINT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `upload_asset_storage_key`(`storageKey`),
    UNIQUE INDEX `upload_asset_url_key`(`url`),
    INDEX `upload_asset_owner_purpose_idx`(`userId`, `purpose`, `status`),
    INDEX `upload_asset_resource_idx`(`resourceId`, `purpose`),
    INDEX `upload_asset_cleanup_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `upload_quota_bucket`
    ADD CONSTRAINT `upload_quota_user_fk`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `upload_reservation`
    ADD CONSTRAINT `upload_reservation_user_fk`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `upload_asset`
    ADD CONSTRAINT `upload_asset_user_fk`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
