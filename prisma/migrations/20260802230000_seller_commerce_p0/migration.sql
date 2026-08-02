ALTER TABLE `product`
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD COLUMN `deletedById` VARCHAR(191) NULL;

CREATE INDEX `product_seller_deleted_created_idx`
  ON `product`(`sellerId`, `deletedAt`, `createdAt`);

CREATE INDEX `product_deleted_created_idx`
  ON `product`(`deletedAt`, `createdAt`);