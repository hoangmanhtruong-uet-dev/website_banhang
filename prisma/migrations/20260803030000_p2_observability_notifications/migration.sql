-- P2 closes schema drift caught by the full commerce E2E bootstrap.
ALTER TABLE `inventory_movement`
  ADD COLUMN `orderId` VARCHAR(191) NULL,
  ADD INDEX `inventory_movement_order_idx`(`orderId`),
  ADD CONSTRAINT `inventory_movement_order_fk`
    FOREIGN KEY (`orderId`) REFERENCES `order`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
