export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    factory: () => Promise<T>,
    clock: () => number = Date.now,
  ): Promise<T> {
    const now = clock();
    const existing = this.store.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.value as T;
    }

    // Coalesce concurrent cache misses (Request Coalescing / Stampede Mitigation)
    const activePromise = this.inflight.get(key);
    if (activePromise) {
      return activePromise as Promise<T>;
    }

    const promise = (async () => {
      try {
        const fresh = await factory();
        this.store.set(key, { value: fresh, expiresAt: clock() + ttlMs });
        return fresh;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }
}

export const cacheService = new InMemoryCache();
