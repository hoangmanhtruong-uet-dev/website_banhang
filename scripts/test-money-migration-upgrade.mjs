import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const container = process.env.INTEGRATION_MYSQL_CONTAINER || 'mtruong-idempotency-test-mysql';
const database = 'website_ban_hang_money_upgrade_test';
const invalidDatabase = 'website_ban_hang_money_invalid_test';
const password = 'integration_root_password';
const migrationRoot = join(process.cwd(), 'prisma', 'migrations');
const moneyMigration = '20260724160000_decimal_money';
const migrationNames = readdirSync(migrationRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

function mysqlResult(sql, selectedDatabase) {
  const args = ['exec', '-i', container, 'mysql', '-uroot', `-p${password}`, '--default-character-set=utf8mb4', '--batch', '--skip-column-names'];
  if (selectedDatabase) args.push(`--database=${selectedDatabase}`);
  return spawnSync('docker', args, { input: sql, encoding: 'utf8', shell: false, maxBuffer: 20 * 1024 * 1024 });
}
function mysql(sql, selectedDatabase) {
  const result = mysqlResult(sql, selectedDatabase);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}
function applyBeforeMoney(db) {
  for (const name of migrationNames.filter((name) => name < moneyMigration)) mysql(readFileSync(join(migrationRoot, name, 'migration.sql'), 'utf8'), db);
}
function insertLegacy(db, invalid = false) {
  mysql(`
    INSERT INTO user (id,code,name,email,password,balance,createdAt,updatedAt) VALUES ('money-user','MU001','Money User','money@test.local','x',100.3,NOW(),NOW());
    INSERT INTO product (id,code,slug,name,price,originalPrice,rating,reviews,inStock,stockQuantity,reservedQuantity,createdAt,updatedAt)
      VALUES ('money-product','MP001','money-product','Money Product',${invalid ? '-0.1' : '0.1'},0.3,0,0,1,10,0,NOW(),NOW());
    ${invalid ? '' : `INSERT INTO \`order\` (id,customerName,customerEmail,customerPhone,shippingAddress,paymentMethod,paymentStatus,shippingFee,total,status,userId,createdAt,updatedAt)
      VALUES ('money-order','Money User','money@test.local','0900000000','Legacy address','COD','paid',0.1,0.3,'delivered','money-user',NOW(),NOW());
    INSERT INTO orderitem (id,orderId,productId,quantity,price) VALUES ('money-item','money-order','money-product',2,0.1);
    INSERT INTO payment (id,orderId,userId,amount,status,operation,idempotencyKey,provider,providerOutcome,providerIdempotencyKey,providerTransactionId,currency,refundedAmount,createdAt,updatedAt)
      VALUES ('money-payment','money-order','money-user',0.3,'REFUNDED','legacy-payment','legacy-payment-key','internal_wallet','SUCCEEDED','legacy-provider-key','legacy-provider-txn','VND',0.1,NOW(),NOW());
    INSERT INTO refund (id,paymentId,userId,amount,status,operation,idempotencyKey,provider,providerOutcome,providerRefundId,currency,createdAt,updatedAt)
      VALUES ('money-refund','money-payment','money-user',0.1,'completed','legacy-refund','legacy-refund-key','internal_wallet','SUCCEEDED','legacy-refund-provider','VND',NOW(),NOW());
    INSERT INTO wallet_ledger (id,userId,refundId,deterministicKey,amount,currency,entryType,createdAt)
      VALUES ('money-ledger','money-user','money-refund','legacy-ledger-key',0.1,'VND','REFUND_CREDIT',NOW());`}
  `, db);
}

try {
  mysql(`DROP DATABASE IF EXISTS \`${database}\`; DROP DATABASE IF EXISTS \`${invalidDatabase}\`; CREATE DATABASE \`${database}\`; CREATE DATABASE \`${invalidDatabase}\`;`);
  applyBeforeMoney(database);
  insertLegacy(database);
  mysql(readFileSync(join(migrationRoot, moneyMigration, 'migration.sql'), 'utf8'), database);
  const sample = mysql(`SELECT CAST(u.balance AS CHAR),u.currency,CAST(p.price AS CHAR),p.currency,CAST(o.subtotal AS CHAR),CAST(o.total AS CHAR),o.currency,CAST(oi.lineTotal AS CHAR),CAST(pay.refundedAmount AS CHAR),CAST(w.balanceBefore AS CHAR),CAST(w.balanceAfter AS CHAR) FROM user u JOIN product p ON p.id='money-product' JOIN \`order\` o ON o.id='money-order' JOIN orderitem oi ON oi.id='money-item' JOIN payment pay ON pay.id='money-payment' JOIN wallet_ledger w ON w.id='money-ledger' WHERE u.id='money-user';`, database).trim().split('\t');
  assert.deepEqual(sample, ['100.3000','VND','0.1000','VND','0.2000','0.3000','VND','0.2000','0.1000','100.2000','100.3000']);
  const floatCount = Number(mysql(`SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND DATA_TYPE IN ('float','double','real') AND COLUMN_NAME REGEXP 'price|amount|total|discount|balance|fee|tax';`, database).trim());
  assert.equal(floatCount, 0);
  const checkCount = Number(mysql("SELECT COUNT(*) FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME LIKE 'ck\\_%';", database).trim());
  assert.ok(checkCount >= 15);

  applyBeforeMoney(invalidDatabase);
  insertLegacy(invalidDatabase, true);
  const failed = mysqlResult(readFileSync(join(migrationRoot, moneyMigration, 'migration.sql'), 'utf8'), invalidDatabase);
  assert.notEqual(failed.status, 0, 'negative legacy price must fail preflight');
  const stillDouble = mysql("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='product' AND COLUMN_NAME='price';", invalidDatabase).trim();
  assert.equal(stillDouble, 'double');
  console.log(`Money migration upgrade: sample preserved, ${checkCount} checks installed, invalid data rejected before ALTER`);
} finally {
  mysql(`DROP DATABASE IF EXISTS \`${database}\`; DROP DATABASE IF EXISTS \`${invalidDatabase}\`;`);
}
