/**
 * Satellite routes — VOJAS 2.0 M5
 *
 * Endpoints:
 *   GET    /projects/:id/satellite           — availability + baseline + latest + count
 *   GET    /projects/:id/satellite/timeline  — weekly checkpoint timeline
 *   GET    /projects/:id/satellite/observations — list of real observations
 *   GET    /projects/:id/satellite/baseline  — baseline observation
 *   GET    /projects/:id/satellite/change    — pairwise change analyses
 *   POST   /projects/:id/satellite/sync      — enqueue sync job
 *   GET    /projects/:id/satellite/jobs/:jobId — get job status
 *   GET    /projects/:id/satellite/comparison — satellite vs reported progress
 *
 * Anti-fabrication contract: every response is honest about what is and
 * isn't available. NO_USABLE_OBSERVATION is a real status, not a failure.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError } from '@vojas/domain';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { success } from '../utils/apiResponse.js';
import { buildTimeline, compareProgress } from '../services/satelliteEOAnalysis.js';
import { satelliteJobQueue } from '../services/satelliteJobQueue.js';
import type { ReliabilityState } from '../services/satelliteJobQueue.js';
import { cdseService } from '../services/cdseService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const CUID_RE = /^c[a-z0-9]{20,}$/i;
function isValidProjectId(id: string): boolean {
  return typeof id === 'string' && CUID_RE.test(id);
}

function isValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

async function getProjectOrThrow(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      startDate: true,
      status: true,
      spentAmount: true,
      approvedAmount: true,
    },
  });
  if (!project) throw new NotFoundError('Project');
  const progressPercent = project.approvedAmount > 0
    ? Math.round((project.spentAmount / project.approvedAmount) * 100)
    : 0;
  return { ...project, progressPercent };
}

// ── GET /projects/:id/satellite — overall status ───────────────────────────────

router.get(
  '/projects/:id/satellite',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) {
        return success(res, { availability: 'NO_USABLE_OBSERVATION', reason: 'INVALID_PROJECT_ID' });
      }

      const project = await getProjectOrThrow(projectId);

      const hasCoords = project.latitude != null && project.longitude != null;
      // CDSE catalog search (dates, cloud cover, product ids, quicklook
      // imagery) is public and needs no credential. Only pixel-level
      // processing -- true-colour rendering cropped to the AOI, and NDVI /
      // NDBI / BSI computed from real bands -- requires CDSE_CLIENT_ID /
      // CDSE_CLIENT_SECRET. This route used to report AUTHENTICATION_REQUIRED
      // and hide all stored observations whenever those credentials were
      // absent, even though the catalog half of the pipeline works without
      // them. providerStatus below tells the truth about which tier is live.
      const pixelProcessingConfigured = cdseService.isConfigured();

      if (!hasCoords) {
        return success(res, {
          availability: 'NO_USABLE_OBSERVATION',
          reason: 'NO_COORDINATES',
          baseline: null,
          latest: null,
          observationCount: 0,
          window: null,
          message: 'Project has no latitude/longitude — cannot determine where to search for satellite imagery.',
          providerStatus: pixelProcessingConfigured ? 'CONFIGURED' : 'CATALOG_ONLY',
        });
      }

      const [observationCount, latest, baseline, jobsForProject] = await Promise.all([
        prisma.satelliteObservation.count({ where: { projectId } }),
        prisma.satelliteObservation.findFirst({
          where: { projectId },
          orderBy: { observationDate: 'desc' },
        }),
        prisma.satelliteObservation.findFirst({
          where: { projectId, selectionReason: 'BASELINE' },
        }),
        Promise.resolve(satelliteJobQueue.getJobsForProject(projectId)),
      ]);

      const runningJob = jobsForProject.find((j) => j.status === 'RUNNING' || j.status === 'PENDING' || j.status === 'RETRYING');
      const latestJob = jobsForProject[0];

      // Determine reliability state
      let reliabilityState: ReliabilityState = 'STALE';
      if (runningJob) {
        reliabilityState = 'PROCESSING';
      } else if (latestJob) {
        reliabilityState = latestJob.reliabilityState;
      } else if (observationCount > 0) {
        // Has observations but no recent job — check freshness
        const daysSince = latest
          ? Math.floor((Date.now() - latest.observationDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        reliabilityState = daysSince > 30 ? 'STALE' : 'AVAILABLE';
      } else {
        reliabilityState = 'NO_DATA';
      }

      const window = latest
        ? { start: new Date(latest.observationDate.getTime() - 14 * 86400000).toISOString(), end: new Date(latest.observationDate.getTime() + 14 * 86400000).toISOString() }
        : null;

      return success(res, {
        availability: observationCount > 0 ? 'AVAILABLE' : 'NO_USABLE_OBSERVATION',
        baseline: baseline ? {
          observationId: baseline.id,
          observationDate: baseline.observationDate.toISOString(),
          cloudCover: baseline.cloudCover,
          sourceUrl: baseline.sourceUrl,
        } : null,
        latest: latest ? {
          observationId: latest.id,
          observationDate: latest.observationDate.toISOString(),
          cloudCover: latest.cloudCover,
          sourceUrl: latest.sourceUrl,
        } : null,
        observationCount,
        window,
        reliabilityState,
        processingStatus: runningJob ? `PROCESSING:${runningJob.status}` : observationCount > 0 ? 'IDLE' : 'PENDING',
        jobId: runningJob?.jobId ?? null,
        providerStatus: pixelProcessingConfigured ? 'CONFIGURED' : 'CATALOG_ONLY',
        lastSyncAt: latestJob?.completedAt?.toISOString() ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/satellite/timeline ──────────────────────────────────────

router.get(
  '/projects/:id/satellite/timeline',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) {
        return success(res, { entries: [] });
      }
      await getProjectOrThrow(projectId);
      const entries = await buildTimeline(prisma, projectId);
      return success(res, { entries });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/satellite/observations ──────────────────────────────────

router.get(
  '/projects/:id/satellite/observations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) return success(res, { observations: [] });
      await getProjectOrThrow(projectId);
      const limit = Math.min(parseInt((req.query.limit as string) ?? '50'), 200);
      const observations = await prisma.satelliteObservation.findMany({
        where: { projectId },
        orderBy: { observationDate: 'desc' },
        take: limit,
      });
      return success(res, { observations });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/satellite/baseline ──────────────────────────────────────

router.get(
  '/projects/:id/satellite/baseline',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) {
        return success(res, { status: 'NO_USABLE_OBSERVATION', reason: 'INVALID_PROJECT_ID' });
      }
      const project = await getProjectOrThrow(projectId);
      const baseline = await prisma.satelliteObservation.findFirst({
        where: { projectId, selectionReason: 'BASELINE' },
      });

      if (!baseline) {
        return success(res, {
          status: 'BASELINE_UNAVAILABLE',
          reason: project.startDate ? 'NO_SCENE_AVAILABLE' : 'START_DATE_UNKNOWN',
          targetDate: project.startDate ?? null,
          methodology: 'Search ±90 days around project startDate for lowest-cloud-cover scene; store the result as the baseline observation.',
        });
      }

      return success(res, {
        status: 'AVAILABLE',
        observation: {
          id: baseline.id,
          sceneId: baseline.sceneId,
          observationDate: baseline.observationDate.toISOString(),
          cloudCover: baseline.cloudCover,
          satellite: baseline.satellite,
          sourceUrl: baseline.sourceUrl,
        },
        methodology: 'Lowest cloud cover Sentinel-2 L2A scene within ±90 days of project startDate.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/satellite/change ────────────────────────────────────────

router.get(
  '/projects/:id/satellite/change',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) return success(res, { comparisons: [] });
      await getProjectOrThrow(projectId);
      const comparisons = await prisma.satelliteAnalysis.findMany({
        where: { projectId },
        orderBy: { analysisDate: 'desc' },
        take: 50,
      });
      return success(res, { comparisons });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /projects/:id/satellite/sync — enqueue job ──────────────────────────

router.post(
  '/projects/:id/satellite/sync',
  authenticate,
  requirePermission('risk.trigger'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid project id' } });
      }
      const project = await getProjectOrThrow(projectId);

      if (!project.latitude || !project.longitude) {
        return success(res, { status: 'NO_COORDINATES', message: 'Project has no coordinates' });
      }
      // Sync runs the CDSE catalog search (public, no credential needed) to
      // populate weekly checkpoints and observations. It used to require
      // CDSE_CLIENT_ID/SECRET before enqueueing at all, which blocked catalog
      // ingestion for no reason — those credentials only gate the separate
      // pixel-processing path (NDVI/NDBI/true-colour rendering).

      const { jobId, status } = satelliteJobQueue.enqueue(projectId);
      return success(res, { status, jobId });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/satellite/jobs/:jobId ──────────────────────────────────

router.get(
  '/projects/:id/satellite/jobs/:jobId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobId = req.params.jobId as string;
      const projectId = req.params.id as string;
      const job = satelliteJobQueue.getJob(jobId);
      if (!job || job.projectId !== projectId) {
        return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
      }
      return success(res, {
        jobId: job.jobId,
        projectId: job.projectId,
        status: job.status,
        reliabilityState: job.reliabilityState,
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        retryCount: job.retryCount,
        lastRetryAt: job.lastRetryAt?.toISOString() ?? null,
        result: job.result,
        error: job.error,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/satellite/comparison — satellite vs reported progress ──

router.get(
  '/projects/:id/satellite/comparison',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidProjectId(projectId)) {
        return success(res, { status: 'INSUFFICIENT_DATA', message: 'Invalid project id' });
      }
      const project = await getProjectOrThrow(projectId);

      // Get latest BASELINE_VS_LATEST analysis
      const latestAnalysis = await prisma.satelliteAnalysis.findFirst({
        where: { projectId, analysisType: 'BASELINE_VS_LATEST' },
        orderBy: { analysisDate: 'desc' },
      });

      if (!latestAnalysis) {
        return success(res, {
          status: 'INSUFFICIENT_DATA',
          message: 'No satellite analysis available. Run a sync to generate change analyses.',
          reportedProgress: project.progressPercent ?? 0,
        });
      }

      const reported = project.progressPercent ?? 0;
      const comparison = compareProgress(
        reported,
        latestAnalysis.changeClassification as 'NO_OBSERVABLE_CHANGE' | 'LOW_OBSERVABLE_CHANGE' | 'MODERATE_OBSERVABLE_CHANGE' | 'HIGH_OBSERVABLE_CHANGE',
        latestAnalysis.confidence as 'LOW' | 'MEDIUM' | 'HIGH'
      );

      return success(res, {
        ...comparison,
        analysisId: latestAnalysis.id,
        baselineDate: latestAnalysis.baselineDate?.toISOString() ?? null,
        comparisonDate: latestAnalysis.comparisonDate?.toISOString() ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── Legacy: keep existing routes for backward compatibility ─────────────────

router.get(
  '/projects/:id/observations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!isValidProjectId(id)) return success(res, { observations: [] });
      await getProjectOrThrow(id);
      const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'))));
      const [observations, total] = await prisma.$transaction([
        prisma.satelliteObservation.findMany({
          where: { projectId: id },
          orderBy: { observationDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.satelliteObservation.count({ where: { projectId: id } }),
      ]);
      return success(res, {
        observations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/projects/:id/observations/:obsId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const obsId = req.params.obsId as string;
      const observation = await prisma.satelliteObservation.findUnique({
        where: { id: obsId },
      });
      if (!observation || observation.projectId !== id) {
        throw new NotFoundError('SatelliteObservation');
      }
      return success(res, observation);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/projects/:id/progress',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!isValidProjectId(id)) return success(res, { observations: [] });
      await getProjectOrThrow(id);
      const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'))));
      const [progress, total] = await prisma.$transaction([
        prisma.progressObservation.findMany({
          where: { projectId: id },
          orderBy: { reportDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.progressObservation.count({ where: { projectId: id } }),
      ]);
      return success(res, {
        observations: progress,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
