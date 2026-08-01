CREATE TABLE `seller_fulfillment` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NULL,
  `sellerScope` VARCHAR(191) NOT NULL,
  `shipperId` VARCHAR(191) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `statusVersion` INTEGER NOT NULL DEFAULT 0,
  `subtotal` DECIMAL(19,4) NOT NULL DEFAULT 0,
  `discountAmount` DECIMAL(19,4) NOT NULL DEFAULT 0,
  `shippingFee` DECIMAL(19,4) NOT NULL DEFAULT 0,
  `taxAmount` DECIMAL(19,4) NOT NULL DEFAULT 0,
  `total` DECIMAL(19,4) NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `shippingProvider` VARCHAR(191) NULL,
  `trackingNumber` VARCHAR(191) NULL,
  `estimatedDelivery` DATETIME(3) NULL,
  `confirmedAt` DATETIME(3) NULL,
  `packingStartedAt` DATETIME(3) NULL,
  `shippedAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `seller_fulfillment_order_scope_key` (`orderId`, `sellerScope`),
  INDEX `seller_fulfillment_seller_status_idx` (`sellerId`, `status`),
  INDEX `seller_fulfillment_shipper_status_idx` (`shipperId`, `status`),
  INDEX `seller_fulfillment_status_created_idx` (`status`, `createdAt`),
  CONSTRAINT `seller_fulfillment_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `seller_fulfillment_seller_fk` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `seller_fulfillment_shipper_fk` FOREIGN KEY (`shipperId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `seller_fulfillment_transition` (
  `id` VARCHAR(191) NOT NULL,
  `fulfillmentId` VARCHAR(191) NOT NULL,
  `fromStatus` VARCHAR(32) NOT NULL,
  `toStatus` VARCHAR(32) NOT NULL,
  `actorType` VARCHAR(32) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `reason` VARCHAR(500) NULL,
  `metadata` TEXT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `requestHash` CHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `fulfillment_transition_idem_key` (`idempotencyKey`),
  INDEX `fulfillment_transition_created_idx` (`fulfillmentId`, `createdAt`),
  CONSTRAINT `fulfillment_transition_fulfillment_fk` FOREIGN KEY (`fulfillmentId`) REFERENCES `seller_fulfillment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `orderitem` ADD COLUMN `fulfillmentId` VARCHAR(191) NULL;

INSERT INTO `seller_fulfillment` (
  `id`, `orderId`, `sellerId`, `sellerScope`, `shipperId`, `status`, `statusVersion`,
  `subtotal`, `discountAmount`, `shippingFee`, `taxAmount`, `total`, `currency`,
  `shippingProvider`, `trackingNumber`, `estimatedDelivery`, `confirmedAt`,
  `packingStartedAt`, `shippedAt`, `deliveredAt`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('legacy-', SUBSTRING(SHA2(CONCAT(g.`orderId`, ':', g.`sellerScope`), 256), 1, 50)),
  g.`orderId`, g.`sellerId`, g.`sellerScope`, o.`shipperId`,
  CASE
    WHEN o.`paymentMethod` = 'COD' AND o.`status` = 'pending' THEN 'paid'
    WHEN o.`status` = 'processing' THEN 'packing'
    WHEN o.`status` = 'shipped' THEN 'shipping'
    ELSE o.`status`
  END,
  o.`statusVersion`, g.`subtotal`,
  CASE WHEN o.`subtotal` > 0 THEN ROUND(o.`discountAmount` * g.`subtotal` / o.`subtotal`, 4) ELSE 0 END,
  CASE WHEN o.`subtotal` > 0 THEN ROUND(o.`shippingFee` * g.`subtotal` / o.`subtotal`, 4) ELSE 0 END,
  CASE WHEN o.`subtotal` > 0 THEN ROUND(o.`taxAmount` * g.`subtotal` / o.`subtotal`, 4) ELSE 0 END,
  g.`subtotal`
    - CASE WHEN o.`subtotal` > 0 THEN ROUND(o.`discountAmount` * g.`subtotal` / o.`subtotal`, 4) ELSE 0 END
    + CASE WHEN o.`subtotal` > 0 THEN ROUND(o.`shippingFee` * g.`subtotal` / o.`subtotal`, 4) ELSE 0 END
    + CASE WHEN o.`subtotal` > 0 THEN ROUND(o.`taxAmount` * g.`subtotal` / o.`subtotal`, 4) ELSE 0 END,
  o.`currency`, o.`shippingProvider`, o.`trackingNumber`, o.`estimatedDelivery`,
  o.`confirmedAt`, o.`packingStartedAt`, o.`shippedAt`, o.`deliveredAt`, o.`createdAt`, o.`updatedAt`
FROM (
  SELECT oi.`orderId`, p.`sellerId`, COALESCE(p.`sellerId`, 'platform') AS `sellerScope`, SUM(oi.`lineTotal`) AS `subtotal`
  FROM `orderitem` oi
  JOIN `product` p ON p.`id` = oi.`productId`
  GROUP BY oi.`orderId`, p.`sellerId`, COALESCE(p.`sellerId`, 'platform')
) g
JOIN `order` o ON o.`id` = g.`orderId`;

UPDATE `orderitem` oi
JOIN `product` p ON p.`id` = oi.`productId`
JOIN `seller_fulfillment` sf
  ON sf.`orderId` = oi.`orderId`
 AND sf.`sellerScope` = COALESCE(p.`sellerId`, 'platform')
SET oi.`fulfillmentId` = sf.`id`;

CREATE INDEX `orderitem_fulfillment_idx` ON `orderitem` (`fulfillmentId`);
ALTER TABLE `orderitem`
  ADD CONSTRAINT `orderitem_fulfillment_fk`
  FOREIGN KEY (`fulfillmentId`) REFERENCES `seller_fulfillment` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
