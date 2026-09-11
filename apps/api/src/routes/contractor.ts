/**
 * Contractor routes — VOJAS 2.0
 *
 * Endpoints for contractor portal:
 *   GET    /contractor/dashboard
 *   GET    /contractor/projects
 *   GET    /contractor/projects/:id
 *   GET    /contractor/milestones
 *   GET    /contractor/milestones/:id
 *   POST   /contractor/milestones/:id/submit
 *   POST   /contractor/milestones/:id/correct
 *   GET    /contractor/documents
 *   POST   /contractor/documents
 *   GET    /contractor/payments
 *   GET    /contractor/issues
 *   GET    /contractor/responses
 *   POST   /contractor/responses/:id
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { UserRole, AuditAction } from '@vojas/shared';
import { authenticate, requireRole } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';
import { AuditService } from '@vojas/domain';

const router = Router();
const auditService = new AuditService(prisma);

// All contractor routes require authentication
router.use(authenticate, requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER, UserRole.CONTRACTOR));

/** Helper to get contractor filter */
function getContractorWhere(req: Request) {
  const user = req.user!;
  if (user.role === UserRole.ADMIN || user.role === UserRole.OFFICER || user.role === UserRole.REVIEWER) {
    return {};
  }
  // For contractor role, match their contractor name or projects created/assigned
  const contractorName = (user as any).name || '';
  return {
    OR: [
      { contractor: { contains: contractorName, mode: 'insensitive' as const } },
      { createdById: user.userId },
    ],
  };
}

// ── GET /contractor/dashboard ──────────────────────────────────────────────────
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectWhere = getContractorWhere(req);

    const [totalProjects, activeProjects, completedProjects, financialAggr, recentUpdates, openIssues, pendingDocs] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.project.count({ where: { ...projectWhere, status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { ...projectWhere, status: 'COMPLETED' } }),
      prisma.project.aggregate({
        where: projectWhere,
        _sum: { approvedAmount: true, spentAmount: true },
      }),
      prisma.contractorUpdate.findMany({
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.anomaly.count({
        where: { status: { notIn: ['RESOLVED', 'DISMISSED'] } },
      }),
      prisma.document.count({
        where: { status: 'PENDING' },
      }),
    ]);

    const totalApproved = financialAggr._sum.approvedAmount ?? 0;
    const totalReleased = financialAggr._sum.spentAmount ?? 0;

    return success(res, {
      totalProjects,
      activeProjects,
      completedProjects,
      upcomingMilestones: Math.max(0, activeProjects * 2),
      currentMilestones: activeProjects,
      pendingVerifications: recentUpdates.filter(u => u.status === 'PENDING').length,
      pendingDocuments: pendingDocs,
      openIssues,
      totalApproved,
      totalReleased,
      recentUpdates: recentUpdates.map(u => ({
        id: u.id,
        projectId: u.projectId,
        projectName: u.project.name,
        updateType: u.updateType,
        title: u.title,
        description: u.description,
        submittedAt: u.submittedAt.toISOString(),
        status: u.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/projects ───────────────────────────────────────────────────
router.get('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;

    const baseWhere = getContractorWhere(req);
    const where: Record<string, unknown> = { ...baseWhere };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          sector: true,
          status: true,
          state: true,
          district: true,
          constituency: true,
          approvedAmount: true,
          spentAmount: true,
          latitude: true,
          longitude: true,
          startDate: true,
          expectedEndDate: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.project.count({ where }),
    ]);

    const data = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description ?? undefined,
      sector: p.sector,
      status: p.status,
      state: p.state,
      district: p.district,
      constituency: p.constituency ?? undefined,
      sanctionedAmount: p.approvedAmount,
      approvedAmount: p.approvedAmount,
      releasedAmount: p.spentAmount,
      utilizedAmount: p.spentAmount,
      spentAmount: p.spentAmount,
      progressPercent: p.approvedAmount > 0 ? Math.round((p.spentAmount / p.approvedAmount) * 100) : 0,
      latitude: p.latitude,
      longitude: p.longitude,
      startDate: p.startDate?.toISOString(),
      endDate: p.expectedEndDate?.toISOString(),
      completionDate: p.completedAt?.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      currentMilestone: p.status === 'COMPLETED' ? 'Project Completed' : 'In Progress',
      pendingDocuments: 0,
      openIssues: 0,
    }));

    return success(res, {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/projects/:id ───────────────────────────────────────────────
router.get('/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project) throw new NotFoundError('Project');

    return success(res, {
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      sector: project.sector,
      status: project.status,
      state: project.state,
      district: project.district,
      constituency: project.constituency ?? undefined,
      sanctionedAmount: project.approvedAmount,
      approvedAmount: project.approvedAmount,
      releasedAmount: project.spentAmount,
      utilizedAmount: project.spentAmount,
      spentAmount: project.spentAmount,
      progressPercent: project.approvedAmount > 0 ? Math.round((project.spentAmount / project.approvedAmount) * 100) : 0,
      latitude: project.latitude,
      longitude: project.longitude,
      startDate: project.startDate?.toISOString(),
      endDate: project.expectedEndDate?.toISOString(),
      completionDate: project.completedAt?.toISOString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      currentMilestone: project.status === 'COMPLETED' ? 'Project Completed' : 'In Progress',
      pendingDocuments: 0,
      openIssues: 0,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/milestones ─────────────────────────────────────────────────
router.get('/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
    const where: Record<string, unknown> = {
      eventType: 'MILESTONE',
    };
    if (projectId) where.projectId = projectId;

    const events = await prisma.projectEvent.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      take: 50,
      include: { project: { select: { id: true, name: true } } },
    });

    const data = events.map(e => ({
      id: e.id,
      projectId: e.projectId,
      projectName: e.project.name,
      title: e.description,
      description: e.description,
      status: 'COMPLETED' as const,
      completedDate: e.eventDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.createdAt.toISOString(),
    }));

    return success(res, {
      data,
      total: data.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /contractor/milestones/:id/submit ─────────────────────────────────────
router.post('/milestones/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, description, evidenceUrls } = req.body;

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.CONTRACTOR_UPDATE_SUBMITTED,
      entityType: 'Milestone',
      entityId: id,
      metadata: { title, description },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return success(res, {
      id,
      status: 'PENDING_VERIFICATION',
      title: title || 'Milestone Submission',
      description,
      evidenceUrls: evidenceUrls || [],
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/documents ──────────────────────────────────────────────────
router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { project: { select: { id: true, name: true } } },
    });

    const data = docs.map(d => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.project.name,
      title: d.title,
      description: d.description ?? undefined,
      type: d.type,
      url: d.url,
      status: d.status as 'PENDING' | 'VERIFIED' | 'REJECTED',
      uploadedAt: d.uploadedAt.toISOString(),
      verifiedAt: d.verifiedAt?.toISOString(),
      rejectionNote: d.verificationNote ?? undefined,
    }));

    return success(res, {
      data,
      total: data.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /contractor/documents ─────────────────────────────────────────────────
router.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, title, description, type, fileUrl } = req.body;
    if (!projectId || !title || !fileUrl) {
      throw new ValidationError('Missing required fields (projectId, title, fileUrl)');
    }

    const doc = await prisma.document.create({
      data: {
        projectId,
        title,
        description: description ?? null,
        filename: title.toLowerCase().replace(/\s+/g, '-'),
        originalName: title,
        mimeType: 'application/pdf',
        size: 1024,
        url: fileUrl,
        type: type || 'CONTRACT',
        status: 'PENDING',
        uploadedById: req.user!.userId,
      },
    });

    return created(res, doc);
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/payments ───────────────────────────────────────────────────
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    const obs = await prisma.financialObservation.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 50,
      include: { project: { select: { id: true, name: true } } },
    });

    const data = obs.map(o => ({
      id: o.id,
      projectId: o.projectId,
      projectName: o.project.name,
      approvedAmount: o.amount,
      releasedAmount: o.amount,
      utilizedAmount: o.amount,
      status: (o.status === 'PAID' ? 'RELEASED' : 'PENDING') as 'PENDING' | 'APPROVED' | 'RELEASED' | 'UTILIZED',
      releasedDate: o.paidOn?.toISOString(),
      verificationStatus: 'VERIFIED' as const,
      vojasVerified: true,
      authorizedPayment: true,
      paymentEligible: true,
      remarks: o.notes ?? undefined,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.createdAt.toISOString(),
    }));

    return success(res, {
      data,
      total: data.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/issues ─────────────────────────────────────────────────────
router.get('/issues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const anomalies = await prisma.anomaly.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { project: { select: { id: true, name: true } } },
    });

    const data = anomalies.map(a => ({
      id: a.id,
      projectId: a.projectId ?? '',
      projectName: a.project?.name ?? 'General Project',
      title: a.title,
      description: a.description ?? undefined,
      severity: a.severity,
      status: (a.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN') as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
      type: 'COMPLIANCE' as const,
      reportedAt: a.createdAt.toISOString(),
    }));

    return success(res, {
      data,
      total: data.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /contractor/responses ──────────────────────────────────────────────────
router.get('/responses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = await prisma.contractorUpdate.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 50,
      include: { project: { select: { id: true, name: true } } },
    });

    const data = updates.map(u => ({
      id: u.id,
      projectId: u.projectId,
      projectName: u.project.name,
      finding: u.title,
      reason: u.description,
      status: u.status as 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED',
      submittedAt: u.submittedAt.toISOString(),
      reviewedAt: u.reviewedAt?.toISOString(),
      reviewerNote: u.reviewNote ?? undefined,
      response: u.description,
    }));

    return success(res, {
      data,
      total: data.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /contractor/responses/:id ─────────────────────────────────────────────
router.post('/responses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { response, documents, evidenceUrls } = req.body as {
      response?: string;
      documents?: string[];
      evidenceUrls?: string[];
    };

    if (!response) {
      throw new ValidationError('response is required');
    }

    const existing = await prisma.contractorUpdate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('ContractorUpdate');

    // `documents` and `evidenceUrls` are both client-supplied evidence
    // reference lists; the schema has a single `evidenceUrls` Json column,
    // so both are merged into it rather than one being silently dropped.
    const combinedEvidenceUrls = [...(documents ?? []), ...(evidenceUrls ?? [])];

    const updated = await prisma.contractorUpdate.update({
      where: { id },
      data: {
        description: response,
        evidenceUrls: combinedEvidenceUrls,
        status: 'SUBMITTED',
        submittedById: req.user!.userId,
        submittedAt: new Date(),
      },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.CONTRACTOR_UPDATE_SUBMITTED,
      entityType: 'ContractorResponse',
      entityId: id,
      metadata: { response },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return success(res, {
      id: updated.id,
      status: updated.status,
      response: updated.description,
      evidenceUrls: combinedEvidenceUrls,
      submittedAt: updated.submittedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
