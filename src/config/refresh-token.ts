export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MAX_REFRESH_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

export function parseRefreshTokenTtlSeconds(
  rawValue: string | undefined,
  nodeEnv: string | undefined,
): number {
  const value = rawValue?.trim();

  if (!value) {
    if (nodeEnv === 'production') {
      throw new Error('REFRESH_TOKEN_TTL is required in production and must be expressed in seconds');
    }
    return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('REFRESH_TOKEN_TTL must be a positive integer number of seconds');
  }

  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds > MAX_REFRESH_TOKEN_TTL_SECONDS) {
    throw new Error(
      'REFRESH_TOKEN_TTL must not exceed ' + MAX_REFRESH_TOKEN_TTL_SECONDS + ' seconds',
    );
  }

  return seconds;
}

export function refreshTokenExpiresAt(now: Date, ttlSeconds: number): Date {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('Refresh token TTL must be a positive integer number of seconds');
  }

  return new Date(now.getTime() + ttlSeconds * 1_000);
}
