-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: website_banhang
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('0fd46ae6-e7c4-4dc2-9fec-e2c730922bad','3a15ecf7ab72bbd0783f088c89493e9e2e04263d74bf9c24768c6af94b5d59be','2026-05-22 17:59:26.525','20260523120000_add_site_config',NULL,NULL,'2026-05-22 17:59:26.462',1),('2505fedc-5a6e-4195-805a-18a2c9b3d9d9','922ed655758f2813b0876c7e6f6476074b8fb69becfc36faf81e0f147813fe68','2026-05-18 14:04:01.495','20260518140400_init',NULL,NULL,'2026-05-18 14:04:00.382',1),('3b82f130-ef20-4e39-a9c4-fe91bbfca56a','a4b822a1380f89bb00a9c9e738a6fb2b7fc023da1d9ea0d6383810ea772f5df6','2026-08-01 17:06:13.987','20260723160000_add_durable_idempotency',NULL,NULL,'2026-08-01 17:06:13.165',1),('5c0ba9fa-9ae9-417e-81ba-2da33ef50b59','d61731dfbc3561a294ed4529f7531cb6967af7870c19fe06526f364a8affad85',NULL,'20260723170000_reconcile_schema','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260723170000_reconcile_schema\n\nDatabase error code: 1060\n\nDatabase error:\nDuplicate column name \'shipperId\'\n\nPlease check the query number 12 from the migration file.\n\n','2026-08-01 19:39:57.895','2026-08-01 17:06:13.991',0),('72e4bffb-64b6-481a-8e69-e914ef0729b4','9e71c8aa9542b3a4197858b52ff6cd36d84a5684952a08bd6821199fd2840e2a','2026-05-22 17:45:51.535','20260523100000_add_product_stock_quantity',NULL,NULL,'2026-05-22 17:45:51.365',1),('7ee6d99e-7bed-4d53-94a3-a10fbc2ccfef','8a5ddd85de121c703f99ddf5352cb307638e0f162bbc9fb0d1f657c9940759ce','2026-05-18 14:07:56.480','20260518140756_add_product_code',NULL,NULL,'2026-05-18 14:07:56.368',1),('85f5a58c-1df6-44e2-8a35-fddafbc4bace','c6179a338edbc11074f00402f99581378c45b064f098ea1462ce264539df7f54','2026-05-20 08:31:44.171','20260520083144_add_category_approved',NULL,NULL,'2026-05-20 08:31:44.096',1),('8c04ee54-f6d5-4628-ae04-1ecff1c06078','d61731dfbc3561a294ed4529f7531cb6967af7870c19fe06526f364a8affad85','2026-08-01 19:39:57.902','20260723170000_reconcile_schema','',NULL,'2026-08-01 19:39:57.902',0),('90e27e36-1139-435a-9677-5b9df6c11a95','76719a623d6909f867a74b49d96f27c02d3cdd9ad98f158b02d124bf8301cbd6',NULL,'20260723172000_add_cleanup_covering_index','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260723172000_add_cleanup_covering_index\n\nDatabase error code: 1061\n\nDatabase error:\nDuplicate key name \'idempotency_record_status_expiresAt_idx\'\n\nPlease check the query number 1 from the migration file.\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name=\"20260723172000_add_cleanup_covering_index\"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name=\"20260723172000_add_cleanup_covering_index\"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226',NULL,'2026-08-01 19:39:59.960',0),('b876ccc9-8b9e-4f28-b3f8-f7a530f494de','27a363c49183edad03e8508eb26ee977bbb5e7053df7628f6e89fe896c33e6a7','2026-05-20 09:55:41.012','20260520095540_add_order_shipping_fields',NULL,NULL,'2026-05-20 09:55:40.940',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `address`
--

DROP TABLE IF EXISTS `address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `address` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fullName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ward` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detailAddress` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `address_userId_idx` (`userId`),
  CONSTRAINT `address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `address`
--

LOCK TABLES `address` WRITE;
/*!40000 ALTER TABLE `address` DISABLE KEYS */;
INSERT INTO `address` VALUES ('cmph7d4py00035iz6271l5ton','cmpe7o9ay0000up747u4ynrb1','HOANG MANH TRUONG','0968544769','NINH BINH ','YEN MO','YEN THANH','XOM DANH',1,'2026-05-22 17:37:43.463','2026-05-22 17:37:43.463'),('cmph7d4rj00055iz66ian1n7j','cmpe7o9ay0000up747u4ynrb1','HOANG MANH TRUONG','0968544769','NINH BINH ','YEN MO','YEN THANH','XOM DANH',0,'2026-05-22 17:37:43.519','2026-05-22 17:37:43.519');
/*!40000 ALTER TABLE `address` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bankinfo`
--

DROP TABLE IF EXISTS `bankinfo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bankinfo` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bankName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bankinfo_userId_idx` (`userId`),
  CONSTRAINT `bankinfo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bankinfo`
--

LOCK TABLES `bankinfo` WRITE;
/*!40000 ALTER TABLE `bankinfo` DISABLE KEYS */;
INSERT INTO `bankinfo` VALUES ('cmph7c85300015iz6nrnl0u1j','cmpe7o9ay0000up747u4ynrb1','MB BANK','01012076666','HOANG MANH TRUONG',0,'2026-05-22 17:37:01.232','2026-05-22 17:37:01.232'),('cmphrilv90001mw6hkq3zkt0z','cmph8movb0008e96x0ozrw7k3','VIETCOMBANK','01012007','HOANG MANH TRUONG',0,'2026-05-23 03:01:51.283','2026-05-23 03:01:51.283');
/*!40000 ALTER TABLE `bankinfo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `approved` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_name_key` (`name`),
  UNIQUE KEY `category_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES ('cmpe7o9od0003up74tgf457am','Thời trang','thoi-trang',NULL,'2026-05-20 15:23:04.573','2026-08-01 17:27:43.237',1),('cmpe7o9oi0004up74j9tnwwg0','Công nghệ','cong-nghe',NULL,'2026-05-20 15:23:04.579','2026-08-01 17:27:43.243',1),('cmpe7o9on0005up74nn64c0mz','Làm đẹp','lam-dep',NULL,'2026-05-20 15:23:04.583','2026-08-01 17:27:43.248',1),('cmpe7o9or0006up74n2pr6v20','Gia dụng','gia-dung',NULL,'2026-05-20 15:23:04.588','2026-08-01 17:27:43.252',1);
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domain_audit_log`
--

DROP TABLE IF EXISTS `domain_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `domain_audit_log` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entityType` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entityId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_entity_created_idx` (`entityType`,`entityId`,`createdAt`),
  KEY `audit_action_created_idx` (`action`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domain_audit_log`
--

LOCK TABLES `domain_audit_log` WRITE;
/*!40000 ALTER TABLE `domain_audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `domain_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `idempotency_record`
--

DROP TABLE IF EXISTS `idempotency_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `idempotency_record` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scopeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestHash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROCESSING',
  `responseStatus` int DEFAULT NULL,
  `responseBody` longtext COLLATE utf8mb4_unicode_ci,
  `resourceType` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resourceId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `errorCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lockedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` datetime(3) DEFAULT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_record_scopeId_operation_key_key` (`scopeId`,`operation`,`key`),
  KEY `idempotency_record_expiresAt_idx` (`expiresAt`),
  KEY `idempotency_record_status_lockedAt_idx` (`status`,`lockedAt`),
  KEY `idempotency_record_status_expiresAt_idx` (`status`,`expiresAt`),
  CONSTRAINT `idempotency_record_scopeId_fkey` FOREIGN KEY (`scopeId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `idempotency_record`
--

LOCK TABLES `idempotency_record` WRITE;
/*!40000 ALTER TABLE `idempotency_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `idempotency_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_reservation`
--

DROP TABLE IF EXISTS `inventory_reservation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_reservation` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderItemId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `status` enum('ACTIVE','CONSUMED','RELEASED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `expiresAt` datetime(3) NOT NULL,
  `consumedAt` datetime(3) DEFAULT NULL,
  `releasedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inv_res_orderItem_key` (`orderItemId`),
  KEY `inv_res_status_expires_idx` (`status`,`expiresAt`),
  KEY `inv_res_order_status_idx` (`orderId`,`status`),
  KEY `inv_res_product_status_idx` (`productId`,`status`),
  CONSTRAINT `inv_res_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inv_res_orderitem_fk` FOREIGN KEY (`orderItemId`) REFERENCES `orderitem` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inv_res_product_fk` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_reservation`
--

LOCK TABLES `inventory_reservation` WRITE;
/*!40000 ALTER TABLE `inventory_reservation` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_reservation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_delivery`
--

DROP TABLE IF EXISTS `notification_delivery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_delivery` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consumerName` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotencyKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'log',
  `recipient` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `providerMessageId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `providerIdempotencyKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastError` text COLLATE utf8mb4_unicode_ci,
  `sentAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_idem_key` (`idempotencyKey`),
  UNIQUE KEY `notification_provider_idem_key` (`providerIdempotencyKey`),
  UNIQUE KEY `notification_consumer_event_key` (`consumerName`,`eventId`),
  KEY `notification_status_created_idx` (`status`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_delivery`
--

LOCK TABLES `notification_delivery` WRITE;
/*!40000 ALTER TABLE `notification_delivery` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_delivery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order`
--

DROP TABLE IF EXISTS `order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerEmail` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerPhone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shippingAddress` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentMethod` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total` decimal(19,4) NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `estimatedDelivery` datetime(3) DEFAULT NULL,
  `paymentStatus` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `shippingFee` decimal(19,4) NOT NULL DEFAULT '0.0000',
  `shippingProvider` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trackingNumber` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipperId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotencyScope` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotencyKey` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `confirmedAt` datetime(3) DEFAULT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `discountAmount` decimal(19,4) NOT NULL DEFAULT '0.0000',
  `packingStartedAt` datetime(3) DEFAULT NULL,
  `paidAt` datetime(3) DEFAULT NULL,
  `refundPendingAt` datetime(3) DEFAULT NULL,
  `refundedAt` datetime(3) DEFAULT NULL,
  `returnRequestedAt` datetime(3) DEFAULT NULL,
  `returnedAt` datetime(3) DEFAULT NULL,
  `shippedAt` datetime(3) DEFAULT NULL,
  `statusVersion` int NOT NULL DEFAULT '0',
  `subtotal` decimal(19,4) NOT NULL DEFAULT '0.0000',
  `taxAmount` decimal(19,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_idempotencyScope_idempotencyKey_key` (`idempotencyScope`,`idempotencyKey`),
  KEY `order_userId_idx` (`userId`),
  KEY `order_shipperId_idx` (`shipperId`),
  KEY `order_status_idx` (`status`),
  KEY `order_paymentStatus_idx` (`paymentStatus`),
  CONSTRAINT `order_shipperId_fkey` FOREIGN KEY (`shipperId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order`
--

LOCK TABLES `order` WRITE;
/*!40000 ALTER TABLE `order` DISABLE KEYS */;
INSERT INTO `order` VALUES ('cmph89rc40001e96xlz3zsuq6','HOANG MANH TRUONG','truongcri0101@gmail.com','0968544769','XOM DANH, YEN THANH, YEN MO, NINH BINH ','Banking',25540314000.0000,'pending','cmpe7o9ay0000up747u4ynrb1','2026-05-22 18:03:05.760','2026-05-22 18:03:05.760',NULL,NULL,'pending',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'VND',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.0000,0.0000),('cmph8g5ol0005e96xa7brfqia','HOANG MANH TRUONG','truongcri0101@gmail.com','0968544769','XOM DANH, YEN THANH, YEN MO, NINH BINH ','Banking',43516941000.0000,'pending','cmpe7o9ay0000up747u4ynrb1','2026-05-22 18:08:04.293','2026-05-22 18:08:04.293',NULL,NULL,'pending',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'VND',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.0000,0.0000),('cmphrja100003mw6haugt8l4z','Hoàng Mạnh Trường','mtruongdayy@gmail.com','0968544769','135 THIÊN HIỀN ','Banking',2500000.0000,'pending','cmph8movb0008e96x0ozrw7k3','2026-05-23 03:02:22.596','2026-05-23 03:02:22.596',NULL,NULL,'pending',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'VND',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.0000,0.0000),('cmphteeyf0001ykawud9dblgq','HOANG MANH TRUONG','truongcri0101@gmail.com','0968544769','XOM DANH, YEN THANH, YEN MO, NINH BINH ','COD',25540314000.0000,'pending','cmpe7o9ay0000up747u4ynrb1','2026-05-23 03:54:34.935','2026-05-23 03:54:34.935',NULL,NULL,'pending',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'VND',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.0000,0.0000),('cmpi0nzvk000110bqsuzmumcj','HOANG MANH TRUONG','truongcri0101@gmail.com','0968544769','XOM DANH, YEN THANH, YEN MO, NINH BINH ','COD',20840109000.0000,'pending','cmpe7o9ay0000up747u4ynrb1','2026-05-23 07:17:59.264','2026-05-23 07:17:59.264',NULL,NULL,'pending',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'VND',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.0000,0.0000),('cmpi0trlz000510bqpd7ustik','HOANG MANH TRUONG','truongcri0101@gmail.com','0968544769','XOM DANH, YEN THANH, YEN MO, NINH BINH ','COD',51080628000.0000,'pending','cmpe7o9ay0000up747u4ynrb1','2026-05-23 07:22:28.487','2026-05-23 07:22:28.487',NULL,NULL,'pending',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'VND',0.0000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.0000,0.0000);
/*!40000 ALTER TABLE `order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_return`
--

DROP TABLE IF EXISTS `order_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_return` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REQUESTED',
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestedBy` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotencyKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decidedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_return_idem_key` (`idempotencyKey`),
  KEY `order_return_order_status_idx` (`orderId`,`status`),
  CONSTRAINT `order_return_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_return`
--

LOCK TABLES `order_return` WRITE;
/*!40000 ALTER TABLE `order_return` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_return` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_status_transition`
--

DROP TABLE IF EXISTS `order_status_transition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_transition` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromStatus` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `toStatus` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actorType` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` text COLLATE utf8mb4_unicode_ci,
  `idempotencyKey` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requestHash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_transition_idem_key` (`idempotencyKey`),
  KEY `order_transition_order_created_idx` (`orderId`,`createdAt`),
  KEY `order_transition_actor_idx` (`actorType`,`actorId`),
  CONSTRAINT `order_transition_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status_transition`
--

LOCK TABLES `order_status_transition` WRITE;
/*!40000 ALTER TABLE `order_status_transition` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_status_transition` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderitem`
--

DROP TABLE IF EXISTS `orderitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderitem` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(19,4) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `lineTotal` decimal(19,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  UNIQUE KEY `orderitem_orderId_productId_key` (`orderId`,`productId`),
  KEY `orderitem_productId_idx` (`productId`),
  KEY `orderitem_orderId_idx` (`orderId`),
  CONSTRAINT `orderitem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orderitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderitem`
--

LOCK TABLES `orderitem` WRITE;
/*!40000 ALTER TABLE `orderitem` DISABLE KEYS */;
INSERT INTO `orderitem` VALUES ('cmph89rc40003e96xkdf7ru7c','cmph89rc40001e96xlz3zsuq6','cmpe7oahw00byup74x3le4jms',1,25540314000.0000,'VND',0.0000),('cmph8g5ol0007e96xgju9tc4p','cmph8g5ol0005e96xa7brfqia','cmpe7oagx00biup747psic0rr',3,14505647000.0000,'VND',0.0000),('cmphrja100005mw6hpmv7d8tu','cmphrja100003mw6haugt8l4z','cmph8o14p000ae96xd8mrx482',5,500000.0000,'VND',0.0000),('cmphteeyf0003ykawgto3lden','cmphteeyf0001ykawud9dblgq','cmpe7oahw00byup74x3le4jms',1,25540314000.0000,'VND',0.0000),('cmpi0nzvk000310bq5jzhnjrw','cmpi0nzvk000110bqsuzmumcj','cmpe7oaho00buup740m6yiggf',1,20840109000.0000,'VND',0.0000),('cmpi0trlz000710bq7ml7ljee','cmpi0trlz000510bqpd7ustik','cmpe7oahw00byup74x3le4jms',2,25540314000.0000,'VND',0.0000);
/*!40000 ALTER TABLE `orderitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `outbox_event`
--

DROP TABLE IF EXISTS `outbox_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outbox_event` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aggregateType` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aggregateId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventType` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotencyKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `attemptCount` int NOT NULL DEFAULT '0',
  `maxAttempts` int NOT NULL DEFAULT '10',
  `nextAttemptAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lockedAt` datetime(3) DEFAULT NULL,
  `lockedUntil` datetime(3) DEFAULT NULL,
  `lockedBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processedAt` datetime(3) DEFAULT NULL,
  `deadLetteredAt` datetime(3) DEFAULT NULL,
  `lastError` text COLLATE utf8mb4_unicode_ci,
  `lastErrorCode` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `outbox_event_idem_key` (`idempotencyKey`),
  KEY `outbox_status_next_idx` (`status`,`nextAttemptAt`,`id`),
  KEY `outbox_status_lease_idx` (`status`,`lockedUntil`),
  KEY `outbox_type_status_idx` (`eventType`,`status`),
  KEY `outbox_event_aggregate_idx` (`aggregateType`,`aggregateId`),
  KEY `outbox_event_order_fk` (`orderId`),
  CONSTRAINT `outbox_event_order_fk` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `outbox_event`
--

LOCK TABLES `outbox_event` WRITE;
/*!40000 ALTER TABLE `outbox_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `outbox_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_token`
--

DROP TABLE IF EXISTS `password_reset_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_token` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `usedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_token_tokenHash_key` (`tokenHash`),
  KEY `password_reset_token_userId_idx` (`userId`),
  KEY `password_reset_token_tokenHash_idx` (`tokenHash`),
  CONSTRAINT `password_reset_token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_token`
--

LOCK TABLES `password_reset_token` WRITE;
/*!40000 ALTER TABLE `password_reset_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(19,4) NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `operation` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotencyKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal_wallet',
  `providerIdempotencyKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `providerTransactionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `providerOutcome` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUCCEEDED',
  `refundedAmount` decimal(19,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_orderId_key` (`orderId`),
  UNIQUE KEY `payment_providerIdempotencyKey_key` (`providerIdempotencyKey`),
  UNIQUE KEY `payment_providerTransactionId_key` (`providerTransactionId`),
  UNIQUE KEY `payment_userId_operation_idempotencyKey_key` (`userId`,`operation`,`idempotencyKey`),
  KEY `payment_userId_createdAt_idx` (`userId`,`createdAt`),
  CONSTRAINT `payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `processed_outbox_event`
--

DROP TABLE IF EXISTS `processed_outbox_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processed_outbox_event` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consumerName` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resultHash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `processed_consumer_event_key` (`consumerName`,`eventId`),
  KEY `processed_event_idx` (`eventId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `processed_outbox_event`
--

LOCK TABLES `processed_outbox_event` WRITE;
/*!40000 ALTER TABLE `processed_outbox_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `processed_outbox_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(19,4) NOT NULL,
  `originalPrice` decimal(19,4) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emoji` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gradient` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badge` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating` double NOT NULL DEFAULT '0',
  `reviews` int NOT NULL DEFAULT '0',
  `inStock` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stockQuantity` int NOT NULL DEFAULT '100',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `reservedQuantity` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_slug_key` (`slug`),
  UNIQUE KEY `product_code_key` (`code`),
  KEY `product_categoryId_idx` (`categoryId`),
  KEY `product_sellerId_idx` (`sellerId`),
  KEY `product_code_idx` (`code`),
  CONSTRAINT `product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `product_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES ('cmpe7o9oy0008up746ac2h9gm','ao-khoac-denim-premium-wash-blue','Áo Khoác Denim Premium Wash Blue',1350000.0000,1750000.0000,'Áo khoác denim cao cấp, form regular fit, đường may chắc chắn và dễ phối đồ.','/images/products/denim-jacket.webp','👕','linear-gradient(135deg,#172033,#9a5a2b)','cmpe7o9od0003up74tgf457am','Hot',4.8,96,1,'2026-05-20 15:23:04.594','2026-08-01 17:27:43.257','cmpe7o9ay0000up747u4ynrb1','PR001',31,'VND',0),('cmpe7o9p4000aup741457m5rf','giay-sneaker-urban-charcoal','Giày Sneaker Urban Charcoal',1650000.0000,NULL,'Sneaker unisex đế nhẹ, upper thoáng khí, lớp đệm êm cho nhu cầu hằng ngày.','/images/products/urban-sneakers.webp','👕','linear-gradient(135deg,#172033,#9a5a2b)','cmpe7o9od0003up74tgf457am','Hot',4.7,143,1,'2026-05-20 15:23:04.600','2026-08-01 17:27:43.263','cmpe7o9ay0000up747u4ynrb1','PR002',38,'VND',0),('cmpe7o9p9000cup74uacreik4','balo-du-lich-urban-35l','Balo Du Lịch Urban 35L',790000.0000,990000.0000,'Balo chống nước, ngăn laptop riêng, khóa kéo bền và quai đeo trợ lực.','/images/products/travel-backpack.webp','👕','linear-gradient(135deg,#172033,#9a5a2b)','cmpe7o9od0003up74tgf457am','Sale',4.8,126,1,'2026-05-20 15:23:04.605','2026-08-01 17:27:43.269','cmpe7o9ay0000up747u4ynrb1','PR003',46,'VND',0),('cmpe7o9pe000eup74tkj4mh6o','tai-nghe-bluetooth-air-pro-anc','Tai Nghe Bluetooth Air Pro ANC',2490000.0000,2990000.0000,'Tai nghe không dây, đệm memory foam, âm thanh cân bằng và pin dài.','/images/products/wireless-headphones.webp','💻','linear-gradient(135deg,#0f172a,#1d4ed8)','cmpe7o9oi0004up74j9tnwwg0','Hot',5,286,1,'2026-05-20 15:23:04.611','2026-08-01 17:27:43.274','cmpe7o9ay0000up747u4ynrb1','PR004',48,'VND',0),('cmpe7o9pk000gup745moeywrk','laptop-gaming-g15-rtx-4060','Laptop Gaming G15 RTX 4060',25990000.0000,28990000.0000,'Laptop hiệu năng cao, màn hình tần số quét cao, SSD NVMe và tản nhiệt kép.','/images/products/gaming-laptop.webp','💻','linear-gradient(135deg,#0f172a,#1d4ed8)','cmpe7o9oi0004up74j9tnwwg0','Bán chạy',5,138,1,'2026-05-20 15:23:04.616','2026-08-01 17:27:43.280','cmpe7o9ay0000up747u4ynrb1','PR005',14,'VND',0),('cmpe7o9pr000iup74uu8l7q02','dong-ho-thong-minh-active-45mm','Đồng Hồ Thông Minh Active 45mm',2990000.0000,3490000.0000,'Đồng hồ AMOLED, theo dõi vận động, nhịp tim, SpO2 và chống nước.','/images/products/smart-watch.webp','💻','linear-gradient(135deg,#0f172a,#1d4ed8)','cmpe7o9oi0004up74j9tnwwg0','Hot',4.9,192,1,'2026-05-20 15:23:04.624','2026-08-01 17:27:43.285','cmpe7o9ay0000up747u4ynrb1','PR006',49,'VND',0),('cmpe7o9pw000kup74egt3yasg','serum-vitamin-c-20-chuyen-sau','Serum Vitamin C 20% Chuyên Sâu',490000.0000,650000.0000,'Serum vitamin C và hyaluronic acid, hỗ trợ làm sáng và duy trì độ ẩm.','/images/products/vitamin-c-serum.webp','✨','linear-gradient(135deg,#3f0d16,#d97706)','cmpe7o9on0005up74nn64c0mz','Bán chạy',5,264,1,'2026-05-20 15:23:04.628','2026-08-01 17:27:43.290','cmpe7o9ay0000up747u4ynrb1','PR007',68,'VND',0),('cmpe7o9q0000mup74gse37fri','nuoc-hoa-unisex-amber-75ml','Nước Hoa Unisex Amber 75ml',1590000.0000,1890000.0000,'Nước hoa unisex hiện đại, mở đầu tươi mát và kết thúc bằng hương gỗ ấm.','/images/products/unisex-perfume.webp','✨','linear-gradient(135deg,#3f0d16,#d97706)','cmpe7o9on0005up74nn64c0mz','Hot',4.9,148,1,'2026-05-20 15:23:04.632','2026-08-01 17:27:43.296','cmpe7o9ay0000up747u4ynrb1','PR008',36,'VND',0),('cmpe7o9q4000oup74b0t23mk6','kem-duong-am-daily-50g','Kem Dưỡng Ẩm Daily 50g',450000.0000,550000.0000,'Kem dưỡng ẩm mịn nhẹ, hỗ trợ phục hồi hàng rào bảo vệ và làm mềm da.','/images/products/moisturizer-cream.webp','✨','linear-gradient(135deg,#3f0d16,#d97706)','cmpe7o9on0005up74nn64c0mz','Bán chạy',4.9,221,1,'2026-05-20 15:23:04.636','2026-08-01 17:27:43.302','cmpe7o9ay0000up747u4ynrb1','PR009',76,'VND',0),('cmpe7o9q8000qup74rcm65ie6','den-ban-led-smart-pro','Đèn Bàn LED Smart Pro',890000.0000,1090000.0000,'Đèn bàn LED chống chói, điều chỉnh độ sáng và nhiệt màu.','/images/products/smart-desk-lamp.webp','🏠','linear-gradient(135deg,#292524,#b7793f)','cmpe7o9or0006up74n2pr6v20','Bán chạy',4.9,176,1,'2026-05-20 15:23:04.641','2026-08-01 17:27:43.309','cmpe7o9ay0000up747u4ynrb1','PR010',53,'VND',0),('cmpe7o9qc000sup743og48wbj','may-pha-ca-phe-espresso-pro','Máy Pha Cà Phê Espresso Pro',5890000.0000,6890000.0000,'Máy pha espresso vỏ inox, áp suất ổn định và vòi đánh sữa.','/images/products/espresso-machine.webp','🏠','linear-gradient(135deg,#292524,#b7793f)','cmpe7o9or0006up74n2pr6v20','Hot',5,119,1,'2026-05-20 15:23:04.645','2026-08-01 17:27:43.317','cmpe7o9ay0000up747u4ynrb1','PR011',17,'VND',0),('cmpe7o9qg000uup74yabdbnt7','ban-lam-viec-go-soi-120cm','Bàn Làm Việc Gỗ Sồi 120cm',4590000.0000,5190000.0000,'Bàn gỗ sồi Scandinavian, chân thép sơn tĩnh điện và ngăn kéo tiện dụng.','/images/products/oak-work-desk.webp','🏠','linear-gradient(135deg,#292524,#b7793f)','cmpe7o9or0006up74n2pr6v20','Bán chạy',4.9,103,1,'2026-05-20 15:23:04.649','2026-08-01 17:27:43.323','cmpe7o9ay0000up747u4ynrb1','PR012',16,'VND',0),('cmpe7oagx00biup747psic0rr','dep-quai-ngang-comfy-192','Dép Quai Ngang Comfy 192',14505647000.0000,14510712850.3100,'Thiết kế độc quyền, không bị lặp ở nơi khác.',NULL,'📷','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','cmpe7o9or0006up74n2pr6v20','Mới',5,495,1,'2026-05-20 15:23:05.601','2026-08-01 17:24:35.959','cmpe7o9ay0000up747u4ynrb1','PR204',100,'VND',0),('cmpe7oaho00buup740m6yiggf','day-chuyen-bac-sterling-198','Dây Chuyền Bạc Sterling 198',20840109000.0000,NULL,'Thiết kế độc quyền, không bị lặp ở nơi khác.',NULL,'⚡','linear-gradient(135deg, #30cfd0 0%, #330867 100%)','cmpe7o9oi0004up74j9tnwwg0','Premium',4,122,1,'2026-05-20 15:23:05.628','2026-08-01 17:24:35.959','cmpe7o9ay0000up747u4ynrb1','PR210',100,'VND',0),('cmpe7oahw00byup74x3le4jms','nhan-bac-khac-200','Nhẫn Bạc Khắc 200',25540314000.0000,25545314029.3800,'Thiết kế độc quyền, không bị lặp ở nơi khác.',NULL,'📷','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)','cmpe7o9or0006up74n2pr6v20','Mới',5,349,1,'2026-05-20 15:23:05.636','2026-08-01 17:24:35.959','cmpe7o9ay0000up747u4ynrb1','PR212',100,'VND',0),('cmph8o14p000ae96xd8mrx482','bcs-cao-c-p--1779473651637','BCS Cao Cấp ',500000.0000,NULL,'Hot',NULL,'📦',NULL,'cmpe7o9on0005up74nn64c0mz','',5,0,1,'2026-05-22 18:14:11.641','2026-05-22 18:14:11.641','cmph8movb0008e96x0ozrw7k3','PR01',100,'VND',0);
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productimage`
--

DROP TABLE IF EXISTS `productimage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productimage` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `productimage_productId_idx` (`productId`),
  CONSTRAINT `productimage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productimage`
--

LOCK TABLES `productimage` WRITE;
/*!40000 ALTER TABLE `productimage` DISABLE KEYS */;
/*!40000 ALTER TABLE `productimage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund`
--

DROP TABLE IF EXISTS `refund`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(19,4) NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `operation` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotencyKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal_wallet',
  `providerRefundId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `approvalKey` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `approvedBy` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `failureReason` text COLLATE utf8mb4_unicode_ci,
  `providerOutcome` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUCCEEDED',
  `sourceEventId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refund_userId_operation_idempotencyKey_key` (`userId`,`operation`,`idempotencyKey`),
  UNIQUE KEY `refund_providerRefundId_key` (`providerRefundId`),
  UNIQUE KEY `refund_source_event_key` (`sourceEventId`),
  UNIQUE KEY `refund_approval_key` (`approvalKey`),
  KEY `refund_paymentId_createdAt_idx` (`paymentId`,`createdAt`),
  CONSTRAINT `refund_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `refund_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund`
--

LOCK TABLES `refund` WRITE;
/*!40000 ALTER TABLE `refund` DISABLE KEYS */;
/*!40000 ALTER TABLE `refund` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review`
--

DROP TABLE IF EXISTS `review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int NOT NULL,
  `comment` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_userId_productId_key` (`userId`,`productId`),
  KEY `review_productId_idx` (`productId`),
  KEY `review_userId_idx` (`userId`),
  CONSTRAINT `review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review`
--

LOCK TABLES `review` WRITE;
/*!40000 ALTER TABLE `review` DISABLE KEYS */;
/*!40000 ALTER TABLE `review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `session`
--

DROP TABLE IF EXISTS `session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `revokedAt` datetime(3) DEFAULT NULL,
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_tokenHash_key` (`tokenHash`),
  KEY `session_userId_idx` (`userId`),
  KEY `session_tokenHash_idx` (`tokenHash`),
  CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `session`
--

LOCK TABLES `session` WRITE;
/*!40000 ALTER TABLE `session` DISABLE KEYS */;
INSERT INTO `session` VALUES ('cmsanxa670001fe4dbsqk59lv','cmpe7o9hn0001up74k8jsgra2','0eef6e8085029a6eed3dbf160ba6ad2c07b8c23df426300c430acc6bcd24360b','2026-08-31 17:46:01.277','2026-08-01 17:46:05.549','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 17:46:01.279','2026-08-01 17:46:05.550'),('cmsapam4x0001mxzxz4u93w5f','cmpe7o9hn0001up74k8jsgra2','5b46dab7021d0795c3c108c0aae9a76b67a0d64de8d5a6641bcfd702d0e3811e','2026-08-31 18:24:22.925',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:24:22.927','2026-08-01 18:24:22.927'),('cmsapbbd90003mxzx6wp9cdqc','cmpe7o9hn0001up74k8jsgra2','a656291c10a229cb3e21d7c74046c06982e6e912eeb48969191e5c3de027bdb6','2026-08-31 18:24:55.621',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:24:55.629','2026-08-01 18:24:55.629'),('cmsapbqr10005mxzxgra932ku','cmpe7o9hn0001up74k8jsgra2','6e0ce8c069623d6188a2de75676831c6f457a0c4845b4806c659e6263e5ab672','2026-08-31 18:25:15.557',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:25:15.565','2026-08-01 18:25:15.565'),('cmsapc2yu0007mxzxjauikl86','cmpe7o9hn0001up74k8jsgra2','bccd064a84d6156c4c1777c9e69ca43f582e67b076704a2155af35dcc34c44a0','2026-08-31 18:25:31.391',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:25:31.398','2026-08-01 18:25:31.398'),('cmsapdfdf0009mxzx1ex8xp44','cmpe7o9hn0001up74k8jsgra2','d4e7a82751c070f3c0c84f6fba34bfb240d8ae91320de4042df7ce055dffc00a','2026-08-31 18:26:34.129',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:26:34.132','2026-08-01 18:26:34.132'),('cmsapxexo000110sfnaanzllw','cmpe7o9hn0001up74k8jsgra2','445f720df19fff21b9ba214434fe456b4a25b5443571217a2f77d6bc05814929','2026-08-31 18:42:06.683',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:42:06.685','2026-08-01 18:42:06.685'),('cmsapy11f0001ngj8nz9l7xs0','cmpe7o9hn0001up74k8jsgra2','a3f22c25a2b2a33c967c59d9e17045f33b50871ceb3cf824e1852d6e49f890b8','2026-08-31 18:42:35.329',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8972','2026-08-01 18:42:35.331','2026-08-01 18:42:35.331');
/*!40000 ALTER TABLE `session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `siteconfig`
--

DROP TABLE IF EXISTS `siteconfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `siteconfig` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default',
  `siteName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MTRUONG-STORE',
  `hotline` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1900 8888',
  `contactEmail` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'support@mtruong.store',
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'Việt Nam',
  `codEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `momoEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `bankingEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `vnpayEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `stripeEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `lowStockThreshold` int NOT NULL DEFAULT '10',
  `maintenanceMode` tinyint(1) NOT NULL DEFAULT '0',
  `lastBackupAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siteconfig`
--

LOCK TABLES `siteconfig` WRITE;
/*!40000 ALTER TABLE `siteconfig` DISABLE KEYS */;
INSERT INTO `siteconfig` VALUES ('default','MTRUONG-STORE','1900 8888','support@mtruong.store','Việt Nam',1,1,1,0,0,10,0,NULL,'2026-05-23 00:59:26.512');
/*!40000 ALTER TABLE `siteconfig` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `isSeller` tinyint(1) NOT NULL DEFAULT '0',
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthday` datetime(3) DEFAULT NULL,
  `avatar` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `licensePlate` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transportType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `balance` decimal(19,4) NOT NULL DEFAULT '0.0000',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `paymentPinHash` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_code_key` (`code`),
  UNIQUE KEY `user_email_key` (`email`),
  KEY `user_email_idx` (`email`),
  KEY `user_code_idx` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('cmpe7o9ay0000up747u4ynrb1','AD001','Admin','truongcri0101@gmail.com','$2b$12$AVnb9e76RfdFCEp9H0fZTOsOQBSa0u4W3KJOP.NmmPsWdS1Yrrpjm','admin',1,'0868544769','male','2007-01-01 00:00:00.000',NULL,'2026-05-20 15:23:04.090','2026-08-01 17:27:43.205',NULL,NULL,1,0.0000,'VND',NULL),('cmpe7o9hn0001up74k8jsgra2','US001','Test User','user@mtruong.store','$2b$12$x4djZ2tCcieJb0eczKMev.5yONr7ePBY/KSPVxHS9TJHzlFI1pSC2','user',0,'0123456789','female','1990-05-15 00:00:00.000',NULL,'2026-05-20 15:23:04.332','2026-05-20 15:23:04.332',NULL,NULL,1,0.0000,'VND',NULL),('cmpe7o9o50002up74tvvyfwyo','SH001','Nguyễn Văn Giao','shipper@mtruong.store','$2b$12$Ji3VPXRooGxBEAXR38w9be0NordDDywaTh6Ynci/2j5sIAyv76h/S','shipper',0,'0987654321','male','1995-10-20 00:00:00.000',NULL,'2026-05-20 15:23:04.565','2026-05-23 03:19:30.561','29A-123.45','Xe máy (Yamaha Exciter)',1,0.0000,'VND',NULL),('cmph8movb0008e96x0ozrw7k3','IDU01','Hoàng Mạnh Trường','mtruongdayy@gmail.com','$2b$12$vq.t2C.3mKuEHOsFvvtROOdVM7xgoZVDmHrnvvefq61b7O2Q/L1ty','user',1,NULL,NULL,NULL,NULL,'2026-05-22 18:13:09.096','2026-05-22 18:13:31.403',NULL,NULL,1,0.0000,'VND',NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voucher`
--

DROP TABLE IF EXISTS `voucher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voucher` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `discountType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discountValue` decimal(19,4) NOT NULL,
  `minOrderValue` decimal(19,4) NOT NULL DEFAULT '0.0000',
  `maxDiscount` decimal(19,4) DEFAULT NULL,
  `startDate` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `endDate` datetime(3) NOT NULL,
  `usageLimit` int NOT NULL DEFAULT '100',
  `usedCount` int NOT NULL DEFAULT '0',
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  PRIMARY KEY (`id`),
  UNIQUE KEY `voucher_code_key` (`code`),
  KEY `voucher_sellerId_idx` (`sellerId`),
  KEY `voucher_code_idx` (`code`),
  CONSTRAINT `voucher_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voucher`
--

LOCK TABLES `voucher` WRITE;
/*!40000 ALTER TABLE `voucher` DISABLE KEYS */;
INSERT INTO `voucher` VALUES ('cmph7ntwc00009nsb1ggaa7nn','SALE1000','Giảm giá đơn hàng #1','fixed',10000.0000,150000.0000,NULL,'2026-05-22 17:46:02.636','2026-06-21 17:46:02.636',50,0,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00019nsbzk7vkcdv','VIP1001','Ưu đãi thành viên #2','percentage',10.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-07-06 17:46:02.636',60,1,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00029nsbuhunx34g','TET1002','Khuyến mãi cuối tuần #3','percentage',15.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-07-21 17:46:02.636',70,2,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00039nsbj47nvsba','HE1003','Voucher sinh nhật #4','fixed',50000.0000,1000000.0000,NULL,'2026-05-19 17:46:02.636','2026-08-05 17:46:02.636',80,3,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00049nsbftob5xyz','BLACK1004','Flash sale 24h #5','percentage',25.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-08-20 17:46:02.636',90,4,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00059nsbhy61q0qb','FLASH1005','Giảm phí vận chuyển logic #6','percentage',30.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-09-04 17:46:02.636',100,5,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00069nsbpeoabrjz','NEW1006','Combo mua sắm #7','fixed',150000.0000,500000.0000,NULL,'2026-05-16 17:46:02.636','2026-09-19 17:46:02.636',110,6,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00079nsbdtndjvx0','GOLD1007','Ưu đãi người mới #8','percentage',50.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-10-04 17:46:02.636',120,7,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00089nsbn3xy8wlj','MEGA1008','Tri ân khách hàng #9','percentage',5.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-10-19 17:46:02.636',130,8,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00099nsbristcw68','SUPER1009','Chương trình loyalty #10','fixed',10000.0000,300000.0000,NULL,'2026-05-13 17:46:02.636','2026-11-03 17:46:02.636',140,9,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000a9nsb8tqvjmji','SALE1010','Giảm giá đơn hàng #11','percentage',15.0000,0.0000,50000.0000,'2026-05-22 17:46:02.636','2026-11-18 17:46:02.636',150,10,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000b9nsb72ua051f','VIP1011','Ưu đãi thành viên #12','percentage',20.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-12-03 17:46:02.636',160,11,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000c9nsb1qjb1abs','TET1012','Khuyến mãi cuối tuần #13','fixed',50000.0000,150000.0000,NULL,'2026-05-20 17:46:02.636','2026-06-21 17:46:02.636',170,12,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000d9nsba4u7xc8j','HE1013','Voucher sinh nhật #14','percentage',30.0000,300000.0000,500000.0000,'2026-05-19 17:46:02.636','2026-07-06 17:46:02.636',180,13,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000e9nsbb8lfwuta','BLACK1014','Flash sale 24h #15','percentage',40.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-07-21 17:46:02.636',190,14,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000f9nsbvqbs8pi5','FLASH1015','Giảm phí vận chuyển logic #16','fixed',150000.0000,1000000.0000,NULL,'2026-05-17 17:46:02.636','2026-08-05 17:46:02.636',200,15,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000g9nsbsfbxj89r','NEW1016','Combo mua sắm #17','percentage',5.0000,100000.0000,100000.0000,'2026-05-16 17:46:02.636','2026-08-20 17:46:02.636',210,16,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000h9nsbb98m1aa8','GOLD1017','Ưu đãi người mới #18','percentage',10.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-09-04 17:46:02.636',220,0,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000i9nsb1infb9e1','MEGA1018','Tri ân khách hàng #19','fixed',10000.0000,500000.0000,NULL,'2026-05-14 17:46:02.636','2026-09-19 17:46:02.636',230,1,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000j9nsbm30zfkil','SUPER1019','Chương trình loyalty #20','percentage',20.0000,500000.0000,NULL,'2026-05-13 17:46:02.636','2026-10-04 17:46:02.636',240,2,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000k9nsbiy4npu9f','SALE1020','Giảm giá đơn hàng #21','percentage',25.0000,0.0000,50000.0000,'2026-05-22 17:46:02.636','2026-10-19 17:46:02.636',50,3,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000l9nsb3t8wskgf','VIP1021','Ưu đãi thành viên #22','fixed',50000.0000,300000.0000,NULL,'2026-05-21 17:46:02.636','2026-11-03 17:46:02.636',60,4,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000m9nsby3m9q3hq','TET1022','Khuyến mãi cuối tuần #23','percentage',40.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-11-18 17:46:02.636',70,5,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000n9nsbhfhzcz8g','HE1023','Voucher sinh nhật #24','percentage',50.0000,300000.0000,500000.0000,'2026-05-19 17:46:02.636','2026-12-03 17:46:02.636',80,6,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000o9nsbaot7d5x1','BLACK1024','Flash sale 24h #25','fixed',150000.0000,150000.0000,NULL,'2026-05-18 17:46:02.636','2026-06-21 17:46:02.636',90,7,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000p9nsb6di6xaua','FLASH1025','Giảm phí vận chuyển logic #26','percentage',10.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-07-06 17:46:02.636',100,8,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000q9nsbpsbo1adr','NEW1026','Combo mua sắm #27','percentage',15.0000,100000.0000,100000.0000,'2026-05-16 17:46:02.636','2026-07-21 17:46:02.636',110,9,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000r9nsb1c8stpvm','GOLD1027','Ưu đãi người mới #28','fixed',10000.0000,1000000.0000,NULL,'2026-05-15 17:46:02.636','2026-08-05 17:46:02.636',120,10,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000s9nsb0booubga','MEGA1028','Tri ân khách hàng #29','percentage',25.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-08-20 17:46:02.636',130,11,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000t9nsbnqpgvazc','SUPER1029','Chương trình loyalty #30','percentage',30.0000,500000.0000,NULL,'2026-05-13 17:46:02.636','2026-09-04 17:46:02.636',140,12,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000u9nsbucp3g0zm','SALE1030','Giảm giá đơn hàng #31','fixed',50000.0000,500000.0000,NULL,'2026-05-22 17:46:02.636','2026-09-19 17:46:02.636',150,13,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000v9nsblmj5kr3g','VIP1031','Ưu đãi thành viên #32','percentage',50.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-10-04 17:46:02.636',160,14,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000w9nsbcuf4e4cl','TET1032','Khuyến mãi cuối tuần #33','percentage',5.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-10-19 17:46:02.636',170,15,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000x9nsby594kfoi','HE1033','Voucher sinh nhật #34','fixed',150000.0000,300000.0000,NULL,'2026-05-19 17:46:02.636','2026-11-03 17:46:02.636',180,16,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000y9nsbjk9ght9u','BLACK1034','Flash sale 24h #35','percentage',15.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-11-18 17:46:02.636',190,0,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd000z9nsbh3y572kb','FLASH1035','Giảm phí vận chuyển logic #36','percentage',20.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-12-03 17:46:02.636',200,1,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00109nsb1b615na9','NEW1036','Combo mua sắm #37','fixed',10000.0000,150000.0000,NULL,'2026-05-16 17:46:02.636','2026-06-21 17:46:02.636',210,2,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00119nsbknjxjzfn','GOLD1037','Ưu đãi người mới #38','percentage',30.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-07-06 17:46:02.636',220,3,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00129nsb26l81t65','MEGA1038','Tri ân khách hàng #39','percentage',40.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-07-21 17:46:02.636',230,4,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00139nsbl66t1tx9','SUPER1039','Chương trình loyalty #40','fixed',50000.0000,1000000.0000,NULL,'2026-05-13 17:46:02.636','2026-08-05 17:46:02.636',240,5,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00149nsbh9qup4n3','SALE1040','Giảm giá đơn hàng #41','percentage',5.0000,0.0000,50000.0000,'2026-05-22 17:46:02.636','2026-08-20 17:46:02.636',50,6,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00159nsb7mq23anq','VIP1041','Ưu đãi thành viên #42','percentage',10.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-09-04 17:46:02.636',60,7,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00169nsb0bf97cn1','TET1042','Khuyến mãi cuối tuần #43','fixed',150000.0000,500000.0000,NULL,'2026-05-20 17:46:02.636','2026-09-19 17:46:02.636',70,8,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00179nsbrnki5lmv','HE1043','Voucher sinh nhật #44','percentage',20.0000,300000.0000,500000.0000,'2026-05-19 17:46:02.636','2026-10-04 17:46:02.636',80,9,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00189nsbb0aflrol','BLACK1044','Flash sale 24h #45','percentage',25.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-10-19 17:46:02.636',90,10,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd00199nsbborwtkz6','FLASH1045','Giảm phí vận chuyển logic #46','fixed',10000.0000,300000.0000,NULL,'2026-05-17 17:46:02.636','2026-11-03 17:46:02.636',100,11,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd001a9nsbrfmyejwi','NEW1046','Combo mua sắm #47','percentage',40.0000,100000.0000,100000.0000,'2026-05-16 17:46:02.636','2026-11-18 17:46:02.636',110,12,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd001b9nsbbt1dwpq0','GOLD1047','Ưu đãi người mới #48','percentage',50.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-12-03 17:46:02.636',120,13,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwd001c9nsb5y804w6d','MEGA1048','Tri ân khách hàng #49','fixed',50000.0000,150000.0000,NULL,'2026-05-14 17:46:02.636','2026-06-21 17:46:02.636',130,14,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001d9nsb2p6qtbwm','SUPER1049','Chương trình loyalty #50','percentage',10.0000,500000.0000,NULL,'2026-05-13 17:46:02.636','2026-07-06 17:46:02.636',140,15,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001e9nsbms1acqf0','SALE1050','Giảm giá đơn hàng #51','percentage',15.0000,0.0000,50000.0000,'2026-05-22 17:46:02.636','2026-07-21 17:46:02.636',150,16,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001f9nsbjcldqgby','VIP1051','Ưu đãi thành viên #52','fixed',150000.0000,1000000.0000,NULL,'2026-05-21 17:46:02.636','2026-08-05 17:46:02.636',160,0,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001g9nsbkrltu4m2','TET1052','Khuyến mãi cuối tuần #53','percentage',25.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-08-20 17:46:02.636',170,1,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001h9nsb2bophbz5','HE1053','Voucher sinh nhật #54','percentage',30.0000,300000.0000,500000.0000,'2026-05-19 17:46:02.636','2026-09-04 17:46:02.636',180,2,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001i9nsbt6kwt59l','BLACK1054','Flash sale 24h #55','fixed',10000.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-09-19 17:46:02.636',190,3,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001j9nsbrlf22xsp','FLASH1055','Giảm phí vận chuyển logic #56','percentage',50.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-10-04 17:46:02.636',200,4,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001k9nsbban6j4g4','NEW1056','Combo mua sắm #57','percentage',5.0000,100000.0000,100000.0000,'2026-05-16 17:46:02.636','2026-10-19 17:46:02.636',210,5,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001l9nsbyek8yffe','GOLD1057','Ưu đãi người mới #58','fixed',50000.0000,300000.0000,NULL,'2026-05-15 17:46:02.636','2026-11-03 17:46:02.636',220,6,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001m9nsb7vmd3zg1','MEGA1058','Tri ân khách hàng #59','percentage',15.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-11-18 17:46:02.636',230,7,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001n9nsbjy5fude1','SUPER1059','Chương trình loyalty #60','percentage',20.0000,500000.0000,NULL,'2026-05-13 17:46:02.636','2026-12-03 17:46:02.636',240,8,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001o9nsbwieko5bx','SALE1060','Giảm giá đơn hàng #61','fixed',150000.0000,150000.0000,NULL,'2026-05-22 17:46:02.636','2026-06-21 17:46:02.636',50,9,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001p9nsbihe1mnzx','VIP1061','Ưu đãi thành viên #62','percentage',30.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-07-06 17:46:02.636',60,10,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001q9nsbxw24a46s','TET1062','Khuyến mãi cuối tuần #63','percentage',40.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-07-21 17:46:02.636',70,11,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001r9nsbk47msz5q','HE1063','Voucher sinh nhật #64','fixed',10000.0000,1000000.0000,NULL,'2026-05-19 17:46:02.636','2026-08-05 17:46:02.636',80,12,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001s9nsbwossjdtk','BLACK1064','Flash sale 24h #65','percentage',5.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-08-20 17:46:02.636',90,13,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001t9nsbboxwy0ey','FLASH1065','Giảm phí vận chuyển logic #66','percentage',10.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-09-04 17:46:02.636',100,14,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001u9nsbn7d5pluq','NEW1066','Combo mua sắm #67','fixed',50000.0000,500000.0000,NULL,'2026-05-16 17:46:02.636','2026-09-19 17:46:02.636',110,15,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001v9nsbepydcdzg','GOLD1067','Ưu đãi người mới #68','percentage',20.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-10-04 17:46:02.636',120,16,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001w9nsbeaxxim8y','MEGA1068','Tri ân khách hàng #69','percentage',25.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-10-19 17:46:02.636',130,0,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001x9nsb6xr2fuae','SUPER1069','Chương trình loyalty #70','fixed',150000.0000,300000.0000,NULL,'2026-05-13 17:46:02.636','2026-11-03 17:46:02.636',140,1,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001y9nsbn71r5qfh','SALE1070','Giảm giá đơn hàng #71','percentage',40.0000,0.0000,50000.0000,'2026-05-22 17:46:02.636','2026-11-18 17:46:02.636',150,2,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe001z9nsbfamub7aq','VIP1071','Ưu đãi thành viên #72','percentage',50.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-12-03 17:46:02.636',160,3,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00209nsb5fhibykd','TET1072','Khuyến mãi cuối tuần #73','fixed',10000.0000,150000.0000,NULL,'2026-05-20 17:46:02.636','2026-06-21 17:46:02.636',170,4,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00219nsbkchzv4i3','HE1073','Voucher sinh nhật #74','percentage',10.0000,300000.0000,500000.0000,'2026-05-19 17:46:02.636','2026-07-06 17:46:02.636',180,5,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00229nsb5t79wa77','BLACK1074','Flash sale 24h #75','percentage',15.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-07-21 17:46:02.636',190,6,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00239nsbg189di2j','FLASH1075','Giảm phí vận chuyển logic #76','fixed',50000.0000,1000000.0000,NULL,'2026-05-17 17:46:02.636','2026-08-05 17:46:02.636',200,7,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00249nsb7o2oxi8o','NEW1076','Combo mua sắm #77','percentage',25.0000,100000.0000,100000.0000,'2026-05-16 17:46:02.636','2026-08-20 17:46:02.636',210,8,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00259nsbm9jvq1n9','GOLD1077','Ưu đãi người mới #78','percentage',30.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-09-04 17:46:02.636',220,9,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00269nsb5syj1t12','MEGA1078','Tri ân khách hàng #79','fixed',150000.0000,500000.0000,NULL,'2026-05-14 17:46:02.636','2026-09-19 17:46:02.636',230,10,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00279nsbsqp60igr','SUPER1079','Chương trình loyalty #80','percentage',50.0000,500000.0000,NULL,'2026-05-13 17:46:02.636','2026-10-04 17:46:02.636',240,11,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00289nsbpf96752u','SALE1080','Giảm giá đơn hàng #81','percentage',5.0000,0.0000,50000.0000,'2026-05-22 17:46:02.636','2026-10-19 17:46:02.636',50,12,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe00299nsbrtjphgll','VIP1081','Ưu đãi thành viên #82','fixed',10000.0000,300000.0000,NULL,'2026-05-21 17:46:02.636','2026-11-03 17:46:02.636',60,13,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002a9nsbbqn0nsxh','TET1082','Khuyến mãi cuối tuần #83','percentage',15.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-11-18 17:46:02.636',70,14,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002b9nsbd040zb0b','HE1083','Voucher sinh nhật #84','percentage',20.0000,300000.0000,500000.0000,'2026-05-19 17:46:02.636','2026-12-03 17:46:02.636',80,15,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002c9nsbghxho8hi','BLACK1084','Flash sale 24h #85','fixed',50000.0000,150000.0000,NULL,'2026-05-18 17:46:02.636','2026-06-21 17:46:02.636',90,16,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002d9nsb9tbtt9ht','FLASH1085','Giảm phí vận chuyển logic #86','percentage',30.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-07-06 17:46:02.636',100,0,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002e9nsbt4xjd7hn','NEW1086','Combo mua sắm #87','percentage',40.0000,100000.0000,100000.0000,'2026-05-16 17:46:02.636','2026-07-21 17:46:02.636',110,1,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002f9nsbalh86gzi','GOLD1087','Ưu đãi người mới #88','fixed',150000.0000,1000000.0000,NULL,'2026-05-15 17:46:02.636','2026-08-05 17:46:02.636',120,2,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002g9nsbkzty1l5e','MEGA1088','Tri ân khách hàng #89','percentage',5.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-08-20 17:46:02.636',130,3,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002h9nsbrpiwu3jo','SUPER1089','Chương trình loyalty #90','percentage',10.0000,500000.0000,NULL,'2026-05-13 17:46:02.636','2026-09-04 17:46:02.636',140,4,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002i9nsbatvrhq8z','SALE1090','Giảm giá đơn hàng #91','fixed',10000.0000,500000.0000,NULL,'2026-05-22 17:46:02.636','2026-09-19 17:46:02.636',150,5,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002j9nsbmnmnz67r','VIP1091','Ưu đãi thành viên #92','percentage',20.0000,100000.0000,100000.0000,'2026-05-21 17:46:02.636','2026-10-04 17:46:02.636',160,6,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002k9nsbgzz4e2m1','TET1092','Khuyến mãi cuối tuần #93','percentage',25.0000,200000.0000,200000.0000,'2026-05-20 17:46:02.636','2026-10-19 17:46:02.636',170,7,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwe002l9nsb2v47qfy0','HE1093','Voucher sinh nhật #94','fixed',50000.0000,300000.0000,NULL,'2026-05-19 17:46:02.636','2026-11-03 17:46:02.636',180,8,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwf002m9nsbehn8cebi','BLACK1094','Flash sale 24h #95','percentage',40.0000,500000.0000,NULL,'2026-05-18 17:46:02.636','2026-11-18 17:46:02.636',190,9,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwf002n9nsb70xem6k7','FLASH1095','Giảm phí vận chuyển logic #96','percentage',50.0000,0.0000,50000.0000,'2026-05-17 17:46:02.636','2026-12-03 17:46:02.636',200,10,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwf002o9nsbsnmkg33h','NEW1096','Combo mua sắm #97','fixed',150000.0000,150000.0000,NULL,'2026-05-16 17:46:02.636','2026-06-21 17:46:02.636',210,11,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwf002p9nsb2s0kkt2i','GOLD1097','Ưu đãi người mới #98','percentage',10.0000,200000.0000,200000.0000,'2026-05-15 17:46:02.636','2026-07-06 17:46:02.636',220,12,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwf002q9nsbpi89g6yf','MEGA1098','Tri ân khách hàng #99','percentage',15.0000,300000.0000,500000.0000,'2026-05-14 17:46:02.636','2026-07-21 17:46:02.636',230,13,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND'),('cmph7ntwf002r9nsbbtg8oqb8','SUPER1099','Chương trình loyalty #100','fixed',10000.0000,1000000.0000,NULL,'2026-05-13 17:46:02.636','2026-08-05 17:46:02.636',240,14,'cmpe7o9ay0000up747u4ynrb1','2026-05-22 17:46:02.651','2026-05-22 17:46:02.651','VND');
/*!40000 ALTER TABLE `voucher` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_ledger`
--

DROP TABLE IF EXISTS `wallet_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_ledger` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refundId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deterministicKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceType` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referenceId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(19,4) NOT NULL,
  `balanceBefore` decimal(19,4) NOT NULL,
  `balanceAfter` decimal(19,4) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `entryType` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallet_ledger_deterministic_key` (`deterministicKey`),
  UNIQUE KEY `wallet_ledger_refund_key` (`refundId`),
  KEY `wallet_ledger_user_created_idx` (`userId`,`createdAt`),
  CONSTRAINT `wallet_ledger_refund_fk` FOREIGN KEY (`refundId`) REFERENCES `refund` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `wallet_ledger_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_ledger`
--

LOCK TABLES `wallet_ledger` WRITE;
/*!40000 ALTER TABLE `wallet_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook_event`
--

DROP TABLE IF EXISTS `webhook_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_event` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `providerEventId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestHash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROCESSING',
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `webhook_event_provider_providerEventId_key` (`provider`,`providerEventId`),
  KEY `webhook_event_status_createdAt_idx` (`status`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_event`
--

LOCK TABLES `webhook_event` WRITE;
/*!40000 ALTER TABLE `webhook_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `worker_heartbeat`
--

DROP TABLE IF EXISTS `worker_heartbeat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `worker_heartbeat` (
  `workerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastPollAt` datetime(3) NOT NULL,
  `lastSuccessAt` datetime(3) DEFAULT NULL,
  `lastErrorAt` datetime(3) DEFAULT NULL,
  `inflight` int NOT NULL DEFAULT '0',
  `expiresAt` datetime(3) NOT NULL,
  `lastError` text COLLATE utf8mb4_unicode_ci,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`workerId`),
  KEY `worker_status_expires_idx` (`status`,`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `worker_heartbeat`
--

LOCK TABLES `worker_heartbeat` WRITE;
/*!40000 ALTER TABLE `worker_heartbeat` DISABLE KEYS */;
/*!40000 ALTER TABLE `worker_heartbeat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'website_banhang'
--

--
-- Dumping routines for database 'website_banhang'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-02  2:44:16
