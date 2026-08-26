import { refreshTokenExpiresAt } from '@/config/refresh-token';

export function createAuthCookieOptions(
  maxAgeSeconds: number,
  expiresAt?: Date,
  nodeEnv = process.env.NODE_ENV,
) {
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 0) {
    throw new Error('Cookie maxAge must be a non-negative integer number of seconds');
  }

  const expires = expiresAt
    ? new Date(expiresAt)
    : maxAgeSeconds === 0
      ? new Date(0)
      : refreshTokenExpiresAt(new Date(), maxAgeSeconds);

  if (Number.isNaN(expires.getTime())) {
    throw new Error('Cookie expiry must be a valid date');
  }

  return {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds,
    expires,
    path: '/',
  };
}
