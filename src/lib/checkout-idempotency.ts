export const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = 'checkoutIdempotencyAttempt:v1';
export const CHECKOUT_IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredAttempt {
  key: string;
  userId: string;
  fingerprint: string;
  expiresAt: number;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source).sort().reduce<Record<string, unknown>>((result, key) => {
      if (source[key] !== undefined) result[key] = canonicalize(source[key]);
      return result;
    }, {});
  }
  return null;
}

async function fingerprint(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(payload)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateCheckoutKey(
  storage: StorageLike,
  userId: string,
  payload: unknown,
  now = Date.now(),
  ttlMs = CHECKOUT_IDEMPOTENCY_TTL_MS,
): Promise<string> {
  const payloadFingerprint = await fingerprint(payload);
  const raw = storage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  if (raw) {
    try {
      const existing = JSON.parse(raw) as StoredAttempt;
      if (existing.userId === userId && existing.fingerprint === payloadFingerprint && existing.expiresAt > now) return existing.key;
    } catch {
      // Corrupt browser state is replaced below.
    }
  }
  const attempt: StoredAttempt = {
    key: crypto.randomUUID(), userId, fingerprint: payloadFingerprint, expiresAt: now + Math.max(1, ttlMs),
  };
  storage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, JSON.stringify(attempt));
  return attempt.key;
}

export function clearCheckoutKey(storage: StorageLike): void {
  storage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
}