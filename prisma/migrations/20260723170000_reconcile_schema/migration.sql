-- DropForeignKey
ALTER TABLE `address` DROP FOREIGN KEY `Address_userId_fkey`;

-- DropForeignKey
ALTER TABLE `bankinfo` DROP FOREIGN KEY `BankInfo_userId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_userId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_sellerId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_productId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_userId_fkey`;

-- DropForeignKey
ALTER TABLE `voucher` DROP FOREIGN KEY `Voucher_sellerId_fkey`;

-- AlterTable
ALTER TABLE `category` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `shipperId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `balance` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `licensePlate` VARCHAR(191) NULL,
    ADD COLUMN `transportType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `voucher` MODIFY `description` TEXT NULL;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `session_tokenHash_key`(`tokenHash`),
    INDEX `session_userId_idx`(`userId`),
    INDEX `session_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_token` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_token_tokenHash_key`(`tokenHash`),
    INDEX `password_reset_token_userId_idx`(`userId`),
    INDEX `password_reset_token_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productimage` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `productimage_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `order_shipperId_idx` ON `order`(`shipperId`);

-- CreateIndex
CREATE INDEX `order_status_idx` ON `order`(`status`);

-- CreateIndex
CREATE INDEX `order_paymentStatus_idx` ON `order`(`paymentStatus`);

-- CreateIndex
CREATE INDEX `orderitem_orderId_idx` ON `orderitem`(`orderId`);

-- CreateIndex
CREATE INDEX `product_code_idx` ON `product`(`code`);

-- CreateIndex
CREATE INDEX `review_userId_idx` ON `review`(`userId`);

-- CreateIndex
CREATE INDEX `user_email_idx` ON `user`(`email`);

-- CreateIndex
CREATE INDEX `user_code_idx` ON `user`(`code`);

-- CreateIndex
CREATE INDEX `voucher_code_idx` ON `voucher`(`code`);

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_token` ADD CONSTRAINT `password_reset_token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher` ADD CONSTRAINT `voucher_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `address` ADD CONSTRAINT `address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bankinfo` ADD CONSTRAINT `bankinfo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_shipperId_fkey` FOREIGN KEY (`shipperId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productimage` ADD CONSTRAINT `productimage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `address` RENAME INDEX `Address_userId_fkey` TO `address_userId_idx`;

-- RenameIndex
ALTER TABLE `bankinfo` RENAME INDEX `BankInfo_userId_fkey` TO `bankinfo_userId_idx`;

-- RenameIndex
ALTER TABLE `category` RENAME INDEX `Category_name_key` TO `category_name_key`;

-- RenameIndex
ALTER TABLE `category` RENAME INDEX `Category_slug_key` TO `category_slug_key`;

-- RenameIndex
ALTER TABLE `order` RENAME INDEX `Order_userId_fkey` TO `order_userId_idx`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_orderId_productId_key` TO `orderitem_orderId_productId_key`;

-- RenameIndex
ALTER TABLE `orderitem` RENAME INDEX `OrderItem_productId_fkey` TO `orderitem_productId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_categoryId_fkey` TO `product_categoryId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_code_key` TO `product_code_key`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_sellerId_fkey` TO `product_sellerId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_slug_key` TO `product_slug_key`;

-- RenameIndex
ALTER TABLE `review` RENAME INDEX `Review_productId_fkey` TO `review_productId_idx`;

-- RenameIndex
ALTER TABLE `review` RENAME INDEX `Review_userId_productId_key` TO `review_userId_productId_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_code_key` TO `user_code_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_email_key` TO `user_email_key`;

-- RenameIndex
ALTER TABLE `voucher` RENAME INDEX `Voucher_code_key` TO `voucher_code_key`;

-- RenameIndex
ALTER TABLE `voucher` RENAME INDEX `Voucher_sellerId_fkey` TO `voucher_sellerId_idx`;
