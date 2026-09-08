import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Minimal env stubs so modules can import without real DB connection.
process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1:3306/pin_policy_unit';
process.env.JWT_ACCESS_SECRET ||= 'unit-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'unit-refresh-secret-that-is-at-least-32-characters';

const read = (p: string) => readFileSync(p, 'utf8');

test('payment-pin-policy imports failure counter, not generic rateLimit', () => {
  const src = read('src/lib/security/payment-pin-policy.ts');
  assert.match(src, /createFailureCounter/);
  assert.doesNotMatch(src, /\brateLimit\(/);
});

test('failure counter only increments on wrong PIN and resets on success', () => {
  const src = read('src/lib/security/payment-pin-policy.ts');
  const checkIdx = src.indexOf('.check(');
  const verifyIdx = src.indexOf('PasswordService.verify(');
  const failureIdx = src.indexOf('.recordFailure(');
  const resetIdx = src.indexOf('.reset(');

  assert.ok(checkIdx >= 0 && checkIdx < verifyIdx, 'check() must be before verify');
  assert.ok(failureIdx > verifyIdx, 'recordFailure() must be after verify');
  assert.ok(resetIdx > verifyIdx, 'reset() must be after verify');

  const wrongPinBranch = src.indexOf('Mã PIN giao dịch không đúng');
  assert.ok(failureIdx < wrongPinBranch, 'recordFailure before wrong-PIN error');
  assert.ok(resetIdx > wrongPinBranch, 'reset after the wrong-PIN throw');
});

test('PIN never appears in payment route response or logs', () => {
  const payments = read('src/app/api/payments/route.ts');
  const orders = read('src/app/api/orders/route.ts');
  assert.match(payments, /paymentPin:\s*_paymentPin/);
  assert.match(payments, /safeBody/);
  assert.doesNotMatch(payments, /console\.log.*paymentPin/i);
  assert.doesNotMatch(orders, /console\.log.*paymentPin/i);
});

test('missing PIN throws ValidationError, not a bypass', () => {
  const src = read('src/lib/security/payment-pin-policy.ts');
  assert.match(src, /if \(!paymentPin\) throw new ValidationError/);
});

test('payment schema requires paymentPin for non-COD', () => {
  const validations = read('src/lib/validations/index.ts');
  assert.match(validations, /paymentPin.*\\d\{6\}/);
  assert.match(validations, /paymentMethod !== 'COD'.*paymentPin/s);
});

test('failure counter: wrong PIN increments, correct PIN does not, resets clear state', async () => {
  const { createFailureCounter } = await import('@/lib/rate-limit/rate-limit-backend');
  type Bucket = { count: number; reset: number };
  const buckets = new Map<string, Bucket>();
  let now = Date.UTC(2026, 7, 15, 0, 0, 0);
  const backend = {
    async increment(kh: string, _n: Date, w: number) {
      const c = buckets.get(kh);
      const n = !c || c.reset <= now ? { count: 1, reset: now + w } : { count: c.count + 1, reset: c.reset };
      buckets.set(kh, n);
      return n;
    },
    async get(kh: string) { const b = buckets.get(kh); if (!b || b.reset <= now) return null; return b; },
    async reset(kh: string) { buckets.delete(kh); },
  };
  const counter = createFailureCounter(backend, () => now);
  const cfg = { windowMs: 60_000, max: 3, failureMode: 'closed' as const };
  const id = 'payment-pin-failure:user-test';

  // A) check before any failure – passes
  assert.equal((await counter.check(id, cfg)).success, true);
  assert.equal((await counter.check(id, cfg)).remaining, 3);

  // B) wrong PIN – recordFailure increments
  const f1 = await counter.recordFailure(id, cfg);
  assert.equal(f1.remaining, 2);

  // C) correct PIN – check still passes (counter=1)
  assert.equal((await counter.check(id, cfg)).success, true);

  // D) success resets
  await counter.reset(id, cfg);
  assert.equal((await counter.check(id, cfg)).remaining, 3);

  // E) 3 wrong PINs trigger lockout
  await counter.recordFailure(id, cfg);
  await counter.recordFailure(id, cfg);
  await counter.recordFailure(id, cfg);
  const locked = await counter.check(id, cfg);
  assert.equal(locked.success, false);
  assert.equal(locked.reason, 'limit_exceeded');

  // F) after window expires, user can try again
  now += 60_001;
  assert.equal((await counter.check(id, cfg)).success, true);
});

test('10 successful payments do not block user (correct PIN never consumes budget)', async () => {
  const { createFailureCounter } = await import('@/lib/rate-limit/rate-limit-backend');
  const buckets = new Map<string, { count: number; reset: number }>();
  let now = Date.UTC(2026, 7, 15, 12, 0, 0);
  const backend = {
    async increment(kh: string, _n: Date, w: number) {
      const c = buckets.get(kh);
      const n = !c || c.reset <= now ? { count: 1, reset: now + w } : { count: c.count + 1, reset: c.reset };
      buckets.set(kh, n);
      return n;
    },
    async get(kh: string) { const b = buckets.get(kh); if (!b || b.reset <= now) return null; return b; },
    async reset(kh: string) { buckets.delete(kh); },
  };
  const counter = createFailureCounter(backend, () => now);
  const cfg = { windowMs: 60_000, max: 3, failureMode: 'closed' as const };
  const id = 'payment-pin-failure:user-e2e';

  for (let i = 0; i < 10; i++) {
    assert.equal((await counter.check(id, cfg)).success, true, `Payment ${i + 1} blocked`);
    await counter.reset(id, cfg);
  }
  assert.equal((await counter.check(id, cfg)).remaining, 3);
});

test('backend-unavailable defaults to fail-closed for PIN failure counter', async () => {
  const { createFailureCounter } = await import('@/lib/rate-limit/rate-limit-backend');
  const failingBackend = {
    async increment(): Promise<never> { throw new Error('DB down'); },
    async get(): Promise<never> { throw new Error('DB down'); },
    async reset(): Promise<never> { throw new Error('DB down'); },
  };
  const counter = createFailureCounter(failingBackend, () => Date.now());
  const result = await counter.check('payment-pin-failure:x', { windowMs: 60_000, max: 5, failureMode: 'closed' });
  assert.equal(result.success, false);
  assert.equal(result.reason, 'backend_unavailable');
});

test('general payment rate limiting is independent of PIN failure counter', () => {
  const pinPolicy = read('src/lib/security/payment-pin-policy.ts');
  assert.match(pinPolicy, /payment-pin-failure:/);
  const middleware = read('src/middleware.ts');
  assert.doesNotMatch(middleware, /payment-pin-failure/);
});
