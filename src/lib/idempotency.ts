import { createHash } from 'node:crypto';
import { ValidationError } from '@/lib/errors';

const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/;

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ValidationError('Request contains a non-finite number');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source).sort().reduce<Record<string, unknown>>((result, key) => {
      if (source[key] !== undefined) result[key] = canonicalize(source[key]);
      return result;
    }, {});
  }
  throw new ValidationError('Request contains an unsupported value');
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function requestFingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function hashForLog(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function requireIdempotencyKey(headers: Headers): string {
  const key = headers.get('idempotency-key')?.trim();
  if (!key) throw new ValidationError('Idempotency-Key header is required');
  if (!KEY_PATTERN.test(key)) {
    throw new ValidationError('Idempotency-Key must be 1-255 characters using letters, numbers, dot, colon, underscore, or hyphen');
  }
  return key;
}