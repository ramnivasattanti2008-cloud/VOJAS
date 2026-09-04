/**
 * Change Analysis routes — M7
 *
 * Endpoints:
 *   GET  /projects/:id/analysis                      — list analyses for project
 *   GET  /projects/:id/analysis/:analysisId           — get one analysis
 *   GET  /projects/:id/analysis/:analysisId/methodology — get methodology + limitations
 *   GET  /projects/:id/analysis/:analysisId/evidence  — get evidence package
 *   GET  /projects/:id/analysis/:analysisId/map       — get change map metadata
 *   POST /projects/:id/analysis/run                  — trigger new analysis (ADMIN/OFFICER/ANALYST)
 *   GET  /projects/:id/analysis/:analysisId/job       — poll job status
 *   GET  /projects/:id/analysis/latest               — most recent analysis
 *
 * Anti-fabrication: every response honestly reports what was computed or why
 * analysis was not possible. AUTHENTICATION_REQUIRED and INSUFFICIENT_DATA are
 * real statuses, not failures.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ForbiddenError } from '@vojas/domain';
import { authenticate } from '../middleware/auth';
import { success } from '../utils/apiResponse';
import { changeAnalysisJobQueue } from '../services/changeAnalysisJobQueue.js';
import type { ChangeClassification, Confidence } from '../services/changeAnalysisEngine.js';

const router = Router();

const CUID_RE = /^c[a-z0-9]{20,}$/i;
function isValidId(id: string): boolean {
  return typeof id === 'string' && CUID_RE.test(id);
}

// ── GET /projects/:id/analysis — list analyses ─────────────────────────────

router.get(
  '/projects/:id/analysis',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidId(projectId)) {
        return success(res, { analyses: [], message: 'Invalid project ID' });
      }

      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!project) throw new NotFoundError('Project');

      const limit = Math.min(parseInt((req.query.limit as string) ?? '20'), 100);
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = { projectId };
      if (status) where.processingStatus = status;

      const analyses = await prisma.changeAnalysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          observationBefore: { select: { id: true, observationDate: true, cloudCover: true, satellite: true } },
          observationAfter: { select: { id: true, observationDate: true, cloudCover: true, satellite: true } },
        },
      });

      return success(res, { analyses });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/latest ─────────────────────────────────────

router.get(
  '/projects/:id/analysis/latest',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidId(projectId)) {
        return success(res, { status: 'NOT_FOUND', analysis: null });
      }

      const latest = await prisma.changeAnalysis.findFirst({
        where: { projectId, processingStatus: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        include: {
          observationBefore: { select: { id: true, observationDate: true, cloudCover: true, satellite: true, sceneId: true } },
          observationAfter: { select: { id: true, observationDate: true, cloudCover: true, satellite: true, sceneId: true } },
        },
      });

      if (!latest) {
        return success(res, { status: 'NO_ANALYSIS', message: 'No completed change analysis found for this project.' });
      }

      return success(res, { status: 'FOUND', analysis: latest });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/:analysisId ────────────────────────────────

router.get(
  '/projects/:id/analysis/:analysisId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: projectId, analysisId } = req.params as { id: string; analysisId: string };
      if (!isValidId(projectId) || !isValidId(analysisId)) {
        return success(res, { analysis: null, message: 'Invalid ID format' });
      }

      const analysis = await prisma.changeAnalysis.findFirst({
        where: { id: analysisId, projectId },
        include: {
          observationBefore: { select: { id: true, observationDate: true, cloudCover: true, satellite: true, sceneId: true, sourceUrl: true } },
          observationAfter: { select: { id: true, observationDate: true, cloudCover: true, satellite: true, sceneId: true, sourceUrl: true } },
        },
      });

      if (!analysis) throw new NotFoundError('ChangeAnalysis');

      return success(res, { analysis });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/:analysisId/methodology ──────────────────

router.get(
  '/projects/:id/analysis/:analysisId/methodology',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: projectId, analysisId } = req.params as { id: string; analysisId: string };
      if (!isValidId(projectId) || !isValidId(analysisId)) {
        return success(res, { methodology: null });
      }

      const analysis = await prisma.changeAnalysis.findFirst({
        where: { id: analysisId, projectId },
        select: {
          methodology: true,
          limitations: true,
          confidenceFactors: true,
          algorithmVersion: true,
          runParameters: true,
          provider: true,
          analysisType: true,
          primarySignal: true,
          sector: true,
          geometryType: true,
          analysisBufferM: true,
        },
      });

      if (!analysis) throw new NotFoundError('ChangeAnalysis');

      return success(res, {
        methodology: {
          ...analysis,
          algorithmVersion: analysis.algorithmVersion,
          confidenceFactors: analysis.confidenceFactors,
          runParameters: analysis.runParameters,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/:analysisId/evidence ──────────────────────

router.get(
  '/projects/:id/analysis/:analysisId/evidence',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: projectId, analysisId } = req.params as { id: string; analysisId: string };
      if (!isValidId(projectId) || !isValidId(analysisId)) {
        return success(res, { evidence: null });
      }

      const analysis = await prisma.changeAnalysis.findFirst({
        where: { id: analysisId, projectId },
        select: {
          evidencePackage: true,
          changeRegions: true,
          observationBefore: { select: { id: true, observationDate: true, satellite: true, sourceUrl: true } },
          observationAfter: { select: { id: true, observationDate: true, satellite: true, sourceUrl: true } },
        },
      });

      if (!analysis) throw new NotFoundError('ChangeAnalysis');

      return success(res, {
        evidence: {
          evidencePackage: analysis.evidencePackage,
          changeRegions: analysis.changeRegions,
          beforeObservation: analysis.observationBefore,
          afterObservation: analysis.observationAfter,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/:analysisId/map ────────────────────────────

router.get(
  '/projects/:id/analysis/:analysisId/map',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: projectId, analysisId } = req.params as { id: string; analysisId: string };
      if (!isValidId(projectId) || !isValidId(analysisId)) {
        return success(res, { map: null });
      }

      const analysis = await prisma.changeAnalysis.findFirst({
        where: { id: analysisId, projectId },
        select: {
          changeRegions: true,
          geometryRef: true,
          totalAreaM2: true,
          changedAreaM2: true,
          changePercent: true,
          changeClassification: true,
          confidence: true,
        },
      });

      if (!analysis) throw new NotFoundError('ChangeAnalysis');

      // Return map metadata so the frontend can render a change layer
      return success(res, {
        map: {
          regions: analysis.changeRegions,
          geometryRef: analysis.geometryRef,
          totalAreaM2: analysis.totalAreaM2,
          changedAreaM2: analysis.changedAreaM2,
          changePercent: analysis.changePercent,
          classification: analysis.changeClassification,
          confidence: analysis.confidence,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /projects/:id/analysis/run — trigger new analysis ──────────────

router.post(
  '/projects/:id/analysis/run',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidId(projectId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid project ID' } });
      }

      const user = (req as Request & { user?: { role?: string } }).user;
      const role = user?.role ?? 'CITIZEN';
      if (!['ADMIN', 'OFFICER', 'ANALYST'].includes(role)) {
        throw new ForbiddenError('Insufficient role to trigger change analysis');
      }

      const { observationBeforeId, observationAfterId, sector, primarySignal } = req.body as {
        observationBeforeId?: string;
        observationAfterId?: string;
        sector?: string;
        primarySignal?: string;
      };

      if (!observationBeforeId || !observationAfterId) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_OBSERVATION_IDS', message: 'observationBeforeId and observationAfterId are required' } });
      }

      // Validate observations belong to this project
      const [beforeObs, afterObs] = await Promise.all([
        prisma.satelliteObservation.findUnique({ where: { id: observationBeforeId }, select: { id: true, projectId: true, observationDate: true } }),
        prisma.satelliteObservation.findUnique({ where: { id: observationAfterId }, select: { id: true, projectId: true, observationDate: true } }),
      ]);

      if (!beforeObs || beforeObs.projectId !== projectId) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_OBSERVATION', message: 'observationBeforeId not found or does not belong to this project' } });
      }
      if (!afterObs || afterObs.projectId !== projectId) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_OBSERVATION', message: 'observationAfterId not found or does not belong to this project' } });
      }
      if (beforeObs.observationDate > afterObs.observationDate) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ORDER', message: 'observationBeforeId must be before observationAfterId' } });
      }

      // Get project sector
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { sector: true },
      });

      const effectiveSector = sector ?? project?.sector ?? 'GENERAL';
      const effectiveSignal = primarySignal ?? null;

      const { jobId, status } = changeAnalysisJobQueue.enqueue(
        projectId,
        observationBeforeId,
        observationAfterId,
        { sector: effectiveSector, analysisType: effectiveSignal ?? undefined }
      );

      return success(res, { status: 'QUEUED', jobId, message: 'Change analysis job enqueued' });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/:analysisId/job ───────────────────────────

router.get(
  '/projects/:id/analysis/:analysisId/job',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisId } = req.params as { analysisId: string };
      if (!isValidId(analysisId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ID' } });
      }

      // Find the job by analysis ID
      const analysis = await prisma.changeAnalysis.findUnique({
        where: { id: analysisId },
        select: { jobId: true, processingStatus: true, createdAt: true },
      });

      if (!analysis) throw new NotFoundError('ChangeAnalysis');

      // Get job from queue if still running
      const job = analysis.jobId ? changeAnalysisJobQueue.getJob(analysis.jobId) : null;

      return success(res, {
        jobId: analysis.jobId,
        status: job?.status ?? analysis.processingStatus,
        startedAt: job?.startedAt?.toISOString() ?? null,
        completedAt: job?.completedAt?.toISOString() ?? null,
        result: job?.result ?? null,
        error: job?.error ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /projects/:id/analysis/history ─────────────────────────────────

router.get(
  '/projects/:id/analysis/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      if (!isValidId(projectId)) return success(res, { history: [] });

      // Get all completed analyses with observation dates, ordered chronologically
      const analyses = await prisma.changeAnalysis.findMany({
        where: { projectId, processingStatus: 'COMPLETED' },
        orderBy: { baselineDate: 'asc' },
        select: {
          id: true,
          analysisDate: true,
          baselineDate: true,
          comparisonDate: true,
          changeClassification: true,
          changePercent: true,
          confidence: true,
          primarySignal: true,
          provider: true,
          ndviDelta: true,
          ndbiDelta: true,
        },
      });

      return success(res, { history: analyses });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
