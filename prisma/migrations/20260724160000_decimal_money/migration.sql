-- Monetary normalization: legacy DOUBLE -> DECIMAL(19,4), explicit VND currency,
-- order snapshots, and wallet balance snapshots. Legacy values are rounded HALF_UP
-- once at the persistence boundary. The guard below fails before any ALTER.

CREATE TEMPORARY TABLE `_money_preflight_guard` (
  `anomaly_count` BIGINT NOT NULL,
  CONSTRAINT `money_preflight_zero` CHECK (`anomaly_count` = 0)
);

INSERT INTO `_money_preflight_guard` (`anomaly_count`)
SELECT COALESCE(SUM(`anomalies`), 0) FROM (
  SELECT COUNT(*) `anomalies` FROM `user` WHERE `balance` < 0 OR `balance` <> `balance` OR ABS(`balance`) > 999999999999999.9999
  UNION ALL SELECT COUNT(*) FROM `voucher` WHERE `discountValue` < 0 OR `minOrderValue` < 0 OR (`maxDiscount` IS NOT NULL AND `maxDiscount` < 0)
  UNION ALL SELECT COUNT(*) FROM `product` WHERE `price` < 0 OR (`originalPrice` IS NOT NULL AND `originalPrice` < 0) OR `price` <> `price` OR ABS(`price`) > 999999999999999.9999
  UNION ALL SELECT COUNT(*) FROM `order` WHERE `total` < 0 OR `shippingFee` < 0 OR `total` <> `total` OR ABS(`total`) > 999999999999999.9999
  UNION ALL SELECT COUNT(*) FROM `orderitem` WHERE `price` < 0 OR `price` <> `price` OR ABS(`price`) > 999999999999999.9999
  UNION ALL SELECT COUNT(*) FROM `payment` WHERE `amount` < 0 OR `refundedAmount` < 0 OR `refundedAmount` > `amount` OR `amount` <> `amount`
  UNION ALL SELECT COUNT(*) FROM `refund` WHERE `amount` <= 0 OR `amount` <> `amount`
  UNION ALL SELECT COUNT(*) FROM `wallet_ledger` WHERE `amount` <> `amount` OR ABS(`amount`) > 999999999999999.9999
  UNION ALL SELECT COUNT(*) FROM `payment` p WHERE COALESCE((SELECT SUM(r.`amount`) FROM `refund` r WHERE r.`paymentId` = p.`id` AND r.`status` IN ('completed','SUCCEEDED')), 0) > p.`amount` + 0.000001
  UNION ALL SELECT COUNT(*) FROM `product` WHERE ABS(`price` * 10000 - ROUND(`price` * 10000)) > 0.000001
  UNION ALL SELECT COUNT(*) FROM `order` WHERE ABS(`total` * 10000 - ROUND(`total` * 10000)) > 0.000001
  UNION ALL SELECT COUNT(*) FROM `payment` WHERE ABS(`amount` * 10000 - ROUND(`amount` * 10000)) > 0.000001
  UNION ALL SELECT COUNT(*) FROM `refund` WHERE ABS(`amount` * 10000 - ROUND(`amount` * 10000)) > 0.000001
) `money_anomalies`;
DROP TEMPORARY TABLE `_money_preflight_guard`;

ALTER TABLE `user`
  MODIFY `balance` DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `balance`;

ALTER TABLE `voucher`
  MODIFY `discountValue` DECIMAL(19,4) NOT NULL,
  MODIFY `minOrderValue` DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  MODIFY `maxDiscount` DECIMAL(19,4) NULL,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `maxDiscount`;

ALTER TABLE `product`
  MODIFY `price` DECIMAL(19,4) NOT NULL,
  MODIFY `originalPrice` DECIMAL(19,4) NULL,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `originalPrice`;

ALTER TABLE `orderitem`
  MODIFY `price` DECIMAL(19,4) NOT NULL,
  ADD COLUMN `lineTotal` DECIMAL(19,4) NOT NULL DEFAULT 0.0000 AFTER `price`,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `lineTotal`;
UPDATE `orderitem` SET `lineTotal` = ROUND(`price` * `quantity`, 4);

ALTER TABLE `order`
  MODIFY `shippingFee` DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  MODIFY `total` DECIMAL(19,4) NOT NULL,
  ADD COLUMN `subtotal` DECIMAL(19,4) NOT NULL DEFAULT 0.0000 AFTER `paymentStatus`,
  ADD COLUMN `discountAmount` DECIMAL(19,4) NOT NULL DEFAULT 0.0000 AFTER `subtotal`,
  ADD COLUMN `taxAmount` DECIMAL(19,4) NOT NULL DEFAULT 0.0000 AFTER `shippingFee`,
  ADD COLUMN `currency` CHAR(3) NOT NULL DEFAULT 'VND' AFTER `total`;
UPDATE `order` o
SET o.`subtotal` = COALESCE((SELECT SUM(oi.`lineTotal`) FROM `orderitem` oi WHERE oi.`orderId` = o.`id`), o.`total` - o.`shippingFee`);
UPDATE `order`
SET `discountAmount` = GREATEST(0.0000, ROUND(`subtotal` + `shippingFee` - `total`, 4));

ALTER TABLE `payment`
  MODIFY `amount` DECIMAL(19,4) NOT NULL,
  MODIFY `refundedAmount` DECIMAL(19,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE `refund` MODIFY `amount` DECIMAL(19,4) NOT NULL;

ALTER TABLE `wallet_ledger` DROP CHECK `wallet_ledger_amount_positive_chk`;

ALTER TABLE `wallet_ledger`
  MODIFY `refundId` VARCHAR(191) NULL,
  MODIFY `amount` DECIMAL(19,4) NOT NULL,
  ADD COLUMN `referenceType` VARCHAR(64) NOT NULL DEFAULT 'Refund' AFTER `deterministicKey`,
  ADD COLUMN `referenceId` VARCHAR(191) NOT NULL DEFAULT '' AFTER `referenceType`,
  ADD COLUMN `balanceBefore` DECIMAL(19,4) NULL AFTER `amount`,
  ADD COLUMN `balanceAfter` DECIMAL(19,4) NULL AFTER `balanceBefore`;
UPDATE `wallet_ledger` SET `referenceId` = COALESCE(`refundId`, `id`) WHERE `referenceId` = '';
UPDATE `wallet_ledger` wl
JOIN `user` u ON u.`id` = wl.`userId`
JOIN (
  SELECT materialized.`ledgerId`, materialized.`futureAmount`
  FROM (
    SELECT current_row.`id` AS `ledgerId`, COALESCE(SUM(future.`amount`), 0) AS `futureAmount`
    FROM `wallet_ledger` current_row
    LEFT JOIN `wallet_ledger` future
      ON future.`userId` = current_row.`userId`
      AND (future.`createdAt` > current_row.`createdAt`
        OR (future.`createdAt` = current_row.`createdAt` AND future.`id` > current_row.`id`))
    GROUP BY current_row.`id`
  ) materialized
) ledger_tail ON ledger_tail.`ledgerId` = wl.`id`
SET wl.`balanceAfter` = ROUND(u.`balance` - ledger_tail.`futureAmount`, 4);
UPDATE `wallet_ledger` SET `balanceBefore` = ROUND(`balanceAfter` - `amount`, 4);
ALTER TABLE `wallet_ledger`
  MODIFY `referenceType` VARCHAR(64) NOT NULL,
  MODIFY `referenceId` VARCHAR(191) NOT NULL,
  MODIFY `balanceBefore` DECIMAL(19,4) NOT NULL,
  MODIFY `balanceAfter` DECIMAL(19,4) NOT NULL;
ALTER TABLE wallet_ledger DROP FOREIGN KEY wallet_ledger_refund_fk;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_refund_fk FOREIGN KEY (refundId) REFERENCES refund(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `user` ADD CONSTRAINT `ck_user_balance_nonnegative` CHECK (`balance` >= 0), ADD CONSTRAINT `ck_user_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `voucher` ADD CONSTRAINT `ck_voucher_money_nonnegative` CHECK (`discountValue` >= 0 AND `minOrderValue` >= 0 AND (`maxDiscount` IS NULL OR `maxDiscount` >= 0)), ADD CONSTRAINT `ck_voucher_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `product` ADD CONSTRAINT `ck_product_price_nonnegative` CHECK (`price` >= 0 AND (`originalPrice` IS NULL OR `originalPrice` >= 0)), ADD CONSTRAINT `ck_product_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `order` ADD CONSTRAINT `ck_order_money_nonnegative` CHECK (`subtotal` >= 0 AND `discountAmount` >= 0 AND `discountAmount` <= `subtotal` AND `shippingFee` >= 0 AND `taxAmount` >= 0 AND `total` >= 0), ADD CONSTRAINT `ck_order_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `orderitem` ADD CONSTRAINT `ck_orderitem_money_nonnegative` CHECK (`price` >= 0 AND `lineTotal` >= 0), ADD CONSTRAINT `ck_orderitem_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `payment` ADD CONSTRAINT `ck_payment_amounts` CHECK (`amount` >= 0 AND `refundedAmount` >= 0 AND `refundedAmount` <= `amount`), ADD CONSTRAINT `ck_payment_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `refund` ADD CONSTRAINT `ck_refund_amount_positive` CHECK (`amount` > 0), ADD CONSTRAINT `ck_refund_currency_vnd` CHECK (`currency` = 'VND');
ALTER TABLE `wallet_ledger` ADD CONSTRAINT `ck_wallet_balance_nonnegative` CHECK (`balanceBefore` >= 0 AND `balanceAfter` >= 0), ADD CONSTRAINT `ck_wallet_currency_vnd` CHECK (`currency` = 'VND'), ADD CONSTRAINT `ck_wallet_ledger_equation` CHECK (`balanceAfter` = `balanceBefore` + `amount`);
