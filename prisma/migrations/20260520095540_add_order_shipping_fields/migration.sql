-- AlterTable
ALTER TABLE `order` ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `estimatedDelivery` DATETIME(3) NULL,
    ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    ADD COLUMN `shippingFee` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `shippingProvider` VARCHAR(191) NULL,
    ADD COLUMN `trackingNumber` VARCHAR(191) NULL;
