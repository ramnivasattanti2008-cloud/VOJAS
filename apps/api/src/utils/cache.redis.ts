/**
 * Redis-backed distributed cache — VOJAS 2.0 M19
 *
 * Drop-in sync replacement for the in-memory cache (cache.ts).
 *
 * Strategy:
 *   - All reads come from a local in-memory mirror (sync, O(1))
 *   - Writes go to both the local mirror and Redis (fire-and-forget for Redis)
 *   - On startup, the local mirror is hydrated from Redis (best effort)
 *   - If Redis is unavailable, all writes still go to the local mirror
 *     so the API continues to function; on next boot, the local state is
 *     discarded (which is fine for a cache — staleness is acceptable)
 *
 * Key format: `vojas:cache:{key}`
 * TTL: stored via Redis EX (seconds).
 *
 * For prefix invalidation (invalidate), uses SCAN (not KEYS) so we
 * don't block Redis on large keyspaces.
 *
 * Graceful fallback: if Redis is unreachable, the wrappers in cache.ts
 * catch errors and fall back to the in-memory implementation.
 */

import { getRedis } from '../config/redis.js';
import { logger } from './logger.js';

const CACHE_PREFIX = 'vojas:cache:';

interface LocalEntry<T = unknown> {
  value: T;
  expiresAt: number; // Unix ms
}

// Local mirror for sync reads.
const localStore = new Map<string, LocalEntry>();

/** Strip the prefix when returning keys to callers */
function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function setLocal(key: string, value: unknown, ttlSeconds: number): void {
  localStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function getLocal<T>(key: string): T | null {
  const entry = localStore.get(key) as LocalEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    localStore.delete(key);
    return null;
  }
  return entry.value;
}

function delLocal(key: string): void {
  localStore.delete(key);
}

function invalidateLocal(prefix: string): number {
  let count = 0;
  for (const k of localStore.keys()) {
    if (k.startsWith(prefix)) {
      localStore.delete(k);
      count++;
    }
  }
  return count;
}

function clearLocal(): void {
  localStore.clear();
}

// ── Public API (SYNCHRONOUS — matches in-memory cache contract) ───────────────

export const cache = {
  /** Hydrate local mirror from Redis (called on startup, best effort). */
  async hydrate(): Promise<void> {
    try {
      const r = getRedis();
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await r.scan(cursor, 'MATCH', `${CACHE_PREFIX}*`, 'COUNT', 100);
        cursor = nextCursor;
        for (const k of batch) keys.push(k);
      } while (cursor !== '0');

      if (keys.length === 0) return;
      const pipeline = r.pipeline();
      for (const k of keys) {
        pipeline.get(k);
        pipeline.ttl(k);
      }
      const results = (await pipeline.exec()) ?? [];

      for (let i = 0; i < keys.length; i++) {
        const [getErr, val] = results[i * 2] ?? [];
        const [ttlErr, ttl] = results[i * 2 + 1] ?? [];
        if (getErr || ttlErr || !val) continue;
        const fullKey = keys[i];
        const userKey = fullKey.startsWith(CACHE_PREFIX)
          ? fullKey.slice(CACHE_PREFIX.length)
          : fullKey;
        // ttl: -1 = no expiry, -2 = key doesn't exist, otherwise seconds
        const ttlSec = typeof ttl === 'number' && ttl > 0 ? ttl : 300;
        try {
          const parsed = JSON.parse(val as string);
          setLocal(userKey, parsed, ttlSec);
        } catch {
          // Skip non-JSON values
        }
      }
      logger.info(`[cache:redis] Hydrated ${localStore.size} keys from Redis`);
    } catch (err) {
      logger.warn('[cache:redis] Hydrate failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  get<T>(key: string): T | null {
    return getLocal<T>(key);
  },

  set<T>(key: string, value: T, ttlSeconds: number): void {
    setLocal(key, value, ttlSeconds);
    // Fire-and-forget: persist to Redis.
    void (async () => {
      try {
        const r = getRedis();
        await r.set(cacheKey(key), JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        // Don't crash the API on cache write failure; just log.
        logger.debug('[cache:redis] set (background) failed', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  },

  del(key: string): void {
    delLocal(key);
    void (async () => {
      try {
        const r = getRedis();
        await r.del(cacheKey(key));
      } catch (err) {
        logger.debug('[cache:redis] del (background) failed', {
          key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  },

  invalidate(prefix: string): number {
    const localDeleted = invalidateLocal(prefix);
    void (async () => {
      try {
        const r = getRedis();
        const pattern = cacheKey(prefix) + '*';
        const keys: string[] = [];
        let cursor = '0';
        do {
          const [nextCursor, batch] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          for (const k of batch) keys.push(k);
        } while (cursor !== '0');

        if (keys.length === 0) return;
        for (let i = 0; i < keys.length; i += 100) {
          await r.del(...keys.slice(i, i + 100));
        }
        logger.debug('[cache:redis] Invalidated keys by prefix', { prefix, count: keys.length });
      } catch (err) {
        logger.debug('[cache:redis] invalidate (background) failed', {
          prefix,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return localDeleted;
  },

  clear(): void {
    clearLocal();
    void (async () => {
      try {
        const r = getRedis();
        const keys: string[] = [];
        let cursor = '0';
        do {
          const [nextCursor, batch] = await r.scan(cursor, 'MATCH', `${CACHE_PREFIX}*`, 'COUNT', 100);
          cursor = nextCursor;
          for (const k of batch) keys.push(k);
        } while (cursor !== '0');

        if (keys.length === 0) return;
        for (let i = 0; i < keys.length; i += 100) {
          await r.del(...keys.slice(i, i + 100));
        }
        logger.debug('[cache:redis] Cleared cache', { keysDeleted: keys.length });
      } catch (err) {
        logger.debug('[cache:redis] clear (background) failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  },
};
