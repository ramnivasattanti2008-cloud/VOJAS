import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '@vojas/db';
import {
  NotFoundError,
  ValidationError,
  AuditService,
  deriveFieldInspectionStatus,
  deriveFieldVerificationResult,
  mapContractorUpdateStatus,
  canReopenAnomalyCase,
} from '@vojas/domain';
import type { ChecklistItem } from '@vojas/domain';
import { UserRole, PERMISSIONS, AuditAction } from '@vojas/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();
const auditService = new AuditService(prisma);

/** Resolves actorId -> {id, name} for a set of audit events, without inventing names for non-user actors (SYSTEM/AI). */
async function resolveActors(actorIds: string[]): Promise<Map<string, { id: string; name: string }>> {
  const realUserIds = [...new Set(actorIds)].filter((id) => id !== 'SYSTEM' && id !== 'AI');
  if (realUserIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: realUserIds } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u]));
}

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

    // Count related evidence (documents) and notes actually recorded for this case
    const [documentCount, notesCount] = await Promise.all([
      prisma.document.count({ where: { projectId: anomaly.projectId ?? undefined } }),
      prisma.auditEvent.count({ where: { entityType: 'Anomaly', entityId: id, action: AuditAction.ANOMALY_NOTE_ADDED } }),
    ]);

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
      notesCount,
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
 * POST /officer/cases/:id/reopen — Reopen a resolved/dismissed/escalated case
 */
router.post('/cases/:id/reopen', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body as { reason?: string };
    if (!reason) throw new ValidationError('Reason is required to reopen a case');

    const existing = await prisma.anomaly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Case');
    if (!canReopenAnomalyCase(existing.status)) {
      throw new ValidationError(`Cannot reopen a case in status ${existing.status}`);
    }

    const updated = await prisma.anomaly.update({
      where: { id },
      data: { status: 'UNDER_INVESTIGATION' },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_REOPENED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { reason, previousStatus: existing.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/verify — Record an officer's human verification
 * judgment on a case. This is an audit-trail entry, not an automatic status
 * change or a guilt determination — it records that a named officer looked
 * at the case and reached a conclusion, for later review.
 */
router.post('/cases/:id/verify', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { verified, notes } = req.body as { verified?: boolean; notes?: string };

    const existing = await prisma.anomaly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Case');

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_VERIFIED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { verified: verified ?? true, notes: notes ?? null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, existing);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/notes — Add a note to a case's audit trail
 */
router.post('/cases/:id/notes', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body as { notes?: string };
    if (!notes) throw new ValidationError('notes is required');

    const existing = await prisma.anomaly.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundError('Case');

    const event = await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_NOTE_ADDED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const e = event as { id: string; timestamp: Date };
    created(res, {
      id: e.id,
      caseId: id,
      action: 'ANOMALY_NOTE_ADDED',
      performedById: req.user!.userId,
      notes,
      createdAt: e.timestamp.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/request-info — Request additional information on a case
 */
router.post('/cases/:id/request-info', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { infoType, notes } = req.body as { infoType?: string; notes?: string };

    const existing = await prisma.anomaly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Case');

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_INFO_REQUESTED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { infoType: infoType ?? 'GENERAL', notes: notes ?? null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, existing);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/request-inspection — Record a request for a field
 * inspection on a case. Does not create a FieldVerification row itself —
 * FieldVerification.assignedToId is required and this endpoint has no real
 * assignee to put there. An officer schedules the actual inspection (with a
 * real assignee) via POST /officer/field-inspections.
 */
router.post('/cases/:id/request-inspection', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body as { reason?: string };

    const existing = await prisma.anomaly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Case');

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_INSPECTION_REQUESTED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { reason: reason ?? null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, existing);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/request-contractor-response — Record a request for
 * a contractor response on a case. Recorded in the audit trail; the actual
 * ContractorUpdate row is created by the contractor when they respond.
 */
router.post('/cases/:id/request-contractor-response', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { contractorId, deadline } = req.body as { contractorId?: string; deadline?: string };

    const existing = await prisma.anomaly.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Case');

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_CONTRACTOR_RESPONSE_REQUESTED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { contractorId: contractorId ?? null, deadline: deadline ?? null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, existing);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/cases/:id/evidence — Link an evidence reference to a case's
 * audit trail. This records the reference (title/url/source), it does not
 * create a Document row — real file uploads go through POST /documents/upload,
 * which captures genuine file metadata this lightweight payload doesn't carry.
 */
router.post('/cases/:id/evidence', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { type, title, description, url, source } = req.body as {
      type?: string; title?: string; description?: string; url?: string; source?: string;
    };
    if (!title || !source) throw new ValidationError('title and source are required');

    const existing = await prisma.anomaly.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundError('Case');

    const event = await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.ANOMALY_EVIDENCE_LINKED,
      entityType: 'Anomaly',
      entityId: id,
      metadata: { type: type ?? 'OTHER', title, description: description ?? null, url: url ?? null, source },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const e = event as { id: string; timestamp: Date };
    created(res, {
      id: e.id,
      type: type ?? 'OTHER',
      title,
      description,
      source,
      url,
      caseId: id,
      uploadedById: req.user!.userId,
      createdAt: e.timestamp.toISOString(),
      verified: false,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/cases/:id/history — Get case action history from the
 * append-only AuditEvent log. Only entries actually written by real officer
 * actions appear here; nothing is invented.
 */
router.get('/cases/:id/history', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.anomaly.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundError('Case');

    const events = (await auditService.getEventsForEntity('Anomaly', id)) as Array<{
      id: string;
      actorId: string;
      action: string;
      metadata: Record<string, unknown> | null;
      timestamp: Date;
    }>;

    const actors = await resolveActors(events.map((e) => e.actorId));

    const actions = events.map((e) => ({
      id: e.id,
      caseId: id,
      action: e.action,
      performedById: e.actorId,
      performedBy: actors.get(e.actorId) ?? undefined,
      notes: (e.metadata?.notes as string | undefined) ?? (e.metadata?.reason as string | undefined) ?? undefined,
      createdAt: e.timestamp.toISOString(),
    }));

    success(res, { actions });
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
 * PATCH /officer/evidence/:id — verify/reject a piece of evidence.
 * Thin wrapper over the real Document verification flow
 * (PATCH /documents/:id/verify) — same table, same fields, just the shape
 * the officer command-center evidence page expects.
 */
router.patch('/evidence/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { verified, notes } = req.body as { verified?: boolean; notes?: string };

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('Evidence');

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: verified ? 'VERIFIED' : 'REJECTED',
        verifiedById: req.user!.userId,
        verifiedAt: new Date(),
        verificationNote: notes ?? null,
      },
      include: {
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: verified ? AuditAction.DOCUMENT_VERIFIED : AuditAction.DOCUMENT_REJECTED,
      entityType: 'Document',
      entityId: id,
      metadata: { notes: notes ?? null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, {
      id: updated.id,
      type: 'DOCUMENT' as const,
      title: updated.title,
      description: updated.description ?? undefined,
      source: updated.type,
      url: updated.url,
      projectId: updated.projectId,
      project: updated.project,
      uploadedById: updated.uploadedById,
      uploadedBy: updated.uploadedBy,
      createdAt: updated.createdAt.toISOString(),
      verified: updated.status === 'VERIFIED',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/contractor-responses — List contractor responses, backed by
 * the real ContractorUpdate table (submitted by contractors via their own
 * workflow, reviewed here by officers).
 */
router.get('/contractor-responses', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contractorId, status, page = '1', limit = '50' } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (contractorId) where.contractorId = contractorId;
    if (status) {
      // PENDING_REVIEW covers both real PENDING and UNDER_REVIEW rows.
      where.status = status === 'PENDING_REVIEW' ? { in: ['PENDING', 'UNDER_REVIEW'] } : status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [data, total] = await Promise.all([
      prisma.contractorUpdate.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          contractor: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.contractorUpdate.count({ where }),
    ]);

    const responses = data.map((r) => ({
      id: r.id,
      contractorId: r.contractorId,
      contractorName: r.contractor.name,
      projectId: r.projectId,
      projectName: r.project.name,
      responseText: r.description,
      documents: Array.isArray(r.evidenceUrls)
        ? (r.evidenceUrls as unknown[]).filter((u): u is string => typeof u === 'string').map((url) => ({ name: url.split('/').pop() ?? url, url }))
        : undefined,
      submittedAt: r.submittedAt.toISOString(),
      status: mapContractorUpdateStatus(r.status),
      reviewedById: r.reviewedById ?? undefined,
      reviewedBy: r.reviewedBy ?? undefined,
      reviewedAt: r.reviewedAt?.toISOString(),
      reviewNotes: r.reviewNote ?? undefined,
    }));

    success(res, { data: responses, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /officer/contractor-responses/:id — review a contractor response
 */
router.patch('/contractor-responses/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status, reviewNotes } = req.body as { status?: string; reviewNotes?: string };
    if (!status || !['ACCEPTED', 'REJECTED', 'CLARIFICATION_REQUESTED'].includes(status)) {
      throw new ValidationError('status must be ACCEPTED, REJECTED, or CLARIFICATION_REQUESTED');
    }

    const existing = await prisma.contractorUpdate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Contractor response');

    const updated = await prisma.contractorUpdate.update({
      where: { id },
      data: {
        status,
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNote: reviewNotes ?? null,
      },
      include: {
        contractor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.CONTRACTOR_UPDATE_REVIEWED,
      entityType: 'ContractorUpdate',
      entityId: id,
      metadata: { status, reviewNotes: reviewNotes ?? null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, {
      id: updated.id,
      contractorId: updated.contractorId,
      contractorName: updated.contractor.name,
      projectId: updated.projectId,
      projectName: updated.project.name,
      responseText: updated.description,
      submittedAt: updated.submittedAt.toISOString(),
      status: mapContractorUpdateStatus(updated.status),
      reviewedById: updated.reviewedById ?? undefined,
      reviewedBy: updated.reviewedBy ?? undefined,
      reviewedAt: updated.reviewedAt?.toISOString(),
      reviewNotes: updated.reviewNote ?? undefined,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/field-inspections — List field inspections, backed by the
 * real FieldVerification table. Status is derived (see
 * deriveFieldInspectionStatus) since the table has no status column.
 */
router.get('/field-inspections', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER, UserRole.FIELD_OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { officerId, status, fromDate, toDate, page = '1', limit = '50' } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (officerId) where.assignedToId = officerId;
    if (fromDate || toDate) {
      where.scheduledDate = {};
      if (fromDate) (where.scheduledDate as Record<string, Date>).gte = new Date(fromDate);
      if (toDate) (where.scheduledDate as Record<string, Date>).lte = new Date(toDate);
    }
    if (status === 'COMPLETED') where.completedDate = { not: null };
    if (status === 'PENDING') { where.completedDate = null; where.checklist = { equals: Prisma.JsonNull }; }
    if (status === 'IN_PROGRESS') { where.completedDate = null; where.checklist = { not: Prisma.JsonNull }; }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [data, total] = await Promise.all([
      prisma.fieldVerification.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
      prisma.fieldVerification.count({ where }),
    ]);

    const inspections = data.map((fv) => ({
      id: fv.id,
      projectId: fv.projectId,
      projectName: fv.project.name,
      location: fv.locationDesc ?? `${fv.latitude}, ${fv.longitude}`,
      assignedOfficerId: fv.assignedToId,
      assignedOfficer: fv.assignedTo,
      scheduledDate: (fv.scheduledDate ?? fv.createdAt).toISOString(),
      status: deriveFieldInspectionStatus(fv),
      checklist: Array.isArray(fv.checklist) ? (fv.checklist as unknown[]) : [],
      notes: fv.notes ?? undefined,
      photos: Array.isArray(fv.photos) ? (fv.photos as unknown[]).filter((p): p is string => typeof p === 'string') : undefined,
      completedAt: fv.completedDate?.toISOString(),
      createdAt: fv.createdAt.toISOString(),
    }));

    success(res, { data: inspections, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/field-inspections — Schedule a real field inspection.
 * Requires a real assignedToId; never invents an assignee.
 */
router.post('/field-inspections', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, assignedToId, locationDesc, latitude, longitude, scheduledDate, caseId } = req.body as {
      projectId?: string; assignedToId?: string; locationDesc?: string;
      latitude?: number; longitude?: number; scheduledDate?: string; caseId?: string;
    };
    if (!projectId || !assignedToId || latitude === undefined || longitude === undefined) {
      throw new ValidationError('projectId, assignedToId, latitude, and longitude are required');
    }

    const [project, assignee] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } }),
      prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true, name: true } }),
    ]);
    if (!project) throw new NotFoundError('Project');
    if (!assignee) throw new NotFoundError('Assignee');

    const fv = await prisma.fieldVerification.create({
      data: {
        projectId,
        caseId: caseId ?? null,
        assignedToId,
        locationDesc: locationDesc ?? null,
        latitude,
        longitude,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        result: 'REQUIRES_INVESTIGATION',
      },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.FIELD_VERIFICATION_SCHEDULED,
      entityType: 'FieldVerification',
      entityId: fv.id,
      metadata: { projectId, assignedToId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    created(res, {
      id: fv.id,
      projectId,
      projectName: project.name,
      location: fv.locationDesc ?? `${latitude}, ${longitude}`,
      assignedOfficerId: assignedToId,
      assignedOfficer: assignee,
      scheduledDate: (fv.scheduledDate ?? fv.createdAt).toISOString(),
      status: deriveFieldInspectionStatus(fv),
      checklist: [],
      createdAt: fv.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /officer/field-inspections/:id — get a single field inspection
 */
router.get('/field-inspections/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER, UserRole.FIELD_OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const fv = await prisma.fieldVerification.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!fv) throw new NotFoundError('Field inspection');

    success(res, {
      id: fv.id,
      projectId: fv.projectId,
      projectName: fv.project.name,
      location: fv.locationDesc ?? `${fv.latitude}, ${fv.longitude}`,
      assignedOfficerId: fv.assignedToId,
      assignedOfficer: fv.assignedTo,
      scheduledDate: (fv.scheduledDate ?? fv.createdAt).toISOString(),
      status: deriveFieldInspectionStatus(fv),
      checklist: Array.isArray(fv.checklist) ? (fv.checklist as unknown[]) : [],
      notes: fv.notes ?? undefined,
      photos: Array.isArray(fv.photos) ? (fv.photos as unknown[]).filter((p): p is string => typeof p === 'string') : undefined,
      completedAt: fv.completedDate?.toISOString(),
      createdAt: fv.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /officer/field-inspections/:id — save a draft (checklist/notes/photos)
 */
router.patch('/field-inspections/:id', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER, UserRole.FIELD_OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { checklist, notes, photos } = req.body as { checklist?: ChecklistItem[]; notes?: string; photos?: string[] };

    const existing = await prisma.fieldVerification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Field inspection');

    const updated = await prisma.fieldVerification.update({
      where: { id },
      data: {
        checklist: checklist ? (checklist as unknown as object) : undefined,
        notes: notes !== undefined ? notes : undefined,
        photos: photos ? (photos as unknown as object) : undefined,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    success(res, {
      id: updated.id,
      projectId: updated.projectId,
      projectName: updated.project.name,
      location: updated.locationDesc ?? `${updated.latitude}, ${updated.longitude}`,
      assignedOfficerId: updated.assignedToId,
      assignedOfficer: updated.assignedTo,
      scheduledDate: (updated.scheduledDate ?? updated.createdAt).toISOString(),
      status: deriveFieldInspectionStatus(updated),
      checklist: Array.isArray(updated.checklist) ? (updated.checklist as unknown[]) : [],
      notes: updated.notes ?? undefined,
      photos: Array.isArray(updated.photos) ? (updated.photos as unknown[]).filter((p): p is string => typeof p === 'string') : undefined,
      completedAt: updated.completedDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /officer/field-inspections/:id/submit — submit a completed inspection.
 * result is derived from the officer's own checklist unless explicitly
 * provided in the payload (see deriveFieldVerificationResult).
 */
router.post('/field-inspections/:id/submit', authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER, UserRole.FIELD_OFFICER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { checklist, notes, photos, result } = req.body as {
      checklist?: ChecklistItem[]; notes?: string; photos?: string[]; result?: string;
    };
    if (!checklist) throw new ValidationError('checklist is required to submit an inspection');

    const existing = await prisma.fieldVerification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Field inspection');

    const finalResult = result ?? deriveFieldVerificationResult(checklist);

    const updated = await prisma.fieldVerification.update({
      where: { id },
      data: {
        checklist: checklist as unknown as object,
        notes: notes ?? existing.notes,
        photos: photos ? (photos as unknown as object) : existing.photos ?? undefined,
        result: finalResult,
        completedDate: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.FIELD_VERIFICATION_COMPLETED,
      entityType: 'FieldVerification',
      entityId: id,
      metadata: { result: finalResult },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, {
      id: updated.id,
      projectId: updated.projectId,
      projectName: updated.project.name,
      location: updated.locationDesc ?? `${updated.latitude}, ${updated.longitude}`,
      assignedOfficerId: updated.assignedToId,
      assignedOfficer: updated.assignedTo,
      scheduledDate: (updated.scheduledDate ?? updated.createdAt).toISOString(),
      status: deriveFieldInspectionStatus(updated),
      checklist: Array.isArray(updated.checklist) ? (updated.checklist as unknown[]) : [],
      notes: updated.notes ?? undefined,
      photos: Array.isArray(updated.photos) ? (updated.photos as unknown[]).filter((p): p is string => typeof p === 'string') : undefined,
      completedAt: updated.completedDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
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
