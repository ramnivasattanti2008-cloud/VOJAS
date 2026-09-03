/**
 * In-process satellite job queue — VOJAS 2.0 M5
 *
 * Allows long-running satellite sync to be triggered without blocking the
 * HTTP request. The route returns immediately with { status: 'STARTED',
 * jobId } and the worker processes the job asynchronously.
 *
 * Later this can be replaced with BullMQ + Redis without changing the
 * route handler — the API contract stays the same.
 */

import { prisma } from '@vojas/db';
import { syncProjectSatellite, type SyncResult } from './satelliteEOAnalysis.js';
import { logger } from '../utils/logger.js';

interface Job {
  jobId: string;
  projectId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: Date | null;
  completedAt: Date | null;
  result: SyncResult | null;
  error: string | null;
}

class SatelliteJobQueue {
  private jobs = new Map<string, Job>();
  private runningProjects = new Set<string>();

  enqueue(projectId: string): { jobId: string; status: 'STARTED' | 'ALREADY_RUNNING' } {
    if (this.runningProjects.has(projectId)) {
      // Find existing pending/running job for this project
      for (const [id, job] of this.jobs.entries()) {
        if (job.projectId === projectId && (job.status === 'PENDING' || job.status === 'RUNNING')) {
          return { jobId: id, status: 'ALREADY_RUNNING' };
        }
      }
    }

    const jobId = `sat-${projectId}-${Date.now()}`;
    this.jobs.set(jobId, {
      jobId,
      projectId,
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    });

    // Fire and forget — async processing
    void this.process(jobId);

    return { jobId, status: 'STARTED' };
  }

  private async process(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'RUNNING';
    job.startedAt = new Date();
    this.runningProjects.add(job.projectId);

    try {
      const result = await syncProjectSatellite(prisma, job.projectId);
      job.result = result;
      job.status = 'COMPLETED';
    } catch (err) {
      logger.error(`[satellite-queue] Job ${jobId} failed:`, { error: String(err) });
      job.status = 'FAILED';
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      job.completedAt = new Date();
      this.runningProjects.delete(job.projectId);
    }
  }

  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) ?? null;
  }

  getJobsForProject(projectId: string): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.projectId === projectId);
  }
}

export const satelliteJobQueue = new SatelliteJobQueue();
