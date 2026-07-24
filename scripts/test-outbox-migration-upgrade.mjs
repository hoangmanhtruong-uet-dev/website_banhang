import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const container = process.env.INTEGRATION_MYSQL_CONTAINER || 'mtruong-idempotency-test-mysql';
const database = 'website_ban_hang_outbox_upgrade_test';
const password = 'integration_root_password';

function mysql(sql, selectedDatabase) {
  const args = ['exec', '-i', container, 'mysql', '-uroot', `-p${password}`, '--default-character-set=utf8mb4', '--batch', '--skip-column-names'];
  if (selectedDatabase) args.push(`--database=${selectedDatabase}`);
  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8', shell: false, maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`MySQL migration preflight failed: ${result.stderr}`);
  return result.stdout;
}

const migrationRoot = join(process.cwd(), 'prisma', 'migrations');
const upgradeName = '20260724140000_add_outbox_dispatcher';
const migrations = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name < upgradeName)
  .map((entry) => entry.name)
  .sort();

try {
  mysql(`DROP DATABASE IF EXISTS \`${database}\`; CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  for (const name of migrations) {
    mysql(readFileSync(join(migrationRoot, name, 'migration.sql'), 'utf8'), database);
  }
  mysql(`
    INSERT INTO outbox_event (
      id, aggregateType, aggregateId, eventType, idempotencyKey, payload,
      status, attempts, availableAt, processedAt, createdAt, updatedAt, orderId
    ) VALUES (
      'legacy-event', 'Order', 'legacy-order', 'INVENTORY_CONSUMED', 'legacy-idempotency-key',
      '{"orderId":"legacy-order"}', 'PENDING', 3, '2026-07-24 01:02:03.000', NULL,
      '2026-07-24 01:00:00.000', '2026-07-24 01:00:00.000', NULL
    );`, database);
  mysql(readFileSync(join(migrationRoot, upgradeName, 'migration.sql'), 'utf8'), database);
  const output = mysql(`
    SELECT id, status, attemptCount, maxAttempts, DATE_FORMAT(nextAttemptAt, '%Y-%m-%d %H:%i:%s'), payload
    FROM outbox_event WHERE id = 'legacy-event';`, database).trim();
  const columns = output.split('\t');
  assert.deepEqual(columns, [
    'legacy-event', 'PENDING', '3', '10', '2026-07-24 01:02:03', '{"orderId":"legacy-order"}',
  ]);
  console.log('Legacy outbox migration preflight: 1/1 passed (payload/status/attempt/schedule preserved)');
} finally {
  mysql(`DROP DATABASE IF EXISTS \`${database}\`;`);
}
