/**
 * Redis client singleton — VOJAS 2.0 M19
 *
 * Shared by:
 *   - BullMQ satellite job queue (apps/api/src/services/satelliteJobQueue.bullmq.ts)
 *   - Distributed cache (apps/api/src/utils/cache.redis.ts)
 *
 * Connection: reads REDIS_URL from env (default: redis://localhost:6379)
 *
 * Behaviour:
 *   - Lazy connect: getRedis() returns a singleton; the actual TCP connection
 *     happens on first command, not at module load (so the API can boot
 *     even when Redis is down).
 *   - Retry strategy: exponential backoff capped at 2s, max 20 attempts before
 *     giving up (so we don't spam logs if Redis is misconfigured).
 *   - Error handling: 'error' events are logged but do NOT throw — callers
 *     must always wrap their calls in try/catch (or use the wrappers in
 *     cache.redis.ts / satelliteJobQueue.bullmq.ts which fall back gracefully).
 *   - Production-grade: connection name `vojas-api`, no offline queue
 *     (so we fail fast instead of buffering commands against a dead Redis).
 *
 * For local dev: just run `redis-server` (or `docker run -p 6379:6379 redis`).
 * For production: provision Upstash Redis (free tier works) and set REDIS_URL.
 */

import { Redis } from 'ioredis';
import type { Redis as RedisType } from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let client: RedisType | null = null;
let connectFailed = false;

/**
 * Returns a singleton Redis client. Safe to call multiple times.
 * The first call initiates the connection; subsequent calls return the
 * same instance. If the URL is unreachable, the client will keep trying
 * (per the retry strategy) and commands will throw — the wrappers
 * in cache.redis.ts / satelliteJobQueue.bullmq.ts catch those and
 * fall back to in-memory implementations.
 */
export function getRedis(): RedisType {
  if (client) return client;
  if (connectFailed) {
    // Avoid spamming connection attempts on every call after a hard fail.
    // Callers should still try/catch — this just makes the error obvious.
    throw new Error('Redis previously failed to connect; call resetRedis() to retry');
  }

  const instance = new Redis(REDIS_URL, {
    // Lazy connect: don't block import; first command triggers connect.
    lazyConnect: true,
    // Don't queue commands while disconnected — fail fast so callers
    // can fall back to in-memory instead of building up a backlog.
    enableOfflineQueue: false,
    // Cap reconnect attempts so we don't spam logs forever.
    maxRetriesPerRequest: 2,
    // Reasonable retry backoff for transient outages.
    retryStrategy(times: number): number | null {
      if (times > 20) {
        // Stop trying after ~20 attempts (cumulative ~1 minute).
        logger.error('[redis] Giving up after 20 reconnect attempts', { url: redact(REDIS_URL) });
        connectFailed = true;
        return null;
      }
      const delay = Math.min(50 * Math.pow(2, times), 2000);
      return delay;
    },
    // Reconnect on READONLY after a failover.
    reconnectOnError(err: Error): boolean {
      return err.message.includes('READONLY');
    },
    connectionName: 'vojas-api',
  });

  instance.on('connect', () => {
    logger.info('[redis] Connected', { url: redact(REDIS_URL) });
    connectFailed = false;
  });

  instance.on('ready', () => {
    logger.info('[redis] Ready');
  });

  instance.on('error', (err: Error) => {
    // Log but don't throw — wrappers must catch and fall back.
    logger.warn('[redis] Error', { error: err.message });
  });

  instance.on('close', () => {
    logger.warn('[redis] Connection closed');
  });

  instance.on('end', () => {
    logger.warn('[redis] Connection ended');
  });

  // Kick off the connection attempt.
  instance
    .connect()
    .then(() => {
      // Connected successfully.
    })
    .catch((err: Error) => {
      connectFailed = true;
      logger.warn('[redis] Initial connect failed; using lazy mode', { error: err.message });
      // Reset the failed flag after 30s so the next call can retry.
      setTimeout(() => {
        connectFailed = false;
      }, 30_000);
    });

  client = instance;
  return instance;
}

/**
 * Close the Redis connection. Call from graceful shutdown.
 * Safe to call when no connection exists.
 */
export async function closeRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    // Ignore errors during shutdown.
  } finally {
    client = null;
  }
}

/**
 * Test the connection. Used by the auto-detect in cache.ts / satelliteJobQueue.ts
 * to decide whether to use Redis or the in-memory fallback.
 *
 * Returns true if the ping succeeded within 1.5s, false otherwise.
 * Never throws.
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const c = getRedis();
    // Wait for ready state with a 1.5s timeout.
    if (c.status !== 'ready') {
      // Wait a bit for connect, but not forever.
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Redis not ready within 1.5s')), 1500);
        c.once('ready', () => {
          clearTimeout(t);
          resolve();
        });
        c.once('error', (err: Error) => {
          clearTimeout(t);
          reject(err);
        });
      });
    }
    const pong = await c.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.debug('[redis] isRedisAvailable check failed', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Force-reset the connection (useful for tests or after a config change).
 * Closes the current client and clears the singleton.
 */
export async function resetRedis(): Promise<void> {
  await closeRedis();
  connectFailed = false;
}

/**
 * Redact credentials from a Redis URL for logging.
 * redis://:password@host:port → redis://:***@host:port
 */
function redact(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url;
  }
}
