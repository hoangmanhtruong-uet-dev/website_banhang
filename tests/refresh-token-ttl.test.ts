import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  parseRefreshTokenTtlSeconds,
  refreshTokenExpiresAt,
} from '../src/config/refresh-token';
import { createAuthCookieOptions } from '../src/lib/auth-cookie';

test('refresh token TTL uses a safe default only outside production', () => {
  assert.equal(
    parseRefreshTokenTtlSeconds(undefined, 'development'),
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  );
  assert.equal(
    parseRefreshTokenTtlSeconds(undefined, 'test'),
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  );
  assert.throws(
    () => parseRefreshTokenTtlSeconds(undefined, 'production'),
    /required in production/,
  );
});

test('refresh token TTL rejects zero, negative, non-numeric, duration and millisecond values', () => {
  for (const value of ['0', '-1', 'abc', '7d', '1.5', '604800000']) {
    assert.throws(
      () => parseRefreshTokenTtlSeconds(value, 'production'),
      /REFRESH_TOKEN_TTL/,
      value,
    );
  }
});

test('database expiry is calculated from TTL seconds without millisecond confusion', () => {
  const now = new Date('2026-08-02T00:00:00.000Z');
  const expiresAt = refreshTokenExpiresAt(now, 60);

  assert.equal(expiresAt.getTime() - now.getTime(), 60_000);
});

test('refresh cookie maxAge and expires preserve the database session timing', () => {
  const expiresAt = new Date('2026-08-09T00:00:00.000Z');
  const options = createAuthCookieOptions(604_800, expiresAt, 'production');

  assert.equal(options.maxAge, 604_800);
  assert.equal(options.expires.getTime(), expiresAt.getTime());
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
});

test('session creation, rotation and cleanup share the configured expiry semantics', () => {
  const sessionSource = readFileSync('src/lib/services/session.service.ts', 'utf8');
  const authSource = readFileSync('src/lib/services/auth.service.ts', 'utf8');

  assert.equal(
    sessionSource.match(/refreshTokenExpiresAt\([^\n]+env\.REFRESH_TOKEN_TTL\)/g)?.length,
    2,
  );
  assert.match(sessionSource, /cleanupExpiredSessions/);
  assert.match(sessionSource, /expiresAt:\s*\{\s*lte:\s*now\s*\}/);
  assert.match(authSource, /createAuthCookieOptions\(env\.REFRESH_TOKEN_TTL, refreshExpiresAt\)/);
  assert.doesNotMatch(sessionSource, /setDate\(|30\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
  assert.doesNotMatch(authSource, /30\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
});
