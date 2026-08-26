import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  failureMode?: 'closed' | 'open';
  backendTimeoutMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
  reason?: 'limit_exceeded' | 'backend_unavailable';
}

export interface RateLimitBackend {
  increment(keyHash: string, now: Date, windowMs: number): Promise<{ count: number; reset: number }>;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  max: 10,
  failureMode: 'closed',
  backendTimeoutMs: 2_000,
};

export function hashRateLimitIdentifier(identifier: string, windowMs: number): string {
  // HMAC prevents raw user ids, emails, and IP addresses from being recoverable from database keys.
  return crypto
    .createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`rate-limit:v1:${windowMs}:${identifier}`)
    .digest('hex');
}

export const databaseRateLimitBackend: RateLimitBackend = {
  async increment(keyHash, now, windowMs) {
    const nextExpiry = new Date(now.getTime() + windowMs);

    return prisma.$transaction(async (tx) => {
      // This statement takes an exclusive row lock. Assignment order is intentional:
      // every predicate observes the old expiresAt before expiresAt is replaced.
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO rate_limit_bucket
          (keyHash, count, windowStart, expiresAt, createdAt, updatedAt)
        VALUES
          (${keyHash}, 1, ${now}, ${nextExpiry}, ${now}, ${now})
        ON DUPLICATE KEY UPDATE
          count = IF(expiresAt <= ${now}, 1, count + 1),
          windowStart = IF(expiresAt <= ${now}, ${now}, windowStart),
          expiresAt = IF(expiresAt <= ${now}, ${nextExpiry}, expiresAt),
          updatedAt = ${now}
      `);

      const rows = await tx.$queryRaw<Array<{ count: number; expiresAt: Date }>>(Prisma.sql`
        SELECT count, expiresAt
        FROM rate_limit_bucket
        WHERE keyHash = ${keyHash}
        FOR UPDATE
      `);
      const bucket = rows[0];
      if (!bucket) throw new Error('Rate-limit bucket was not persisted');
      return { count: Number(bucket.count), reset: new Date(bucket.expiresAt).getTime() };
    });
  },
};

function validateConfig(config: RateLimitConfig): Required<RateLimitConfig> {
  const merged = { ...DEFAULT_CONFIG, ...config } as Required<RateLimitConfig>;
  if (!Number.isSafeInteger(merged.windowMs) || merged.windowMs <= 0) {
    throw new TypeError('rateLimit windowMs must be a positive integer');
  }
  if (!Number.isSafeInteger(merged.max) || merged.max <= 0) {
    throw new TypeError('rateLimit max must be a positive integer');
  }
  if (!Number.isSafeInteger(merged.backendTimeoutMs) || merged.backendTimeoutMs <= 0) {
    throw new TypeError('rateLimit backendTimeoutMs must be a positive integer');
  }
  return merged;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Rate-limit backend timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createRateLimiter(
  backend: RateLimitBackend,
  clock: () => number = Date.now,
) {
  return async function distributedRateLimit(
    identifier: string,
    config: RateLimitConfig = DEFAULT_CONFIG,
  ): Promise<RateLimitResult> {
    const options = validateConfig(config);
    const nowMs = clock();
    const resetOnFailure = nowMs + options.windowMs;
    const keyHash = hashRateLimitIdentifier(identifier, options.windowMs);

    try {
      const bucket = await withTimeout(
        backend.increment(keyHash, new Date(nowMs), options.windowMs),
        options.backendTimeoutMs,
      );
      const success = bucket.count <= options.max;
      return {
        success,
        limit: options.max,
        remaining: Math.max(0, options.max - bucket.count),
        reset: bucket.reset,
        retryAfter: Math.max(1, Math.ceil((bucket.reset - nowMs) / 1000)),
        ...(success ? {} : { reason: 'limit_exceeded' as const }),
      };
    } catch (error) {
      // Never log identifier/keyHash: callers can scope them with IP/email/user id.
      logger.error('[RATE_LIMIT_BACKEND]', error, { failureMode: options.failureMode });
      return {
        success: options.failureMode === 'open',
        limit: options.max,
        remaining: options.failureMode === 'open' ? options.max : 0,
        reset: resetOnFailure,
        retryAfter: Math.max(1, Math.ceil(options.windowMs / 1000)),
        reason: 'backend_unavailable',
      };
    }
  };
}
