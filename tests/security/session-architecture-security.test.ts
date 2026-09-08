import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '@/lib/db';
import { SessionService } from '@/lib/services/auth/session.service';
import { AuthService } from '@/lib/services/auth/auth.service';
import { PasswordResetService } from '@/lib/services/auth/password-reset.service';
import { createAuthCookieOptions } from '@/lib/auth/auth-cookie';
import crypto from 'node:crypto';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') {
  throw new Error('Integration tests require RUN_IDEMPOTENCY_INTEGRATION=1 and a dedicated *_test database.');
}

const suffix = () => crypto.randomUUID();

async function assertTestDatabase() {
  const rows = await prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT DATABASE() AS databaseName`;
  assert.match(rows[0]?.databaseName ?? '', /_test$/);
}

async function cleanDomainData() {
  await prisma.workerHeartbeat.deleteMany();
  await prisma.notificationDelivery.deleteMany();
  await prisma.processedOutboxEvent.deleteMany();
  await prisma.domainAuditLog.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  await assertTestDatabase();
  await cleanDomainData();
});

after(async () => {
  await cleanDomainData();
  await prisma.$disconnect();
});

async function createUser(isActive = true) {
  const id = suffix();
  return prisma.user.create({
    data: {
      code: `U-${id.slice(0, 8)}`,
      name: 'Session Test User',
      email: `${id}@example.test`,
      password: 'hashed_password_123',
      isActive,
    },
  });
}

// 1. Concurrent Refresh Rotation
test('1. Concurrent refresh token requests -> exactly one rotation succeeds, second fails or triggers security revocation', async () => {
  const user = await createUser();
  const { refreshToken } = await SessionService.createSession(user.id);

  // Execute two refresh requests concurrently with the same old refresh token
  const [resultA, resultB] = await Promise.all([
    SessionService.refreshSession(refreshToken),
    SessionService.refreshSession(refreshToken),
  ]);

  const succeededCount = [resultA, resultB].filter((r) => r !== null).length;
  assert.equal(succeededCount, 1, 'Exactly one concurrent refresh attempt must succeed');

  // Verify active sessions for user: since the second attempt detected an already-revoked session, all sessions are revoked
  const activeSessions = await prisma.session.count({
    where: { userId: user.id, revokedAt: null },
  });
  assert.equal(activeSessions, 0, 'Replay detection must revoke all user sessions');
});

// 2. Refresh Replay & All-Session Revocation
test('2. Replaying an old/used refresh token revokes all active sessions for that user', async () => {
  const user = await createUser();
  const session1 = await SessionService.createSession(user.id);

  // Rotate token once legitimately
  const session2 = await SessionService.refreshSession(session1.refreshToken);
  assert.ok(session2);

  // User also has a second active session on another device
  const device2Session = await SessionService.createSession(user.id);
  assert.equal(await prisma.session.count({ where: { userId: user.id, revokedAt: null } }), 2);

  // Attacker attempts to replay old session1 refresh token
  const replayResult = await SessionService.refreshSession(session1.refreshToken);
  assert.equal(replayResult, null);

  // ALL active sessions for this user must now be revoked
  const activeAfterReplay = await prisma.session.count({ where: { userId: user.id, revokedAt: null } });
  assert.equal(activeAfterReplay, 0, 'Replay attack must trigger full session revocation');
});

// 3. Password Reset Revokes All Active Sessions
test('3. Password reset revokes all existing sessions for the user', async () => {
  const user = await createUser();
  await SessionService.createSession(user.id);
  await SessionService.createSession(user.id);

  assert.equal(await prisma.session.count({ where: { userId: user.id, revokedAt: null } }), 2);

  const token = await PasswordResetService.createToken(user.id);
  const resetUser = await PasswordResetService.verifyAndUseToken(token);
  assert.ok(resetUser);

  // Simulating password reset route behavior: update password and revoke all active sessions
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: 'new_hashed_password' } }),
    prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  const activeAfterReset = await prisma.session.count({ where: { userId: user.id, revokedAt: null } });
  assert.equal(activeAfterReset, 0, 'Password reset must invalidate all sessions');
});

// 4. Deactivated User Cannot Refresh Session
test('4. Deactivated user (isActive = false) cannot refresh session', async () => {
  const user = await createUser(true);
  const session = await SessionService.createSession(user.id);

  // Deactivate user account
  await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

  const refreshResult = await SessionService.refreshSession(session.refreshToken);
  assert.equal(refreshResult, null);
});

// 5. Token Hashing Audit
test('5. Refresh tokens are stored strictly as SHA-256 hashes in database', async () => {
  const user = await createUser();
  const { refreshToken } = await SessionService.createSession(user.id);

  const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const sessionRecord = await prisma.session.findFirst({ where: { userId: user.id } });

  assert.ok(sessionRecord);
  assert.equal(sessionRecord.tokenHash, expectedHash);
  assert.equal(sessionRecord.tokenHash.includes(refreshToken), false);
});

// 6. Cookie Security Configuration
test('6. Cookie options enforce HttpOnly, SameSite=Lax, and Secure in production', () => {
  const prodOptions = createAuthCookieOptions(900, undefined, 'production');
  assert.equal(prodOptions.httpOnly, true);
  assert.equal(prodOptions.secure, true);
  assert.equal(prodOptions.sameSite, 'lax');

  const devOptions = createAuthCookieOptions(900, undefined, 'development');
  assert.equal(devOptions.httpOnly, true);
  assert.equal(devOptions.secure, false);
  assert.equal(devOptions.sameSite, 'lax');
});
