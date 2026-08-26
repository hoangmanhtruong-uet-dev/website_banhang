import { NextResponse } from 'next/server';
import { createRateLimiter, databaseRateLimitBackend, type RateLimitResult } from '@/lib/rate-limit-backend';

export type { RateLimitBackend, RateLimitConfig, RateLimitResult } from '@/lib/rate-limit-backend';
export { createRateLimiter, databaseRateLimitBackend, hashRateLimitIdentifier } from '@/lib/rate-limit-backend';

export const rateLimit = createRateLimiter(databaseRateLimitBackend);

export function getRateLimitResponse(resultOrReset: RateLimitResult | number) {
  const result = typeof resultOrReset === 'number' ? undefined : resultOrReset;
  const reset = typeof resultOrReset === 'number' ? resultOrReset : resultOrReset.reset;
  const backendUnavailable = result?.reason === 'backend_unavailable';
  const retryAfter = result?.retryAfter ?? Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  const code = backendUnavailable ? 'RATE_LIMIT_BACKEND_UNAVAILABLE' : 'RATE_LIMIT_EXCEEDED';
  const headers: Record<string, string> = {
    'Retry-After': retryAfter.toString(),
    'X-RateLimit-Reset': Math.ceil(reset / 1000).toString(),
  };
  if (result) {
    headers['X-RateLimit-Limit'] = result.limit.toString();
    headers['X-RateLimit-Remaining'] = result.remaining.toString();
  }
  return NextResponse.json(
    { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.', code },
    {
      status: backendUnavailable ? 503 : 429,
      headers,
    }
  );
}