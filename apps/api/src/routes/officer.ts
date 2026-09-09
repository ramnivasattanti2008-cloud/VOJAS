import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { UserRole, PERMISSIONS } from '@vojas/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();

/**
 * GET /officer/dashboard/stats — Officer dashboard statistics
 */
router.get('/dashboard/stats', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get case counts from anomalies and risk findings
    const [criticalCases, highPriority, mediumPriority, lowPriority, newFindings, overdueCases, unresolvedCases, recentEvidenceAdded, systemDataIssues] = await Promise.all([
      // Critical cases (anomalies + risk findings)
      prisma.anomaly.count({ where: { severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      // High priority
      prisma.anomaly.count({ where: { severity: 'HIGH', status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      // Medium
      prisma.anomaly.count({ where: { severity: 'MEDIUM', status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      // Low
      prisma.anomaly.count({ where: { severity: 'LOW', status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      // New findings (risk findings in NEW status)
      prisma.riskFinding.count({ where: { status: 'NEW' } }),
      // Overdue cases (created > 30 days ago, not resolved)
      prisma.anomaly.count({ where: { createdAt: { lt: thirtyDaysAgo }, status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      // Unresolved cases
      prisma.anomaly.count({ where: { status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      // Recent evidence (documents uploaded in last 7 days)
      prisma.document.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      // System/data issues (flagged vendors)
      prisma.vendor.count({ where: { flagged: true } }),
    ]);

    // Pending inspections (use report count as placeholder)
    const pendingInspections = await prisma.report.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: 'UNDER_VERIFICATION',
      }
    });

    // Contractor responses awaiting (reports needing review)
    const contractorResponsesAwaiting = await prisma.report.count({
      where: {
        status: 'REVIEW_QUEUE',
      }
    });

    const totalCases = criticalCases + highPriority + mediumPriority + lowPriority;

    success(res, {
      totalCases,
      criticalCases,
      highPriority,
      mediumPriority,
      lowPriority,
      newFindings,
      overdueCases,
      pendingInspections,
      contractorResponsesAwaiting,
      unresolvedCases,
      recentEvidenceAdded,
      systemDataIssues,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/cases — List cases with filters
 */
router.get('/cases', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      priority,
      status,
      sector,
      district,
      age,
      sortBy = 'priority',
      sortOrder = 'asc',
      page = '1',
      limit = '50',
    } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};

    if (priority) where.severity = priority;
    if (status) where.status = status;

    if (district || sector) {
      where.project = {};
      if (district) (where.project as Record<string, unknown>).district = district;
      if (sector) (where.project as Record<string, unknown>).sector = sector;
    }

    if (age) {
      const ageDate = new Date(Date.now() - parseInt(age) * 24 * 60 * 60 * 1000);
      where.createdAt = { lte: ageDate };
    }

    // Build orderBy
    const orderBy: Record<string, string>[] = [];
    if (sortBy === 'priority') {
      orderBy.push({ severity: sortOrder === 'desc' ? 'desc' : 'asc' });
    }
    orderBy.push({ createdAt: sortOrder === 'desc' ? 'desc' : 'asc' });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [data, total] = await Promise.all([
      prisma.anomaly.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          project: { select: { id: true, name: true, state: true, district: true } },
        },
      }),
      prisma.anomaly.count({ where }),
    ]);

    // Transform to officer case format
    const cases = data.map((a) => ({
      id: a.id,
      reference: `CASE-${a.id.slice(0, 8).toUpperCase()}`,
      type: 'ANOMALY' as const,
      title: a.title,
      description: a.description,
      priority: a.severity,
      status: a.status,
      severity: a.severity,
      confidence: 'MEDIUM' as const,
      projectId: a.projectId,
      project: a.project,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      age: Math.floor((Date.now() - a.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    }));

    success(res, {
      data: cases,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/cases/:id — Get single case
 */
router.get('/cases/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const anomaly = await prisma.anomaly.findUnique({
      where: { id },
    });

    if (!anomaly) throw new NotFoundError('Case');

    // Count related evidence (documents)
    const documentCount = await prisma.document.count({
      where: { projectId: anomaly.projectId ?? undefined }
    });

    // Get project info if exists
    let project = null;
    if (anomaly.projectId) {
      project = await prisma.project.findUnique({
        where: { id: anomaly.projectId },
        select: { id: true, name: true, state: true, district: true },
      });
    }

    const caseData = {
      id: anomaly.id,
      reference: `CASE-${anomaly.id.slice(0, 8).toUpperCase()}`,
      type: 'ANOMALY' as const,
      title: anomaly.title,
      description: anomaly.description,
      priority: anomaly.severity,
      status: anomaly.status,
      severity: anomaly.severity,
      confidence: 'MEDIUM' as const,
      category: anomaly.category,
      projectId: anomaly.projectId,
      project,
      createdAt: anomaly.createdAt.toISOString(),
      updatedAt: anomaly.updatedAt.toISOString(),
      age: Math.floor((Date.now() - anomaly.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      evidenceCount: documentCount,
      notesCount: 0,
    };

    success(res, caseData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/acknowledge — Acknowledge case
 */
router.post('/cases/:id/acknowledge', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const updated = await prisma.anomaly.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedById: req.user!.userId,
        acknowledgedAt: new Date(),
      },
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/review — Mark as under review
 */
router.post('/cases/:id/review', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const updated = await prisma.anomaly.update({
      where: { id },
      data: {
        status: 'UNDER_INVESTIGATION',
      },
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/resolve — Resolve case
 */
router.post('/cases/:id/resolve', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { resolution } = req.body;

    if (!resolution) throw new ValidationError('Resolution is required');

    const updated = await prisma.anomaly.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedById: req.user!.userId,
        resolvedAt: new Date(),
        resolution,
      },
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/dismiss — Dismiss case
 */
router.post('/cases/:id/dismiss', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    if (!reason) throw new ValidationError('Reason is required for dismissal');

    const updated = await prisma.anomaly.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        resolution: reason,
      },
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/escalate — Escalate to law enforcement
 */
router.post('/cases/:id/escalate', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { authority, reason } = req.body;

    const updated = await prisma.anomaly.update({
      where: { id },
      data: {
        status: 'ESCALATED',
        lawEscalation: true,
        lawAuthority: authority ?? null,
        lawEscalatedAt: new Date(),
        lawEscalatedById: req.user!.userId,
        lawNotes: reason ?? null,
      },
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/cases/:id/history — Get case action history
 */
router.get('/cases/:id/history', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // No audit-log table backs case history yet. An audit trail must never
    // contain invented entries — return empty rather than fabricate who did
    // what and when.
    success(res, { actions: [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/evidence — List evidence
 */
router.get('/evidence', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, fromDate, toDate, page = '1', limit = '50' } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (fromDate) {
      const from = new Date(fromDate);
      where.createdAt = { gte: from };
    }
    if (toDate) {
      const to = new Date(toDate);
      where.createdAt = where.createdAt ? { ...(where.createdAt as object), lte: to } : { lte: to };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          project: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    const evidence = data.map((d) => ({
      id: d.id,
      type: 'DOCUMENT' as const,
      title: d.title,
      description: d.description ?? undefined,
      source: d.type,
      url: d.url,
      projectId: d.projectId,
      project: d.project,
      uploadedById: d.uploadedById,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt.toISOString(),
      verified: !!d.verifiedAt,
    }));

    success(res, {
      data: evidence,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/contractor-responses — List contractor responses
 */
router.get('/contractor-responses', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // For now, return empty - would be from contractor_response table
    success(res, {
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/field-inspections — List field inspections
 */
router.get('/field-inspections', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string | undefined>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Return empty array for now - would come from field_inspection table
    success(res, {
      data: [] as unknown[],
      total: 0,
      page: pageNum,
      limit: limitNum,
      totalPages: 0,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/map/layers — Get map layer data
 */
router.get('/map/layers', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sector, district, state } = req.query as Record<string, string | undefined>;

    // Get projects with location
    const projectWhere: Record<string, unknown> = {};
    if (sector) projectWhere.sector = sector;
    if (district) projectWhere.district = district;
    if (state) projectWhere.state = state;

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        sector: true,
        status: true,
      },
      take: 100,
    });

    // Get anomalies with location (from project)
    const anomalies = await prisma.anomaly.findMany({
      where: {
        project: projectWhere,
        status: { notIn: ['RESOLVED', 'DISMISSED'] },
      },
      select: {
        id: true,
        title: true,
        severity: true,
        project: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      take: 50,
    });

    // Get risk findings
    const riskFindings = await prisma.riskFinding.findMany({
      where: {
        status: { notIn: ['RESOLVED', 'DISMISSED'] },
      },
      select: {
        id: true,
        title: true,
        severity: true,
        project: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      take: 50,
    });

    success(res, {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.latitude ?? 0,
        lng: p.longitude ?? 0,
        sector: p.sector,
        status: p.status,
      })),
      riskFindings: riskFindings.map((f) => ({
        id: f.id,
        title: f.title,
        lat: f.project?.latitude ?? 0,
        lng: f.project?.longitude ?? 0,
        severity: f.severity,
        projectId: f.project?.id,
      })),
      cases: anomalies.map((a) => ({
        id: a.id,
        title: a.title,
        lat: a.project?.latitude ?? 0,
        lng: a.project?.longitude ?? 0,
        severity: a.severity,
        projectId: a.project?.id,
        priority: a.severity,
        status: 'NEW',
      })),
      citizenSignals: [],
      satelliteEvidence: [],
      fieldInspections: [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
