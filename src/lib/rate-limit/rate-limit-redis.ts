import type { FullRateLimitBackend } from '@/lib/rate-limit/rate-limit-backend';

/**
 * Interface for lightweight Redis client supporting basic EVAL / GET / DEL commands.
 */
export interface SimpleRedisClient {
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

// Atomic Lua Script for fixed-window rate limiting in Redis
const INCR_LUA_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  local ttl = redis.call('PTTL', KEYS[1])
  return { current, ttl }
`;

const GET_LUA_SCRIPT = `
  local current = redis.call('GET', KEYS[1])
  if not current then
    return nil
  end
  local ttl = redis.call('PTTL', KEYS[1])
  return { tonumber(current), ttl }
`;

export class RedisRateLimitBackend implements FullRateLimitBackend {
  constructor(private readonly client: SimpleRedisClient) {}

  async increment(keyHash: string, now: Date, windowMs: number): Promise<{ count: number; reset: number }> {
    const redisKey = `rl:${keyHash}`;
    const result = (await this.client.eval(INCR_LUA_SCRIPT, 1, redisKey, windowMs)) as [number, number];
    
    const count = Number(result[0]);
    const pttl = Number(result[1]);
    const reset = now.getTime() + (pttl > 0 ? pttl : windowMs);

    return { count, reset };
  }

  async get(keyHash: string, now: Date): Promise<{ count: number; reset: number } | null> {
    const redisKey = `rl:${keyHash}`;
    const result = (await this.client.eval(GET_LUA_SCRIPT, 1, redisKey)) as [number, number] | null;
    if (!result || !result[0]) return null;

    const count = Number(result[0]);
    const pttl = Number(result[1]);
    const reset = now.getTime() + (pttl > 0 ? pttl : 0);

    return { count, reset };
  }

  async reset(keyHash: string): Promise<void> {
    const redisKey = `rl:${keyHash}`;
    await this.client.del(redisKey);
  }
}

/**
 * In-Memory Map Redis Simulator for Testing & Standalone environments without external Redis binary
 */
export class InMemoryRedisSimulator implements SimpleRedisClient {
  private readonly store = new Map<string, { value: number; expiresAt: number }>();

  constructor(private readonly clock: () => number = Date.now) {}

  async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown> {
    const key = String(args[0]);
    const now = this.clock();

    if (script.includes('INCR')) {
      const windowMs = Number(args[1]);
      const current = this.store.get(key);
      if (!current || current.expiresAt <= now) {
        const next = { value: 1, expiresAt: now + windowMs };
        this.store.set(key, next);
        return [1, windowMs];
      } else {
        current.value += 1;
        const pttl = Math.max(1, current.expiresAt - now);
        return [current.value, pttl];
      }
    }

    if (script.includes('GET')) {
      const current = this.store.get(key);
      if (!current || current.expiresAt <= now) return null;
      const pttl = Math.max(1, current.expiresAt - now);
      return [current.value, pttl];
    }

    throw new Error('Unsupported Lua script in simulator');
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item || item.expiresAt <= Date.now()) return null;
    return String(item.value);
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  clear() {
    this.store.clear();
  }
}
