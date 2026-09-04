/**
 * Change Analysis Job Queue — M7
 *
 * In-memory async queue for change analysis jobs.
 * Tracks: QUEUED → PROCESSING → COMPLETED | FAILED | INSUFFICIENT_DATA
 *
 * Jobs are stored in-memory and lost on restart (acceptable for a free-tier deploy).
 * For production, swap this for BullMQ / Redis.
 */

import { prisma } from '@vojas/db';
import { getChangeAnalysisEngine } from './changeAnalysisEngine.js';
import { logger } from '../utils/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INSUFFICIENT_DATA';

export interface ChangeAnalysisJob {
  jobId: string;
  projectId: string;
  observationBeforeId: string;
  observationAfterId: string;
  status: JobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  result: unknown;
  error: string | null;
}

// ── Queue ──────────────────────────────────────────────────────────────────

class ChangeAnalysisJobQueue {
  private jobs = new Map<string, ChangeAnalysisJob>();
  private running = 0;
  private readonly maxConcurrent = parseInt(process.env.MAX_CONCURRENT_ANALYSIS_JOBS ?? '3');
  private readonly pollIntervalMs = 5000;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  enqueue(
    projectId: string,
    observationBeforeId: string,
    observationAfterId: string,
    options?: { sector?: string; analysisType?: string }
  ): { jobId: string; status: JobStatus } {
    const jobId = `change-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const job: ChangeAnalysisJob = {
      jobId,
      projectId,
      observationBeforeId,
      observationAfterId,
      status: 'QUEUED',
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    };

    this.jobs.set(jobId, job);
    logger.info(`[change-analysis-queue] Enqueued job ${jobId} for project ${projectId}`);

    // Start processing if below limit
    this.processNext();

    return { jobId, status: 'QUEUED' };
  }

  getJob(jobId: string): ChangeAnalysisJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobsForProject(projectId: string): ChangeAnalysisJob[] {
    return [...this.jobs.values()].filter((j) => j.projectId === projectId);
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrent) return;

    const queued = [...this.jobs.values()].find((j) => j.status === 'QUEUED');
    if (!queued) return;

    this.running++;
    queued.status = 'PROCESSING';
    queued.startedAt = new Date();

    logger.info(`[change-analysis-queue] Processing job ${queued.jobId} (${this.running}/${this.maxConcurrent} concurrent)`);

    const engine = getChangeAnalysisEngine(prisma);

    // Run in background — don't await indefinitely
    engine.run({
      projectId: queued.projectId,
      observationBeforeId: queued.observationBeforeId,
      observationAfterId: queued.observationAfterId,
      jobId: queued.jobId,
    })
      .then((result) => {
        queued.status = 'COMPLETED';
        queued.completedAt = new Date();
        queued.result = result;
        logger.info(`[change-analysis-queue] Job ${queued.jobId} completed: classification=${result.changeClassification}`);
      })
      .catch((err) => {
        queued.status = 'FAILED';
        queued.completedAt = new Date();
        queued.error = err instanceof Error ? err.message : String(err);
        logger.error(`[change-analysis-queue] Job ${queued.jobId} failed`, { error: queued.error });
      })
      .finally(() => {
        this.running--;
        this.processNext(); // Process next queued job
      });
  }
}

// Singleton
export const changeAnalysisJobQueue = new ChangeAnalysisJobQueue();
