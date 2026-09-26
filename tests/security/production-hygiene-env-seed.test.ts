import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { assertDemoScriptMayMutateDatabase } from '@/lib/security/script-safety';

process.env.DATABASE_URL ??= 'mysql://user:pass@localhost:3306/app_test';
process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
process.env.REFRESH_TOKEN_TTL ??= '604800';

const require = createRequire(import.meta.url);
const { envSchema } = require('@/config/env') as typeof import('@/config/env');
const { createPaymentProvider } = require('@/lib/services/payment/payment-provider') as typeof import('@/lib/services/payment/payment-provider');

const baseEnv = {
  DATABASE_URL: 'mysql://user:pass@db.example:3306/app_prod',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  REFRESH_TOKEN_TTL: '604800',
  NODE_ENV: 'production' as const,
  NEXT_PUBLIC_APP_URL: 'https://shop.example',
  STORAGE_PROVIDER: 'cloudinary' as const,
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  NOTIFICATION_PROVIDER: 'webhook' as const,
};

test('repository hygiene rejects tracked production-like dump files while preserving Prisma migrations', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  assert.ok(tracked.some(path => /^prisma\/migrations\/.+\/migration\.sql$/.test(path)), 'Prisma migration SQL files must remain tracked');
  assert.deepEqual(tracked.filter(path => /^backups\/.*\.sql$/i.test(path)), []);
  assert.deepEqual(tracked.filter(path => /\.(?:dump|bak)$/i.test(path)), []);
});

test('production environment accepts only explicit durable storage and real notification provider', () => {
  assert.equal(envSchema.safeParse(baseEnv).success, true);

  for (const override of [
    { STORAGE_PROVIDER: undefined },
    { STORAGE_PROVIDER: 'local' },
    { STORAGE_PROVIDER: 's3' },
    { STORAGE_PROVIDER: 'cloudinary', CLOUDINARY_API_SECRET: undefined },
    { NOTIFICATION_PROVIDER: 'log' },
    { DEMO_SEED_ENABLED: 'true' },
    { DEMO_SELLER_SETUP_ENABLED: 'true' },
    { NEXT_PUBLIC_APP_URL: 'http://shop.example' },
  ]) {
    const candidate = { ...baseEnv, ...override } as Record<string, unknown>;
    assert.equal(envSchema.safeParse(candidate).success, false, `expected rejection for ${JSON.stringify(override)}`);
  }
});

test('development and test keep local/log flexibility', () => {
  for (const NODE_ENV of ['development', 'test'] as const) {
    assert.equal(envSchema.safeParse({
      DATABASE_URL: 'mysql://user:pass@localhost:3306/app_test',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      NODE_ENV,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }).success, true);
  }
});

test('demo scripts require opt-in and safe database context before mutation', () => {
  const previous = { ...process.env };
  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DATABASE_URL = 'mysql://user:pass@db.example:3306/app_prod';
    process.env.DEMO_SEED_ENABLED = 'true';
    assert.throws(() => assertDemoScriptMayMutateDatabase({ scriptName: 'seed', optInEnv: 'DEMO_SEED_ENABLED' }), /blocked in production/);

    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    delete process.env.DEMO_SEED_ENABLED;
    assert.throws(() => assertDemoScriptMayMutateDatabase({ scriptName: 'seed', optInEnv: 'DEMO_SEED_ENABLED' }), /requires DEMO_SEED_ENABLED=true/);

    process.env.DEMO_SEED_ENABLED = 'true';
    process.env.DATABASE_URL = 'mysql://user:pass@db.example:3306/app_prod';
    assert.throws(() => assertDemoScriptMayMutateDatabase({ scriptName: 'seed', optInEnv: 'DEMO_SEED_ENABLED' }), /development\/test\/demo database/);

    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/app_test';
    assert.doesNotThrow(() => assertDemoScriptMayMutateDatabase({ scriptName: 'seed', optInEnv: 'DEMO_SEED_ENABLED' }));
  } finally {
    process.env = previous;
  }
});

test('seed scripts do not contain fallback or logged plaintext demo passwords', () => {
  for (const path of ['prisma/seed.ts', 'scripts/setup/setup-demo-seller.ts']) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /\/\s*(?:123456|User@123456|Shipper@123|Seller@123456)/);
    assert.match(source, /requireConfiguredSecret/);
  }
});

test('unsupported external payment providers fail before side effects instead of routing to internal wallet', async () => {
  for (const providerName of ['momo', 'vnpay', 'stripe']) {
    const provider = createPaymentProvider(providerName);
    assert.equal(provider.name, providerName);
    const result = await provider.createPayment({ orderId: 'order', userId: 'user', amount: '1000.0000', currency: 'VND' }, 'key');
    assert.deepEqual(result, { outcome: 'FAILED_BEFORE_SIDE_EFFECT', code: 'PAYMENT_PROVIDER_UNSUPPORTED' });
  }
  assert.equal(createPaymentProvider('internal_wallet').name, 'internal_wallet');
});

test('password reset email uses notification provider and does not log raw reset URL or token', () => {
  const emailService = readFileSync('src/lib/services/notification/email.service.ts', 'utf8');
  const forgotRoute = readFileSync('src/app/api/auth/forgot-password/route.ts', 'utf8');
  const notificationProvider = readFileSync('src/lib/services/notification/notification-provider.ts', 'utf8');

  assert.match(emailService, /createNotificationProvider/);
  assert.match(emailService, /template:\s*'password-reset'/);
  assert.doesNotMatch(emailService, /\[EMAIL SENT\]|logger\.info\([^\n]*(?:resetUrl|token)/);
  assert.doesNotMatch(forgotRoute, /console\.error\('\[FORGOT_PASSWORD_EMAIL\]'/);
  assert.match(notificationProvider, /NODE_ENV === 'production'[\s\S]*?throw new Error\('Log notification provider is not allowed in production'\)/);
});
