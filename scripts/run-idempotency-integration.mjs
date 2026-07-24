import { spawnSync } from 'node:child_process';

const defaultUrl = 'mysql://idem_test:idem_test_password@127.0.0.1:3308/website_ban_hang_idempotency_test';
const databaseUrl = process.env.TEST_DATABASE_URL || defaultUrl;
const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error(`Refusing to run destructive integration tests against non-test database: ${databaseName}`);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  NODE_ENV: 'test',
  RUN_IDEMPOTENCY_INTEGRATION: '1',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'integration-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'integration-refresh-secret-at-least-32-characters',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'integration-webhook-secret-at-least-32-characters',
};
const managedExternally = process.env.INTEGRATION_DB_MANAGED === '1';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

try {
  if (!managedExternally) run('docker', ['compose', '-f', 'docker-compose.integration.yml', 'up', '-d', '--wait']);
  run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  if (!managedExternally) {
    run(process.execPath, ['scripts/test-outbox-migration-upgrade.mjs']);
    run(process.execPath, ['scripts/test-money-migration-upgrade.mjs']);
  }
  run(process.execPath, ['node_modules/prisma/build/index.js', 'generate']);
  run(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', 'tests/idempotency.integration.test.ts', 'tests/inventory.integration.test.ts', 'tests/outbox.integration.test.ts', 'tests/money-correctness.integration.test.ts']);
} finally {
  if (!managedExternally && process.env.KEEP_INTEGRATION_DB !== '1') {
    spawnSync('docker', ['compose', '-f', 'docker-compose.integration.yml', 'down', '--volumes'], {
      cwd: process.cwd(), env, stdio: 'inherit', shell: false,
    });
  }
}