import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1:3306/upload_unit_test';
process.env.JWT_ACCESS_SECRET ||= 'unit-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'unit-refresh-secret-that-is-at-least-32-characters';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff, 0xd9]);
const png = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  Buffer.alloc(25),
  Buffer.from('0000000049454e44ae426082', 'hex'),
]);

test('upload handler authenticates before parsing multipart and uses session ownership', () => {
  const handler = readFileSync('src/lib/secure-upload-handler.ts', 'utf8');
  const authIndex = handler.indexOf('await getSession()');
  const formDataIndex = handler.indexOf('await req.formData()');
  assert.ok(authIndex >= 0 && authIndex < formDataIndex);
  assert.match(handler, /AUTHENTICATION_REQUIRED/);
  assert.match(handler, /authorizeUploadPurpose\(tx, session, purpose, resourceId\)/);
  assert.doesNotMatch(handler, /formData\.get\(['"]userId['"]\)/);
});

test('upload policy rejects MIME spoofing, extension mismatch, traversal, and trailing payloads', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('../src/lib/upload-policy');

  assert.equal(validateUploadBuffer(jpeg, 'photo.jpeg', 'image/jpeg').mimeType, 'image/jpeg');
  assert.throws(() => validateUploadBuffer(jpeg, 'photo.png', 'image/jpeg'), UploadPolicyError);
  assert.throws(() => validateUploadBuffer(jpeg, '../photo.jpg', 'image/jpeg'), UploadPolicyError);
  assert.throws(() => validateUploadBuffer(jpeg, 'photo.jpg', 'image/png'), UploadPolicyError);
  assert.throws(() => validateUploadBuffer(Buffer.concat([png, Buffer.from('<script>')]), 'photo.png', 'image/png'), UploadPolicyError);
});

test('upload policy enforces file size and per-request count', async () => {
  const { UploadPolicyError, validateUploadBuffer, validateUploadCount } = await import('../src/lib/upload-policy');
  assert.throws(
    () => validateUploadBuffer(Buffer.alloc(5 * 1024 * 1024 + 1), 'large.jpg', 'image/jpeg'),
    UploadPolicyError,
  );
  assert.throws(() => validateUploadCount(2, 'avatar'), UploadPolicyError);
  assert.throws(() => validateUploadCount(6, 'product'), UploadPolicyError);
});

test('product upload authorization rejects a different seller resource', async () => {
  const { authorizeUploadPurpose, UploadAssetAuthorizationError } = await import('../src/lib/services/upload-asset.service');
  const tx = {
    product: { findFirst: async () => ({ sellerId: 'seller-b' }) },
  };
  await assert.rejects(
    authorizeUploadPurpose(
      tx as never,
      { userId: 'seller-a', role: 'user', isSeller: true },
      'product',
      'product-b',
    ),
    UploadAssetAuthorizationError,
  );
});

test('avatar and product mutation routes claim persisted assets before attachment', () => {
  const profile = readFileSync('src/app/api/user/profile/route.ts', 'utf8');
  const create = readFileSync('src/app/api/seller/products/create/route.ts', 'utf8');
  const edit = readFileSync('src/app/api/products/[id]/route.ts', 'utf8');
  assert.match(profile, /claimAvatarUpload\(tx, session\.userId, allowed\.avatar\)/);
  assert.match(create, /claimProductUploads\(tx, session\.userId, created\.id, imageUrls\)/);
  assert.match(edit, /claimProductUploads\(tx, session\.userId, id, claimImageUrls, existingImageUrls\)/);
});

test('storage keys are server-generated from detected MIME and never from a client key', () => {
  const storage = readFileSync('src/lib/services/storage.service.ts', 'utf8');
  const handler = readFileSync('src/lib/secure-upload-handler.ts', 'utf8');
  assert.match(storage, /crypto\.randomUUID\(\)/);
  assert.match(storage, /canonicalExtensionForMime\(detectedMime\)/);
  assert.match(storage, /path\.relative\(this\.uploadDir, filePath\)/);
  assert.match(handler, /CLIENT_CONTROLLED_STORAGE_FIELDS/);
});

test('two limiter instances share a backend, enforce exact concurrency, reset, and isolate keys', async () => {
  const { createRateLimiter } = await import('../src/lib/rate-limit-backend');
  type Bucket = { count: number; reset: number };
  const buckets = new Map<string, Bucket>();
  const backend = {
    async increment(keyHash: string, now: Date, windowMs: number) {
      const current = buckets.get(keyHash);
      const next = !current || current.reset <= now.getTime()
        ? { count: 1, reset: now.getTime() + windowMs }
        : { count: current.count + 1, reset: current.reset };
      buckets.set(keyHash, next);
      return next;
    },
  };
  let now = Date.UTC(2026, 7, 2, 0, 0, 0);
  const firstInstance = createRateLimiter(backend, () => now);
  const secondInstance = createRateLimiter(backend, () => now);
  const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) => {
    const limiter = index % 2 === 0 ? firstInstance : secondInstance;
    return limiter('same-user', { windowMs: 1_000, max: 5 });
  }));
  assert.equal(attempts.filter((result) => result.success).length, 5);
  assert.equal(attempts[5].reason, 'limit_exceeded');

  const isolated = await firstInstance('different-user', { windowMs: 1_000, max: 5 });
  assert.equal(isolated.success, true);
  now += 1_001;
  const reset = await secondInstance('same-user', { windowMs: 1_000, max: 5 });
  assert.equal(reset.success, true);
  assert.equal(reset.remaining, 4);
});

test('limiter backend errors obey explicit fail-closed and fail-open policies', async () => {
  const { createRateLimiter } = await import('../src/lib/rate-limit-backend');
  const failingBackend = {
    async increment(): Promise<never> {
      throw new Error('backend unavailable');
    },
  };
  const limiter = createRateLimiter(failingBackend, () => Date.UTC(2026, 7, 2));
  const closed = await limiter('auth:client', { windowMs: 1_000, max: 1, failureMode: 'closed' });
  const open = await limiter('low-risk:client', { windowMs: 1_000, max: 1, failureMode: 'open' });
  assert.equal(closed.success, false);
  assert.equal(closed.reason, 'backend_unavailable');
  assert.equal(open.success, true);
  assert.equal(open.reason, 'backend_unavailable');
});

test('rate-limit response includes valid Retry-After and stable codes', async () => {
  const { getRateLimitResponse } = await import('../src/lib/rate-limit');
  const limited = getRateLimitResponse({
    success: false,
    limit: 5,
    remaining: 0,
    reset: Date.now() + 2_000,
    retryAfter: 2,
    reason: 'limit_exceeded',
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '2');
  assert.equal((await limited.json()).code, 'RATE_LIMIT_EXCEEDED');

  const failed = getRateLimitResponse({
    success: false,
    limit: 5,
    remaining: 0,
    reset: Date.now() + 2_000,
    retryAfter: 2,
    reason: 'backend_unavailable',
  });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).code, 'RATE_LIMIT_BACKEND_UNAVAILABLE');
});

test('rate-limit persistence and cleanup never store raw identifiers', async () => {
  const { hashRateLimitIdentifier } = await import('../src/lib/rate-limit-backend');
  const raw = 'login:user@example.test:203.0.113.10';
  const key = hashRateLimitIdentifier(raw, 60_000);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(key.includes('example'), false);
  assert.match(readFileSync('prisma/schema.prisma', 'utf8'), /model RateLimitBucket[\s\S]*@@index\(\[expiresAt\]/);
  assert.match(readFileSync('scripts/cleanup-security-buckets.ts', 'utf8'), /rateLimitBucket\.deleteMany/);
});
