/**
 * Simple in-memory TTL cache — VOJAS M17
 *
 * For production, replace with Redis. The interface is designed
 * to be a drop-in swap (same get/set/del API).
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

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix ms
}

const store = new Map<string, CacheEntry<unknown>>();

// Periodically clean up expired entries (every 5 minutes)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanup(): void {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = Date.now();
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function get<T>(key: string): T | null {
  cleanup();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function set<T>(key: string, value: T, ttlSeconds: number): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function del(key: string): void {
  store.delete(key);
}

export function invalidate(pattern: string): void {
  // Simple prefix-based invalidation
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) {
      store.delete(key);
    }
  }
}

export function clear(): void {
  store.clear();
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
