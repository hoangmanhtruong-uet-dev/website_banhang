import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, databaseRateLimitBackend, createFailureCounter } from '@/lib/rate-limit/rate-limit-backend';
import { RedisRateLimitBackend, InMemoryRedisSimulator } from '@/lib/rate-limit/rate-limit-redis';
import { getRateLimitResponse } from '@/lib/rate-limit/rate-limit';

// Test 1: Multi-instance distributed limiter using shared Redis simulator
test('1. Three simulated application instances enforce global limit (no 3x limit bypass)', async () => {
  const sharedRedis = new InMemoryRedisSimulator();
  const redisBackend = new RedisRateLimitBackend(sharedRedis);

  let nowMs = Date.UTC(2026, 8, 7, 0, 0, 0);
  const clock = () => nowMs;

  const instanceA = createRateLimiter(redisBackend, clock);
  const instanceB = createRateLimiter(redisBackend, clock);
  const instanceC = createRateLimiter(redisBackend, clock);

  const instances = [instanceA, instanceB, instanceC];
  const userIdentifier = 'login:user@example.test:1.2.3.4';
  const config = { windowMs: 60_000, max: 10 };

  // Make 15 requests distributed randomly across Instance A, B, C
  const results = [];
  for (let i = 0; i < 15; i++) {
    const instance = instances[i % 3];
    const res = await instance(userIdentifier, config);
    results.push(res);
  }

  const allowed = results.filter((r) => r.success).length;
  const blocked = results.filter((r) => !r.success).length;

  assert.equal(allowed, 10, 'Must allow exactly 10 requests total across all 3 instances');
  assert.equal(blocked, 5, 'Must block 5 requests once global limit of 10 is reached');
  assert.equal(results[10].reason, 'limit_exceeded');
  assert.equal(results[10].remaining, 0);
});

// Test 2: Database backend multi-instance atomic rate limiting
test('2. Multi-instance rate limiting via database ON DUPLICATE KEY UPDATE backend', async () => {
  type Bucket = { count: number; reset: number };
  const mockDbStore = new Map<string, Bucket>();

  // Mock DB backend enforcing ON DUPLICATE KEY UPDATE semantics
  const mockDbBackend = {
    async increment(keyHash: string, now: Date, windowMs: number) {
      const current = mockDbStore.get(keyHash);
      if (!current || current.reset <= now.getTime()) {
        const next = { count: 1, reset: now.getTime() + windowMs };
        mockDbStore.set(keyHash, next);
        return next;
      }
      current.count += 1;
      return current;
    },
    async get(keyHash: string, now: Date) {
      const current = mockDbStore.get(keyHash);
      if (!current || current.reset <= now.getTime()) return null;
      return current;
    },
    async reset(keyHash: string) {
      mockDbStore.delete(keyHash);
    },
  };

  let now = Date.now();
  const limiterA = createRateLimiter(mockDbBackend, () => now);
  const limiterB = createRateLimiter(mockDbBackend, () => now);

  const results = [];
  for (let i = 0; i < 8; i++) {
    const limiter = i % 2 === 0 ? limiterA : limiterB;
    results.push(await limiter('payment-pin:user-123', { windowMs: 15_000, max: 5 }));
  }

  assert.equal(results.filter((r) => r.success).length, 5);
  assert.equal(results.filter((r) => !r.success).length, 3);
});

// Test 3: Backend outage & Fail-Closed strategy
test('3. Redis outage triggers fail-closed behavior with HTTP 503 response', async () => {
  const failingRedis = {
    async eval(): Promise<never> {
      throw new Error('Redis connection lost');
    },
    async get(): Promise<never> {
      throw new Error('Redis connection lost');
    },
    async del(): Promise<never> {
      throw new Error('Redis connection lost');
    },
  };

  const failingBackend = new RedisRateLimitBackend(failingRedis);
  const limiter = createRateLimiter(failingBackend);

  const res = await limiter('auth:login:attempt', { windowMs: 60_000, max: 5, failureMode: 'closed' });

  assert.equal(res.success, false);
  assert.equal(res.reason, 'backend_unavailable');

  const httpRes = getRateLimitResponse(res);
  assert.equal(httpRes.status, 503);
  const body = await httpRes.json() as { code: string };
  assert.equal(body.code, 'RATE_LIMIT_BACKEND_UNAVAILABLE');
});

// Test 4: TTL Expiration and window reset
test('4. TTL Expiration resets limit after window passes', async () => {
  let nowMs = 1_000_000;
  const clock = () => nowMs;
  const sharedRedis = new InMemoryRedisSimulator(clock);
  const redisBackend = new RedisRateLimitBackend(sharedRedis);

  const limiter = createRateLimiter(redisBackend, clock);

  for (let i = 0; i < 5; i++) {
    await limiter('user-reset-test', { windowMs: 10_000, max: 5 });
  }

  const blocked = await limiter('user-reset-test', { windowMs: 10_000, max: 5 });
  assert.equal(blocked.success, false);

  // Advance time beyond windowMs (10,000ms)
  nowMs += 10_001;

  const afterReset = await limiter('user-reset-test', { windowMs: 10_000, max: 5 });
  assert.equal(afterReset.success, true);
  assert.equal(afterReset.remaining, 4);
});
