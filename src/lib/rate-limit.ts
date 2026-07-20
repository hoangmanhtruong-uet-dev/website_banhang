import { NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, max: 10 }
) {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord = { count: 1, resetTime: now + config.windowMs };
    memoryStore.set(identifier, newRecord);
    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      reset: newRecord.resetTime,
    };
  }

  record.count++;
  
  if (record.count > config.max) {
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  return {
    success: true,
    limit: config.max,
    remaining: config.max - record.count,
    reset: record.resetTime,
  };
}

export function getRateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}