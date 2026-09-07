/**
 * In-process satellite job queue — VOJAS 2.0 M5
 *
 * Allows long-running satellite sync to be triggered without blocking the
 * HTTP request. The route returns immediately with { status: 'STARTED',
 * jobId } and the worker processes the job asynchronously.
 *
 * Features:
 * - Idempotency: skips if same project already has PENDING/RUNNING job
 * - Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
 * - Job persistence in memory (in-process); jobs survive hot-reload but NOT restart.
 * - Reliability state tracking: AVAILABLE / PROCESSING / NO_DATA / PROVIDER_ERROR / STALE
 *
 * Later this can be replaced with BullMQ + Redis without changing the
 * route handler — the API contract stays the same.
 */

import { prisma } from '@vojas/db';
import { syncProjectSatellite, type SyncResult } from './satelliteEOAnalysis.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

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

class SatelliteJobQueue {
  private jobs = new Map<string, Job>();
  private runningProjects = new Set<string>();

  enqueue(projectId: string): { jobId: string; status: 'STARTED' | 'ALREADY_RUNNING' } {
    if (this.runningProjects.has(projectId)) {
      for (const [id, job] of this.jobs.entries()) {
        if (job.projectId === projectId && (job.status === 'PENDING' || job.status === 'RUNNING' || job.status === 'RETRYING')) {
          return { jobId: id, status: 'ALREADY_RUNNING' };
        }
      }
    }

    const jobId = `sat-${projectId}-${Date.now()}`;
    const job: Job = {
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
    this.jobs.set(jobId, job);

    void this.process(jobId);
    return { jobId, status: 'STARTED' };
  }

  private async process(jobId: string, retryDelayMs = 0): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Retry backoff
    if (retryDelayMs > 0) {
      job.status = 'RETRYING';
      job.lastRetryAt = new Date();
      logger.info(`[sat-queue] Job ${jobId} scheduling retry #${job.retryCount + 1} in ${retryDelayMs}ms`);
      await sleep(retryDelayMs);
    }

    job.status = 'RUNNING';
    job.startedAt = job.startedAt ?? new Date();
    this.runningProjects.add(job.projectId);

    try {
      const result = await syncProjectSatellite(prisma, job.projectId);
      job.result = result;
      job.status = 'COMPLETED';
      job.reliabilityState = 'AVAILABLE';
      logger.info(`[sat-queue] Job ${jobId} completed: ${result.status}`, {
        jobId,
        projectId: job.projectId,
        observationsCreated: result.observationsCreated ?? 0,
        analysesCreated: result.analysesCreated ?? 0,
        checkpointsGenerated: result.checkpointsGenerated ?? 0,
        durationMs: job.completedAt ? Date.now() - job.startedAt.getTime() : undefined,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      job.error = errorMsg;
      logger.error(`[sat-queue] Job ${jobId} failed (attempt ${job.retryCount + 1}/${MAX_RETRIES}):`, {
        jobId,
        projectId: job.projectId,
        attempt: job.retryCount + 1,
        error: errorMsg,
      });

      // Determine if retryable
      const isNetworkError = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(errorMsg);
      const isProviderError = /AUTHENTICATION|unauthorized|token|401|403/i.test(errorMsg);

      if (isNetworkError && job.retryCount < MAX_RETRIES - 1) {
        job.retryCount++;
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, job.retryCount - 1);
        // Recursively retry with backoff
        return this.process(jobId, delay);
      } else if (isProviderError) {
        job.status = 'FAILED';
        job.reliabilityState = 'PROVIDER_ERROR';
      } else {
        job.status = 'FAILED';
        job.reliabilityState = 'STALE';
      }
    } finally {
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        job.completedAt = new Date();
        this.runningProjects.delete(job.projectId);
      }
    }
  }

  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) ?? null;
  }

  getJobsForProject(projectId: string): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.projectId === projectId);
  }

  /** Prune jobs older than 24h to prevent unbounded memory growth */
  pruneOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;
    for (const [id, job] of this.jobs.entries()) {
      const completedAt = job.completedAt?.getTime();
      if (completedAt && completedAt < cutoff) {
        this.jobs.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  /** Return reliability state for a project based on latest job and observations */
  async getReliabilityState(projectId: string): Promise<ReliabilityState> {
    const jobs = this.getJobsForProject(projectId);
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
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const satelliteJobQueue = new SatelliteJobQueue();
