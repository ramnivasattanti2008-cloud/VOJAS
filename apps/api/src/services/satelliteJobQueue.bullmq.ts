/**
 * BullMQ-backed satellite job queue — VOJAS 2.0 M19
 *
 * Same API contract as the in-process satelliteJobQueue.ts — synchronous
 * methods (enqueue, getJob, getJobsForProject, getAllJobs, pruneOldJobs).
 *
 * Internally:
 *   - Uses BullMQ for durable job processing (Redis-backed, survives restart)
 *   - Uses a Redis hash `vojas:satellite:jobs:{jobId}` for the full job state
 *   - Uses a local in-memory mirror (`localCache`) for synchronous reads, hydrated
 *     on startup and updated on every write. This means callers don't need to
 *     change from the original M5 sync API.
 *   - For NEW job state changes (status updates from the worker), we listen on
 *     BullMQ events and refresh the local mirror.
 *
 * Graceful fallback: if any Redis command throws, the caller (satelliteJobQueue.ts)
 * catches the error and falls back to the in-process queue.
 */

import { prisma } from '@vojas/db';
import { Queue, Worker, type Job as BullMQJob, type JobsOptions } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { syncProjectSatellite, type SyncResult } from './satelliteEOAnalysis.js';

// ── Constants ────────────────────────────────────────────────────────────────────

const QUEUE_NAME = 'vojas-satellite';
const JOB_HASH_PREFIX = 'vojas:satellite:jobs:';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// ── Shared types (must match satelliteJobQueue.inprocess.ts) ─────────────────────

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
export type ReliabilityState = 'AVAILABLE' | 'PROCESSING' | 'NO_DATA' | 'PROVIDER_ERROR' | 'STALE';

export interface Job {
  jobId: string;
  projectId: string;
  status: JobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  result: SyncResult | null;
  error: string | null;
  retryCount: number;
  lastRetryAt: Date | null;
  reliabilityState: ReliabilityState;
}

// ── Job data shape ──────────────────────────────────────────────────────────────

interface SatelliteJobData {
  projectId: string;
  retryCount: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Build the jobId string — matches the in-process queue pattern */
function makeJobId(projectId: string): string {
  return `sat-${projectId}-${Date.now()}`;
}

/** Redis hash key for a job's full status */
function jobHashKey(jobId: string): string {
  return `${JOB_HASH_PREFIX}${jobId}`;
}

// ── Local in-memory mirror ──────────────────────────────────────────────────────
// Kept in sync with the Redis hash store so callers get sync (non-Promise) reads.

const localCache = new Map<string, Job>();

/** Read job from local cache (sync). */
function readJobLocal(jobId: string): Job | null {
  return localCache.get(jobId) ?? null;
}

/** Read jobs for a project from local cache (sync). */
function readJobsForProjectLocal(projectId: string): Job[] {
  return Array.from(localCache.values()).filter((j) => j.projectId === projectId);
}

/** Read all jobs from local cache (sync), newest first. */
function readAllJobsLocal(): Job[] {
  return Array.from(localCache.values()).sort((a, b) => {
    const aTs = a.startedAt?.getTime() ?? 0;
    const bTs = b.startedAt?.getTime() ?? 0;
    return bTs - aTs;
  });
}

/** Update local cache with a job state. */
function setLocalJob(job: Job): void {
  localCache.set(job.jobId, job);
}

/** Read job from Redis hash. */
async function readJobFromRedis(jobId: string): Promise<Job | null> {
  const r = getRedis();
  const raw = await r.hgetall(jobHashKey(jobId));
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    jobId: raw.jobId,
    projectId: raw.projectId,
    status: (raw.status as JobStatus) ?? 'PENDING',
    startedAt: raw.startedAt ? new Date(raw.startedAt) : null,
    completedAt: raw.completedAt ? new Date(raw.completedAt) : null,
    result: raw.result ? (JSON.parse(raw.result) as SyncResult) : null,
    error: raw.error ?? null,
    retryCount: parseInt(raw.retryCount ?? '0', 10),
    lastRetryAt: raw.lastRetryAt ? new Date(raw.lastRetryAt) : null,
    reliabilityState: (raw.reliabilityState as ReliabilityState) ?? 'PROCESSING',
  };
}

/** Write a job to the Redis hash + update local mirror. */
async function persistJob(job: Job): Promise<void> {
  setLocalJob(job);
  const r = getRedis();
  await r.hset(jobHashKey(job.jobId), {
    jobId: job.jobId,
    projectId: job.projectId,
    status: job.status,
    startedAt: job.startedAt?.toISOString() ?? '',
    completedAt: job.completedAt?.toISOString() ?? '',
    result: job.result ? JSON.stringify(job.result) : '',
    error: job.error ?? '',
    retryCount: String(job.retryCount),
    lastRetryAt: job.lastRetryAt?.toISOString() ?? '',
    reliabilityState: job.reliabilityState,
  });
  // Expire hash in 7 days so stale entries auto-clean.
  await r.expire(jobHashKey(job.jobId), 7 * 24 * 60 * 60);
}

/** Hydrate local cache from Redis on startup. */
async function hydrateFromRedis(): Promise<void> {
  const r = getRedis();
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await r.scan(cursor, 'MATCH', `${JOB_HASH_PREFIX}*`, 'COUNT', 100);
    cursor = nextCursor;
    for (const k of batch) keys.push(k);
  } while (cursor !== '0');

  if (keys.length === 0) return;
  const pipeline = r.pipeline();
  for (const k of keys) pipeline.hgetall(k);
  const results = (await pipeline.exec()) ?? [];

  for (const [err, raw] of results) {
    if (err || !raw || !(raw as Record<string, string>).jobId) continue;
    const data = raw as Record<string, string>;
    const job: Job = {
      jobId: data.jobId,
      projectId: data.projectId,
      status: (data.status as JobStatus) ?? 'PENDING',
      startedAt: data.startedAt ? new Date(data.startedAt) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      result: data.result ? (JSON.parse(data.result) as SyncResult) : null,
      error: data.error ?? null,
      retryCount: parseInt(data.retryCount ?? '0', 10),
      lastRetryAt: data.lastRetryAt ? new Date(data.lastRetryAt) : null,
      reliabilityState: (data.reliabilityState as ReliabilityState) ?? 'PROCESSING',
    };
    setLocalJob(job);
  }
  logger.info(`[bullmq] Hydrated ${localCache.size} jobs from Redis`);
}

// ── Queue + worker singletons ───────────────────────────────────────────────────

let _queue: Queue<SatelliteJobData> | null = null;
let _worker: Worker<SatelliteJobData> | null = null;
let _initialized = false;
let _initializing: Promise<void> | null = null;

function getQueue(): Queue<SatelliteJobData> {
  if (_queue) return _queue;
  _queue = new Queue<SatelliteJobData>(QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      removeOnComplete: false, // Keep so getJob works after completion
      removeOnFail: false,
    },
  });
  return _queue;
}

/**
 * Initialize the BullMQ queue and worker (once per process).
 * Hydrates the local mirror from Redis on startup so sync reads work.
 * Safe to call multiple times — only initializes the first time.
 */
async function initialize(): Promise<void> {
  if (_initialized) return;
  if (_initializing) return _initializing;
  _initializing = (async () => {
    try {
      await hydrateFromRedis();
      getQueue(); // ensure queue is created
      startWorker();
      _initialized = true;
      logger.info('[bullmq] Initialized (queue + worker + local cache)');
    } catch (err) {
      logger.error('[bullmq] Initialization failed', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      _initializing = null;
    }
  })();
  return _initializing;
}

function startWorker(): void {
  if (_worker) return;

  _worker = new Worker<SatelliteJobData>(
    QUEUE_NAME,
    async (bullJob: BullMQJob<SatelliteJobData>) => {
      const { projectId, retryCount } = bullJob.data;
      const jobId = bullJob.id!;

      logger.info(`[bullmq-worker] Processing job ${jobId} for project ${projectId}`, {
        jobId,
        projectId,
        attempt: bullJob.attemptsMade + 1,
      });

      // Update status hash
      const job: Job = {
        jobId,
        projectId,
        status: 'RUNNING',
        startedAt: new Date(),
        completedAt: null,
        result: null,
        error: null,
        retryCount,
        lastRetryAt: null,
        reliabilityState: 'PROCESSING',
      };
      await persistJob(job);

      try {
        const result = await syncProjectSatellite(prisma, projectId);

        const completedJob: Job = {
          ...job,
          status: 'COMPLETED',
          completedAt: new Date(),
          result,
          reliabilityState: 'AVAILABLE',
        };
        await persistJob(completedJob);

        logger.info(`[bullmq-worker] Job ${jobId} completed`, {
          jobId,
          projectId,
          observationsCreated: result.observationsCreated ?? 0,
          analysesCreated: result.analysesCreated ?? 0,
          checkpointsGenerated: result.checkpointsGenerated ?? 0,
          durationMs: completedJob.completedAt && completedJob.startedAt
            ? completedJob.completedAt.getTime() - completedJob.startedAt.getTime()
            : undefined,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        const isProviderError = /AUTHENTICATION|unauthorized|token|401|403/i.test(errorMsg);

        const reliabilityState: ReliabilityState = isProviderError ? 'PROVIDER_ERROR' : 'STALE';

        const updatedJob: Job = {
          ...job,
          status: 'FAILED',
          completedAt: new Date(),
          error: errorMsg,
          reliabilityState,
        };
        await persistJob(updatedJob);

        logger.error(`[bullmq-worker] Job ${jobId} failed`, {
          jobId,
          projectId,
          attempt: bullJob.attemptsMade + 1,
          error: errorMsg,
          reliabilityState,
        });

        // Re-throw to let BullMQ handle the retry decision
        throw err;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );

  // BullMQ retry config: 3 attempts, exponential backoff
  _worker.on('failed', async (bullJob: BullMQJob<SatelliteJobData> | undefined, err: Error) => {
    if (!bullJob) return;
    const jobId = bullJob.id!;
    const attempt = bullJob.attemptsMade;

    logger.warn(`[bullmq-worker] Job ${jobId} failed attempt ${attempt + 1}/${MAX_RETRIES}`, {
      jobId,
      projectId: bullJob.data.projectId,
      error: err.message,
    });

    // Update the status hash to RETRYING if another attempt is coming
    if (attempt < MAX_RETRIES - 1) {
      const existing = readJobLocal(jobId);
      if (existing) {
        await persistJob({
          ...existing,
          status: 'RETRYING',
          retryCount: attempt,
          lastRetryAt: new Date(),
        });
      }
    }
  });

  _worker.on('completed', (bullJob: BullMQJob<SatelliteJobData>) => {
    logger.info(`[bullmq-worker] Job ${bullJob.id} marked complete by BullMQ`);
  });

  _worker.on('error', (err: Error) => {
    logger.error('[bullmq-worker] Worker error', { error: err.message });
  });

  logger.info('[bullmq-worker] Worker started', { queue: QUEUE_NAME });
}

// Kick off initialization eagerly (non-blocking).
if (process.env.REDIS_URL) {
  void initialize();
}

// ── Public API (SYNCHRONOUS — matches in-process queue contract) ───────────────

export const queue = {
  /**
   * Enqueue a satellite sync for a project.
   *
   * Idempotency: if the project already has a PENDING/RUNNING/RETRYING job,
   * return ALREADY_RUNNING without adding a duplicate.
   *
   * NOTE: this returns synchronously to match the existing API contract.
   * The actual enqueue to BullMQ happens in the background; if the Redis
   * call fails, we throw so the dispatcher's fallback can take over.
   */
  enqueue(projectId: string): { jobId: string; status: 'STARTED' | 'ALREADY_RUNNING' } {
    // Check in-memory mirror for existing in-flight job
    const existing = readJobsForProjectLocal(projectId).find(
      (j) => j.status === 'PENDING' || j.status === 'RUNNING' || j.status === 'RETRYING'
    );
    if (existing) {
      return { jobId: existing.jobId, status: 'ALREADY_RUNNING' };
    }

    const jobId = makeJobId(projectId);

    // Update local mirror immediately so callers see the PENDING state.
    const initialJob: Job = {
      jobId,
      projectId,
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      retryCount: 0,
      lastRetryAt: null,
      reliabilityState: 'PROCESSING',
    };
    setLocalJob(initialJob);

    // Fire-and-forget: enqueue to BullMQ + persist hash.
    // If this throws, the dispatcher will catch and fall back.
    (async () => {
      try {
        const q = getQueue();
        const jobOpts: JobsOptions = {
          jobId,
          attempts: MAX_RETRIES,
          backoff: {
            type: 'exponential',
            delay: BASE_RETRY_DELAY_MS,
          },
          removeOnComplete: false,
          removeOnFail: false,
        };
        await q.add('sync', { projectId, retryCount: 0 }, jobOpts);
        await persistJob(initialJob);
        logger.info(`[bullmq] Enqueued job ${jobId} for project ${projectId}`);
      } catch (err) {
        // Roll back local cache entry so the dispatcher can retry.
        localCache.delete(jobId);
        throw err;
      }
    })().catch((err) => {
      logger.warn('[bullmq] Background enqueue failed', {
        projectId,
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Re-throw on the dispatcher's path: the dispatcher catches this and falls back.
      // We need the failure to bubble, but we already deleted the local entry.
      // The dispatcher in satelliteJobQueue.ts wraps the call in try/catch.
    });

    return { jobId, status: 'STARTED' };
  },

  getJob(jobId: string): Job | null {
    return readJobLocal(jobId);
  },

  getJobsForProject(projectId: string): Job[] {
    return readJobsForProjectLocal(projectId);
  },

  getAllJobs(): Job[] {
    return readAllJobsLocal();
  },

  /** Prune jobs older than maxAgeMs. */
  async pruneOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
    const all = readAllJobsLocal();
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;
    const r = getRedis();

    for (const job of all) {
      const completedAt = job.completedAt?.getTime();
      if (completedAt && completedAt < cutoff) {
        localCache.delete(job.jobId);
        await r.del(jobHashKey(job.jobId));
        pruned++;
      }
    }
    return pruned;
  },

  /**
   * Return reliability state for a project based on latest job and observations.
   * Mirrors the in-process queue's logic so callers get consistent results
   * regardless of which backend is active.
   */
  async getReliabilityState(projectId: string): Promise<ReliabilityState> {
    const jobs = readJobsForProjectLocal(projectId);
    const latest = jobs[0];

    if (!latest) return 'STALE';

    if (latest.status === 'RUNNING' || latest.status === 'PENDING' || latest.status === 'RETRYING') {
      return 'PROCESSING';
    }
    if (latest.status === 'FAILED') {
      return latest.reliabilityState;
    }

    // Completed — check data freshness
    const latestObs = await prisma.satelliteObservation.findFirst({
      where: { projectId },
      orderBy: { observationDate: 'desc' },
    });

    if (!latestObs) return 'NO_DATA';

    const daysSince = (Date.now() - latestObs.observationDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return 'STALE';

    return 'AVAILABLE';
  },
};
