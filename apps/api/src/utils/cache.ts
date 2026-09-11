/**
 * TTL cache — VOJAS 2.0 M19
 *
 * Dispatcher: routes to the Redis-backed cache when available,
 * falls back to the in-memory store when Redis is unreachable.
 *
 * Both backends are synchronous (the Redis backend uses a local in-memory
 * mirror for sync reads, with fire-and-forget writes to Redis for durability
 * and cross-instance consistency).
 *
 * WHAT TO CACHE:
 *   - Project summaries (public list)
 *   - Satellite metadata (availability status)
 *   - Aggregated analytics (national/state summaries)
 *   - Benchmark results (change slowly)
 *   - Forecasts (read-heavy, valid until expiry)
 *
 * WHAT NOT TO CACHE:
 *   - User-specific data
 *   - Private reports
 *   - Verification cases
 *   - Any data behind authentication that varies per user
 *   - Write operations
 */

import { isRedisAvailable, reportRedisDetectionResult } from '../config/redis.js';
import { logger } from './logger.js';
import { cache as redisCache } from './cache.redis.js';

// ── In-memory store (fallback) ──────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix ms
}

const memStore = new Map<string, CacheEntry<unknown>>();

// Periodically clean up expired entries (every 5 minutes)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function memCleanup(): void {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = Date.now();
  const now = Date.now();
  for (const [key, entry] of memStore.entries()) {
    if (entry.expiresAt <= now) {
      memStore.delete(key);
    }
  }
}

function memGet<T>(key: string): T | null {
  memCleanup();
  const entry = memStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  memStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function memDel(key: string): void {
  memStore.delete(key);
}

function memInvalidate(prefix: string): void {
  for (const key of memStore.keys()) {
    if (key.startsWith(prefix)) {
      memStore.delete(key);
    }
  }
}

function memClear(): void {
  memStore.clear();
}

// ── Backend detection ───────────────────────────────────────────────────────────

let useRedis = false;
let detected = false;

async function detectCacheBackend(): Promise<void> {
  if (detected) return;
  detected = true;

  const available = await isRedisAvailable();
  if (available) {
    useRedis = true;
    logger.info('[cache] Backend: Redis (production-grade)');
    // Best-effort hydrate local mirror from Redis.
    try {
      await redisCache.hydrate();
    } catch (err) {
      logger.warn('[cache] Initial hydrate failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    useRedis = false;
    logger.warn('[cache] Backend: in-memory (Redis unavailable)');
  }
  reportRedisDetectionResult(useRedis);
}

void detectCacheBackend();

// ── Dispatcher (SYNCHRONOUS — same contract as before M19) ─────────────────────

export function get<T>(key: string): T | null {
  if (useRedis) return redisCache.get<T>(key);
  return memGet<T>(key);
}

export function set<T>(key: string, value: T, ttlSeconds: number): void {
  if (useRedis) {
    redisCache.set(key, value, ttlSeconds);
    return;
  }
  memSet(key, value, ttlSeconds);
}

export function del(key: string): void {
  if (useRedis) {
    redisCache.del(key);
    return;
  }
  memDel(key);
}

export function invalidate(pattern: string): void {
  if (useRedis) {
    redisCache.invalidate(pattern);
    return;
  }
  memInvalidate(pattern);
}

export function clear(): void {
  if (useRedis) {
    redisCache.clear();
    return;
  }
  memClear();
}

export const CACHE_TTL = {
  /** Public project list summary — 5 min */
  PROJECT_LIST: 300,
  /** Satellite availability status — 10 min */
  SATELLITE_STATUS: 600,
  /** National/state analytics aggregates — 5 min */
  ANALYTICS_AGGREGATE: 300,
  /** Benchmark results — 1 hour (change slowly) */
  BENCHMARK: 3600,
  /** Risk hotspots — 2 min */
  RISK_HOTSPOTS: 120,
  /** State analytics — 5 min */
  STATE_ANALYTICS: 300,
  /** Constituency analytics — 5 min */
  CONSTITUENCY_ANALYTICS: 300,
  /** Forecast results — 1 hour */
  FORECAST: 3600,
} as const;
