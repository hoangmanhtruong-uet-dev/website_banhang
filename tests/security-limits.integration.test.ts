import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  createRateLimiter,
  databaseRateLimitBackend,
  hashRateLimitIdentifier,
} from '../src/lib/rate-limit-backend';
import {
  releaseUploadReservation,
  reserveUploadQuota,
  UploadQuotaExceededError,
  type UploadQuotaReservation,
} from '../src/lib/services/upload-quota.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') {
  throw new Error('Run through npm run test:integration so a disposable MySQL database is used');
}

const prisma = new PrismaClient();
const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userA = `upload-a-${token}`;
const userB = `upload-b-${token}`;
const rateIdentifiers = [`integration-rate-a-${token}`, `integration-rate-b-${token}`];

before(async () => {
  await prisma.user.createMany({
    data: [
      { id: userA, code: `UA${token}`.slice(0, 191), name: 'Upload A', email: `${userA}@example.test`, password: 'not-used' },
      { id: userB, code: `UB${token}`.slice(0, 191), name: 'Upload B', email: `${userB}@example.test`, password: 'not-used' },
    ],
  });
});

after(async () => {
  await prisma.uploadAsset.deleteMany({ where: { userId: { in: [userA, userB] } } });
  await prisma.uploadReservation.deleteMany({ where: { userId: { in: [userA, userB] } } });
  await prisma.uploadQuotaBucket.deleteMany({ where: { userId: { in: [userA, userB] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  await prisma.rateLimitBucket.deleteMany({
    where: {
      keyHash: {
        in: rateIdentifiers.map((identifier) => hashRateLimitIdentifier(identifier, 60_000)),
      },
    },
  });
  await prisma.$disconnect();
});

test('database rate limiter is shared, atomic under concurrency, isolated, and resets', async () => {
  let now = Date.UTC(2026, 7, 2, 12, 0, 0);
  const instanceA = createRateLimiter(databaseRateLimitBackend, () => now);
  const instanceB = createRateLimiter(databaseRateLimitBackend, () => now);

  const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) => {
    const limiter = index % 2 === 0 ? instanceA : instanceB;
    return limiter(rateIdentifiers[0], { windowMs: 60_000, max: 5, backendTimeoutMs: 10_000 });
  }));
  assert.equal(attempts.filter((result) => result.success).length, 5);
  assert.equal(attempts.filter((result) => result.reason === 'limit_exceeded').length, 15);

  const isolated = await instanceA(rateIdentifiers[1], { windowMs: 60_000, max: 5 });
  assert.equal(isolated.success, true);

  now += 60_001;
  const reset = await instanceB(rateIdentifiers[0], { windowMs: 60_000, max: 5 });
  assert.equal(reset.success, true);
  assert.equal(reset.remaining, 4);
});

test('daily quota uses atomic reservations and isolates users', async () => {
  const now = new Date('2026-08-02T12:00:00.000Z');
  const limits = { filesPerDay: 5, bytesPerDay: 500 };
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () => reserveUploadQuota(userA, [100], now, limits)),
  );
  const reservationsA = results
    .filter((result): result is PromiseFulfilledResult<UploadQuotaReservation> => result.status === 'fulfilled')
    .map((result) => result.value);
  const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  assert.equal(reservationsA.length, 5);
  assert.equal(rejected.length, 15);
  assert.ok(rejected.every((result) => result.reason instanceof UploadQuotaExceededError));

  const bucketA = await prisma.uploadQuotaBucket.findUniqueOrThrow({
    where: { userId_periodStart: { userId: userA, periodStart: new Date('2026-08-02T00:00:00.000Z') } },
  });
  assert.equal(bucketA.requestCount, 5);
  assert.equal(bucketA.fileCount, 5);
  assert.equal(bucketA.bytesUsed, 500n);

  const reservationB = await reserveUploadQuota(userB, [500], now, limits);
  const bucketB = await prisma.uploadQuotaBucket.findUniqueOrThrow({
    where: { userId_periodStart: { userId: userB, periodStart: new Date('2026-08-02T00:00:00.000Z') } },
  });
  assert.equal(bucketB.fileCount, 1);
  assert.equal(bucketB.bytesUsed, 500n);

  await Promise.all([...reservationsA, reservationB].map((reservation) => releaseUploadReservation(reservation.id, now)));
  const releasedA = await prisma.uploadQuotaBucket.findUniqueOrThrow({
    where: { userId_periodStart: { userId: userA, periodStart: new Date('2026-08-02T00:00:00.000Z') } },
  });
  const releasedB = await prisma.uploadQuotaBucket.findUniqueOrThrow({
    where: { userId_periodStart: { userId: userB, periodStart: new Date('2026-08-02T00:00:00.000Z') } },
  });
  assert.equal(releasedA.requestCount, 0);
  assert.equal(releasedA.fileCount, 0);
  assert.equal(releasedA.bytesUsed, 0n);
  assert.equal(releasedB.requestCount, 0);
  assert.equal(releasedB.fileCount, 0);
  assert.equal(releasedB.bytesUsed, 0n);
});

test('quota reset metadata uses the supplied clock for immediate rejection', async () => {
  const now = new Date('2030-01-15T23:59:00.000Z');
  await assert.rejects(
    reserveUploadQuota(userA, [501], now, { filesPerDay: 5, bytesPerDay: 500 }),
    (error: unknown) => error instanceof UploadQuotaExceededError
      && error.resetAt.toISOString() === '2030-01-16T00:00:00.000Z',
  );
});
