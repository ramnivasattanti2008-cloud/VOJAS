/**
 * Satellite job queue — VOJAS 2.0 M19
 *
 * Dispatcher that routes to the BullMQ-backed queue when Redis is available,
 * and falls back to the in-process queue when Redis is unreachable.
 *
 * The decision is made once at startup (detectBackend) and stored in
 * `useBullMQ`. If Redis later becomes unavailable, the API continues using
 * BullMQ until next startup (at which point it will detect the failure and
 * fall back to in-process). This is intentional — a brief Redis outage
 * should not cause all in-flight jobs to be lost.
 *
 * API contract is identical to the M5 in-process queue — synchronous methods.
 * The BullMQ backend uses a local in-memory mirror so reads are O(1) sync calls.
 */

import { isRedisAvailable, reportRedisDetectionResult } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { queue as bullmqQueue } from './satelliteJobQueue.bullmq.js';
import { inProcessQueue } from './satelliteJobQueue.inprocess.js';

// Re-export types so callers can import from here without knowing which backend is active.
export type { Job, JobStatus, ReliabilityState } from './satelliteJobQueue.inprocess.js';
import type { Job, ReliabilityState } from './satelliteJobQueue.inprocess.js';

// ── Backend detection ──────────────────────────────────────────────────────────

let useBullMQ = false;
let detected = false;

async function detectBackend(): Promise<void> {
  if (detected) return;
  detected = true;

  const available = await isRedisAvailable();
  if (available) {
    useBullMQ = true;
    logger.info('[sat-queue] Backend: BullMQ + Redis (production-grade)');
  } else {
    useBullMQ = false;
    logger.warn('[sat-queue] Backend: in-process (Redis unavailable — set REDIS_URL for production)');
  }
  reportRedisDetectionResult(useBullMQ);
}

// Kick off detection eagerly so the first enqueue() doesn't block.
void detectBackend();

// ── Dispatcher ─────────────────────────────────────────────────────────────────

export const satelliteJobQueue = {
  enqueue(projectId: string): { jobId: string; status: 'STARTED' | 'ALREADY_RUNNING' } {
    if (useBullMQ) {
      try {
        return bullmqQueue.enqueue(projectId);
      } catch (err) {
        logger.warn('[sat-queue] BullMQ enqueue failed, falling back to in-process', {
          projectId,
          error: err instanceof Error ? err.message : String(err),
        });
        useBullMQ = false;
      }
    }
    return inProcessQueue.enqueue(projectId);
  },

  getJob(jobId: string): Job | null {
    if (useBullMQ) {
      return bullmqQueue.getJob(jobId);
    }
    return inProcessQueue.getJob(jobId);
  },

  getJobsForProject(projectId: string): Job[] {
    if (useBullMQ) {
      return bullmqQueue.getJobsForProject(projectId);
    }
    return inProcessQueue.getJobsForProject(projectId);
  },

  getAllJobs(): Job[] {
    if (useBullMQ) {
      return bullmqQueue.getAllJobs();
    }
    return inProcessQueue.getAllJobs();
  },

  pruneOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): number {
    // pruneOldJobs is always async in BullMQ (needs Redis I/O).
    // We await inline via a sync wrapper to preserve the original sync contract.
    if (useBullMQ) {
      let result = 0;
      bullmqQueue.pruneOldJobs(maxAgeMs).then((n) => { result = n; }).catch((err) => {
        logger.warn('[sat-queue] BullMQ pruneOldJobs failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        result = inProcessQueue.pruneOldJobs(maxAgeMs);
      });
      return result;
    }
    return inProcessQueue.pruneOldJobs(maxAgeMs);
  },

  /**
   * Return reliability state for a project. Delegates to whichever backend
   * is active; the in-process queue handles this internally.
   */
  async getReliabilityState(projectId: string): Promise<ReliabilityState> {
    if (useBullMQ) {
      try {
        return await bullmqQueue.getReliabilityState(projectId);
      } catch (err) {
        logger.warn('[sat-queue] BullMQ getReliabilityState failed, falling back to in-process', {
          projectId,
          error: err instanceof Error ? err.message : String(err),
        });
        useBullMQ = false;
      }
    }
    return inProcessQueue.getReliabilityState(projectId);
  },
};
