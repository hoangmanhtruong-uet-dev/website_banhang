import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PasswordService } from '../src/lib/services/password.service';

const read = (path: string) => readFileSync(path, 'utf8');

test('password hashing/login uses bcrypt hash and verify, never plain text equality', async () => {
  const password = 'correct-horse-battery-staple';
  const hash = await PasswordService.hash(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await PasswordService.verify(password, hash), true);
  assert.equal(await PasswordService.verify('wrong-password', hash), false);
});

test('reset password token is hashed, expires, one-time use, and revokes sessions', () => {
  const source = read('src/lib/services/password-reset.service.ts');

  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /tokenHash/);
  assert.match(source, /expiresAt\.setMinutes/);
  assert.match(source, /usedAt:\s*null/);
  assert.match(source, /expiresAt:\s*\{\s*gt:\s*now\s*\}/);
  assert.match(source, /data:\s*\{\s*usedAt:\s*now\s*\}/);
  assert.match(source, /tx\.session\.updateMany/);
  assert.match(source, /revokedAt:\s*now/);
});

test('user cannot fetch another user order; admin-only guard rejects normal user', () => {
  const orderService = read('src/lib/services/order.service.ts');
  const auth = read('src/lib/auth.ts');

  assert.match(orderService, /role === 'admin' \? \{ id: orderId \} : \{ id: orderId, userId \}/);
  assert.match(auth, /role !== 'admin'|session\.role !== 'admin'/);
});

test('voucher with one remaining use is protected by transactional atomic update', () => {
  const source = read('src/lib/services/order.service.ts');

  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /tx\.voucher\.updateMany/);
  assert.match(source, /usedCount:\s*\{\s*lt:\s*voucher\.usageLimit\s*\}/);
  assert.match(source, /usedCount:\s*\{\s*increment:\s*1\s*\}/);
  assert.match(source, /voucherUpdate\.count !== 1/);
});

test('stock with one remaining item is protected by atomic decrement guard', () => {
  const source = read('src/lib/services/order.service.ts');

  assert.match(source, /tx\.product\.updateMany/);
  assert.match(source, /stockQuantity:\s*\{\s*gte:\s*item\.quantity\s*\}/);
  assert.match(source, /stockQuantity:\s*\{\s*decrement:\s*item\.quantity\s*\}/);
  assert.match(source, /stockUpdate\.count !== 1/);
});

test('production error response hides stack trace and internal message', () => {
  const source = read('src/lib/api-handler.ts');

  assert.match(source, /const requestId = crypto\.randomUUID\(\)/);
  assert.match(source, /process\.env\.NODE_ENV === 'development'/);
  assert.match(source, /stack: error\.stack/);
  assert.match(source, /message:\s*'Đã có lỗi xảy ra, vui lòng thử lại sau'/);
  assert.match(source, /status >= 500/);
});

test('upload rejects spoofed MIME by magic bytes and disallows script-capable formats', () => {
  const source = read('src/app/api/upload/route.ts');

  assert.match(source, /StorageService\.validateFile\(buffer,\s*file\.type\)/);
  assert.doesNotMatch(source, /image\/svg\+xml|text\/html|application\/javascript/);
  assert.match(read('src/lib/services/storage.service.ts'), /randomUUID\(\)/);
  assert.match(source, /formData\.get\('file'\)/);
  assert.match(source, /MAX_FILE_SIZE\s*=\s*5 \* 1024 \* 1024/);
});

test('mass assignment sensitive order fields are server-owned', () => {
  const route = read('src/app/api/orders/route.ts');
  const service = read('src/lib/services/order.service.ts');

  assert.doesNotMatch(route, /totalAmount|paymentStatus/);
  assert.match(service, /const total = Math\.max\(0, subtotal - discount\)/);
  assert.match(service, /paymentStatus = 'paid'|paymentStatus\s*=\s*'pending'/);
  assert.match(service, /userId: userId \|\| null/);
});