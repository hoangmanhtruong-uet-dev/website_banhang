-- CreateTable
CREATE TABLE `siteconfig` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `siteName` VARCHAR(191) NOT NULL DEFAULT 'MTRUONG-STORE',
    `hotline` VARCHAR(191) NOT NULL DEFAULT '1900 8888',
    `contactEmail` VARCHAR(191) NOT NULL DEFAULT 'support@mtruong.store',
    `address` VARCHAR(191) NULL DEFAULT 'Việt Nam',
    `codEnabled` BOOLEAN NOT NULL DEFAULT true,
    `momoEnabled` BOOLEAN NOT NULL DEFAULT true,
    `bankingEnabled` BOOLEAN NOT NULL DEFAULT true,
    `vnpayEnabled` BOOLEAN NOT NULL DEFAULT false,
    `stripeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 10,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `lastBackupAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `siteconfig` (`id`, `updatedAt`) VALUES ('default', NOW(3));
