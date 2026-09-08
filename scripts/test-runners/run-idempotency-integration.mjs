import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required; provide a dedicated MySQL test database.');
}
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
const requestedTestFiles = process.argv.slice(2);
const integrationTestFiles = requestedTestFiles.length > 0 ? requestedTestFiles : [
  'tests/integration/idempotency.integration.test.ts',
  'tests/integration/inventory.integration.test.ts',
  'tests/integration/outbox.integration.test.ts',
  'tests/integration/money-correctness.integration.test.ts',
  'tests/integration/order-state.integration.test.ts',
  'tests/integration/fulfillment.integration.test.ts',
  'tests/integration/security-limits.integration.test.ts',
  'tests/integration/voucher-refund-concurrency.integration.test.ts',
  'tests/e2e/commerce-flow.e2e.test.ts',
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
run(process.execPath, ['node_modules/prisma/build/index.js', 'generate']);
run(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', ...integrationTestFiles]);
