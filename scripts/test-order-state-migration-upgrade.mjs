import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const container = process.env.INTEGRATION_MYSQL_CONTAINER || 'mtruong-idempotency-test-mysql';
const database = 'website_ban_hang_order_state_upgrade_test';
const invalidDatabase = 'website_ban_hang_order_state_invalid_test';
const password = 'integration_root_password';
function mysqlResult(sql, selectedDatabase) {
  const args = ['exec', '-i', container, 'mysql', '-uroot', `-p${password}`, '--default-character-set=utf8mb4', '--batch', '--skip-column-names'];
  if (selectedDatabase) args.push(`--database=${selectedDatabase}`);
  return spawnSync('docker', args, { input: sql, encoding: 'utf8', shell: false, maxBuffer: 20 * 1024 * 1024 });
}
function mysql(sql, selectedDatabase) {
  const result = mysqlResult(sql, selectedDatabase);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`MySQL order-state migration failed: ${result.stderr}`);
  return result.stdout;
}
const root = join(process.cwd(), 'prisma', 'migrations');
const upgrade = '20260724180000_order_state_machine';
const prior = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name < upgrade).map((entry) => entry.name).sort();
const seed = `
  INSERT INTO user (id,code,name,email,password,role,isActive,isSeller,balance,currency,createdAt,updatedAt) VALUES
    ('legacy-user','LEGACY','Legacy','legacy@state.test','x','user',1,0,0,'VND',NOW(3),NOW(3));
  INSERT INTO \`order\` (id,customerName,customerEmail,customerPhone,shippingAddress,paymentMethod,paymentStatus,subtotal,discountAmount,shippingFee,taxAmount,total,currency,status,userId,createdAt,updatedAt) VALUES
    ('legacy-processing','Legacy','legacy@state.test','0','x','cod','paid',0,0,0,0,10,'VND','processing','legacy-user',NOW(3),NOW(3)),
    ('legacy-shipped','Legacy','legacy@state.test','0','x','cod','paid',0,0,0,0,10,'VND','shipped','legacy-user',NOW(3),NOW(3)),
    ('legacy-refund','Legacy','legacy@state.test','0','x','cod','paid',0,0,0,0,10,'VND','refund_required','legacy-user',NOW(3),NOW(3)),
    ('legacy-delivered','Legacy','legacy@state.test','0','x','cod','paid',0,0,0,0,10,'VND','delivered','legacy-user',NOW(3),NOW(3));`;
try {
  for (const db of [database, invalidDatabase]) mysql(`DROP DATABASE IF EXISTS \`${db}\`; CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  for (const db of [database, invalidDatabase]) for (const name of prior) mysql(readFileSync(join(root, name, 'migration.sql'), 'utf8'), db);
  mysql(seed, database);
  mysql(readFileSync(join(root, upgrade, 'migration.sql'), 'utf8'), database);
  const rows = mysql(`SELECT id,status,IF(deliveredAt IS NULL,'NULL','SET') FROM \`order\` ORDER BY id;`, database).trim().split('\n').map((line) => line.split('\t'));
  assert.deepEqual(rows, [
    ['legacy-delivered','delivered','SET'], ['legacy-processing','confirmed','NULL'],
    ['legacy-refund','refund_pending','NULL'], ['legacy-shipped','shipping','NULL'],
  ]);
  mysql(`
    INSERT INTO user (id,code,name,email,password,role,isActive,isSeller,balance,currency,createdAt,updatedAt) VALUES
      ('invalid-user','INVALID','Invalid','invalid@state.test','x','user',1,0,0,'VND',NOW(3),NOW(3));
    INSERT INTO \`order\` (id,customerName,customerEmail,customerPhone,shippingAddress,paymentMethod,paymentStatus,subtotal,discountAmount,shippingFee,taxAmount,total,currency,status,userId,createdAt,updatedAt) VALUES
      ('invalid-order','Invalid','invalid@state.test','0','x','cod','pending',0,0,0,0,10,'VND','unknown_legacy','invalid-user',NOW(3),NOW(3));`, invalidDatabase);
  const rejected = mysqlResult(readFileSync(join(root, upgrade, 'migration.sql'), 'utf8'), invalidDatabase);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /order_state_legacy_preflight/);
  console.log('Order state migration upgrade: 5/5 passed (4 legacy mappings preserved, unknown state rejected)');
} finally {
  mysql(`DROP DATABASE IF EXISTS \`${database}\`; DROP DATABASE IF EXISTS \`${invalidDatabase}\`;`);
}