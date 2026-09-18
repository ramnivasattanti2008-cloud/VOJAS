/**
 * Contractor portal — real data for the authenticated user's own linked
 * Contractor record.
 *
 * Previously this entire namespace had no backend at all: packages/api-
 * client/src/contractor.ts and apps/web/src/hooks/useContractor.ts were
 * fully built against a `/contractor/*` API surface with no matching route
 * file, no router mount in routes/index.ts, and (before this session's
 * earlier User<->MP work) no way to know which contractor an authenticated
 * user even represents. Every contractor dashboard page 404'd.
 *
 * Resolution is strictly server-side from User.contractorId — an explicit,
 * admin-controlled link (see routes/users.ts), never a client-supplied id.
 * A user with no linked contractor gets `linked: false` and honest empty
 * data, never another contractor's data and never fabricated data.
 *
 * Scope of what's implemented here, and why: ContractorMilestone,
 * ContractorResponse are modeled as real ContractorUpdate rows (the only
 * table that actually exists for contractor-submitted updates), split by
 * updateType. ContractorDocument/ContractorPayment map onto the real
 * Document / FinancialObservation tables. ContractorIssue, Inspection, and
 * WorkDiaryEntry have no backing table in the schema at all — rather than
 * invent one at this scope, GET routes for those honestly return an empty
 * list (never fabricated rows), and there's no write path for them here;
 * adding real tracking for those is a schema decision for a separate pass.
 */

import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { created, success } from '../utils/apiResponse.js';

const router = Router();

async function resolveContractorId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { contractorId: true } });
  return user?.contractorId ?? null;
}

/** Distinct project ids this contractor has any real ContractorUpdate against. */
async function contractorProjectIds(contractorId: string): Promise<string[]> {
  const rows = await prisma.contractorUpdate.findMany({
    where: { contractorId },
    distinct: ['projectId'],
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

function paginate(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
  return { page, limit };
}

// ── GET /contractor/dashboard ───────────────────────────────────────────────

router.get('/dashboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) {
      return success(res, {
        linked: false,
        totalProjects: 0, activeProjects: 0, completedProjects: 0,
        upcomingMilestones: 0, currentMilestones: 0, pendingVerifications: 0,
        pendingDocuments: 0, openIssues: 0, totalApproved: 0, totalReleased: 0,
        recentUpdates: [],
      });
    }

    const projectIds = await contractorProjectIds(contractorId);
    const [projects, milestonesPending, docsPending, payments, recent] = await Promise.all([
      prisma.project.findMany({ where: { id: { in: projectIds } }, select: { status: true } }),
      prisma.contractorUpdate.count({ where: { contractorId, updateType: 'MILESTONE', status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
      prisma.document.count({ where: { projectId: { in: projectIds }, status: 'PENDING' } }),
      prisma.financialObservation.aggregate({ where: { vendorId: contractorId }, _sum: { amount: true } }),
      prisma.contractorUpdate.findMany({
        where: { contractorId },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        include: { project: { select: { name: true } } },
      }),
    ]);

    success(res, {
      linked: true,
      totalProjects: projectIds.length,
      activeProjects: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      completedProjects: projects.filter((p) => p.status === 'COMPLETED').length,
      upcomingMilestones: 0, // No real due-date scheduling exists on ContractorUpdate to distinguish "upcoming" from "current"
      currentMilestones: milestonesPending,
      pendingVerifications: milestonesPending,
      pendingDocuments: docsPending,
      openIssues: 0, // No Issue model exists — see file header
      totalApproved: 0, // No real approved-vs-released distinction exists on FinancialObservation
      totalReleased: payments._sum.amount ?? 0,
      recentUpdates: recent.map((u) => ({
        id: u.id, projectId: u.projectId, projectName: u.project.name,
        updateType: u.updateType, title: u.title, description: u.description,
        submittedAt: u.submittedAt.toISOString(), status: u.status,
      })),
    });
  } catch (err) { next(err); }
});

// ── GET /contractor/projects ─────────────────────────────────────────────────

router.get('/projects', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) return success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const { page, limit } = paginate(req);
    const projectIds = await contractorProjectIds(contractorId);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where: Record<string, unknown> = { id: { in: projectIds } };
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    success(res, {
      data: projects.map(toContractorProject),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

router.get('/projects/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Project');

    const id = req.params.id as string;
    const hasUpdate = await prisma.contractorUpdate.findFirst({ where: { contractorId, projectId: id } });
    if (!hasUpdate) throw new NotFoundError('Project');

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project');

    success(res, toContractorProject(project));
  } catch (err) { next(err); }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma Project row shape
function toContractorProject(p: any) {
  return {
    id: p.id, name: p.name, description: p.description ?? undefined,
    sector: p.sector, status: p.status, state: p.state, district: p.district,
    approvedAmount: p.approvedAmount, spentAmount: p.spentAmount,
    latitude: p.latitude, longitude: p.longitude,
    startDate: p.startDate?.toISOString(), endDate: p.expectedEndDate?.toISOString(),
    completionDate: p.completedAt?.toISOString(),
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
  };
}

// ── Milestones (real ContractorUpdate rows, updateType='MILESTONE') ─────────

router.get('/milestones', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) return success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const { page, limit } = paginate(req);
    const where: Record<string, unknown> = { contractorId, updateType: 'MILESTONE' };
    if (typeof req.query.projectId === 'string') where.projectId = req.query.projectId;
    if (typeof req.query.status === 'string') where.status = req.query.status;

    const [rows, total] = await prisma.$transaction([
      prisma.contractorUpdate.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { submittedAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.contractorUpdate.count({ where }),
    ]);

    success(res, { data: rows.map(toMilestone), total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.get('/milestones/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Milestone');
    const row = await prisma.contractorUpdate.findFirst({
      where: { id: req.params.id as string, contractorId, updateType: 'MILESTONE' },
      include: { project: { select: { name: true } } },
    });
    if (!row) throw new NotFoundError('Milestone');
    success(res, toMilestone(row));
  } catch (err) { next(err); }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma ContractorUpdate row shape
function toMilestone(u: any) {
  return {
    id: u.id, projectId: u.projectId, projectName: u.project.name,
    title: u.title, description: u.description ?? undefined,
    status: u.status === 'ACCEPTED' ? 'COMPLETED' : u.status === 'REJECTED' ? 'REJECTED' : u.status === 'UNDER_REVIEW' ? 'PENDING_VERIFICATION' : 'CURRENT',
    amount: u.amount ?? undefined,
    evidenceUrls: Array.isArray(u.evidenceUrls) ? u.evidenceUrls : undefined,
    createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString(),
  };
}

router.post('/milestones/:id/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Milestone');
    const existing = await prisma.contractorUpdate.findFirst({ where: { id: req.params.id as string, contractorId, updateType: 'MILESTONE' } });
    if (!existing) throw new NotFoundError('Milestone');

    const { title, description, evidenceUrls } = req.body ?? {};
    const updated = await prisma.contractorUpdate.update({
      where: { id: existing.id },
      data: {
        title: typeof title === 'string' && title.trim() ? title : existing.title,
        description: typeof description === 'string' && description.trim() ? description : existing.description,
        evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : existing.evidenceUrls ?? undefined,
        status: 'UNDER_REVIEW',
      },
      include: { project: { select: { name: true } } },
    });
    success(res, toMilestone(updated));
  } catch (err) { next(err); }
});

router.post('/milestones/:id/correct', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Milestone');
    const existing = await prisma.contractorUpdate.findFirst({ where: { id: req.params.id as string, contractorId, updateType: 'MILESTONE' } });
    if (!existing) throw new NotFoundError('Milestone');

    const { correctionNote, evidenceUrls } = req.body ?? {};
    if (typeof correctionNote !== 'string' || !correctionNote.trim()) {
      throw new ValidationError('correctionNote is required');
    }
    const updated = await prisma.contractorUpdate.update({
      where: { id: existing.id },
      data: {
        description: `${existing.description}\n\n[Correction] ${correctionNote}`,
        evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : existing.evidenceUrls ?? undefined,
        status: 'UNDER_REVIEW',
      },
      include: { project: { select: { name: true } } },
    });
    success(res, toMilestone(updated));
  } catch (err) { next(err); }
});

router.post('/milestones/:id/request-inspection', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Milestone');
    const existing = await prisma.contractorUpdate.findFirst({ where: { id: req.params.id as string, contractorId, updateType: 'MILESTONE' } });
    if (!existing) throw new NotFoundError('Milestone');
    // No FieldVerification row can honestly be created here — that model
    // requires assignedToId (an officer), which doesn't exist yet at
    // request time. Report the real, current state rather than fabricate
    // a scheduled inspection.
    success(res, { status: 'NOT_AVAILABLE', message: 'Inspection requests are not yet routed to an officer automatically. This request has not been scheduled.' });
  } catch (err) { next(err); }
});

// ── Documents (real Document rows scoped to the contractor's projects) ──────

router.get('/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) return success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const { page, limit } = paginate(req);
    const projectIds = await contractorProjectIds(contractorId);
    const where: Record<string, unknown> = { projectId: { in: projectIds } };
    if (typeof req.query.projectId === 'string') where.projectId = req.query.projectId;
    if (typeof req.query.type === 'string') where.type = req.query.type;

    const [rows, total] = await prisma.$transaction([
      prisma.document.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { uploadedAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.document.count({ where }),
    ]);

    success(res, {
      data: rows.map((d) => ({
        id: d.id, projectId: d.projectId, projectName: d.project.name,
        title: d.title, description: d.description ?? undefined, type: d.type, url: d.url,
        status: d.status, uploadedAt: d.uploadedAt.toISOString(),
        verifiedAt: d.verifiedAt?.toISOString(), rejectionNote: d.status === 'REJECTED' ? d.verificationNote ?? undefined : undefined,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

router.get('/documents/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Document');
    const projectIds = await contractorProjectIds(contractorId);
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id as string, projectId: { in: projectIds } },
      include: { project: { select: { name: true } } },
    });
    if (!doc) throw new NotFoundError('Document');
    success(res, {
      id: doc.id, projectId: doc.projectId, projectName: doc.project.name,
      title: doc.title, description: doc.description ?? undefined, type: doc.type, url: doc.url,
      status: doc.status, uploadedAt: doc.uploadedAt.toISOString(), verifiedAt: doc.verifiedAt?.toISOString(),
    });
  } catch (err) { next(err); }
});

router.post('/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new ValidationError('This account is not linked to a contractor record');

    const { projectId, title, description, type, fileUrl } = req.body ?? {};
    if (typeof projectId !== 'string' || typeof title !== 'string' || typeof type !== 'string' || typeof fileUrl !== 'string') {
      throw new ValidationError('projectId, title, type, and fileUrl are required');
    }
    const projectIds = await contractorProjectIds(contractorId);
    if (!projectIds.includes(projectId)) throw new ValidationError('This project is not assigned to your contractor account');

    const doc = await prisma.document.create({
      data: {
        projectId, title, description: typeof description === 'string' ? description : undefined,
        type, url: fileUrl,
        filename: fileUrl.split('/').pop() ?? 'document', originalName: fileUrl.split('/').pop() ?? 'document',
        mimeType: 'application/octet-stream', size: 0,
        uploadedById: req.user!.userId, status: 'PENDING',
      },
      include: { project: { select: { name: true } } },
    });
    created(res, {
      id: doc.id, projectId: doc.projectId, projectName: doc.project.name,
      title: doc.title, type: doc.type, url: doc.url, status: doc.status,
      uploadedAt: doc.uploadedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// ── Payments (real FinancialObservation rows, vendorId = this contractor) ───

router.get('/payments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) return success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const { page, limit } = paginate(req);
    const where: Record<string, unknown> = { vendorId: contractorId };
    if (typeof req.query.projectId === 'string') where.projectId = req.query.projectId;
    if (typeof req.query.status === 'string') where.status = req.query.status;

    const [rows, total] = await prisma.$transaction([
      prisma.financialObservation.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { date: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.financialObservation.count({ where }),
    ]);

    success(res, {
      data: rows.map((p) => ({
        id: p.id, projectId: p.projectId, projectName: p.project.name,
        approvedAmount: p.amount, releasedAmount: p.status === 'PAID' ? p.amount : 0,
        utilizedAmount: 0, status: p.status,
        dueDate: undefined, releasedDate: p.paidOn?.toISOString(),
        verificationStatus: p.status === 'PAID' ? 'VERIFIED' : 'PENDING',
        remarks: p.notes ?? undefined,
        createdAt: p.createdAt.toISOString(), updatedAt: p.createdAt.toISOString(),
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

router.get('/payments/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Payment');
    const p = await prisma.financialObservation.findFirst({
      where: { id: req.params.id as string, vendorId: contractorId },
      include: { project: { select: { name: true } } },
    });
    if (!p) throw new NotFoundError('Payment');
    success(res, {
      id: p.id, projectId: p.projectId, projectName: p.project.name,
      approvedAmount: p.amount, status: p.status, remarks: p.notes ?? undefined,
    });
  } catch (err) { next(err); }
});

// ── Issues — no backing model exists; honest empty state, not fabricated ───

router.get('/issues', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  } catch (err) { next(err); }
});

router.get('/issues/:id', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    throw new NotFoundError('Issue');
  } catch (err) { next(err); }
});

// ── Responses (real ContractorUpdate rows, updateType in PERFORMANCE/STATUS) ─

router.get('/responses', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) return success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const { page, limit } = paginate(req);
    const where: Record<string, unknown> = { contractorId, updateType: { in: ['PERFORMANCE', 'STATUS'] } };
    if (typeof req.query.projectId === 'string') where.projectId = req.query.projectId;
    if (typeof req.query.status === 'string') where.status = req.query.status;

    const [rows, total] = await prisma.$transaction([
      prisma.contractorUpdate.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { submittedAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.contractorUpdate.count({ where }),
    ]);

    success(res, {
      data: rows.map((u) => ({
        id: u.id, projectId: u.projectId, projectName: u.project.name,
        finding: u.title, reason: u.description,
        status: u.status, submittedAt: u.submittedAt.toISOString(),
        reviewedAt: u.reviewedAt?.toISOString(), reviewerNote: u.reviewNote ?? undefined,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

router.get('/responses/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Response');
    const u = await prisma.contractorUpdate.findFirst({
      where: { id: req.params.id as string, contractorId, updateType: { in: ['PERFORMANCE', 'STATUS'] } },
      include: { project: { select: { name: true } } },
    });
    if (!u) throw new NotFoundError('Response');
    success(res, {
      id: u.id, projectId: u.projectId, projectName: u.project.name,
      finding: u.title, reason: u.description, status: u.status,
    });
  } catch (err) { next(err); }
});

router.post('/responses/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) throw new NotFoundError('Response');
    const existing = await prisma.contractorUpdate.findFirst({ where: { id: req.params.id as string, contractorId, updateType: { in: ['PERFORMANCE', 'STATUS'] } } });
    if (!existing) throw new NotFoundError('Response');

    const { response, documents } = req.body ?? {};
    if (typeof response !== 'string' || !response.trim()) throw new ValidationError('response is required');

    const updated = await prisma.contractorUpdate.update({
      where: { id: existing.id },
      data: {
        description: `${existing.description}\n\n[Response] ${response}`,
        evidenceUrls: Array.isArray(documents) ? documents : existing.evidenceUrls ?? undefined,
        status: 'UNDER_REVIEW',
      },
      include: { project: { select: { name: true } } },
    });
    success(res, {
      id: updated.id, projectId: updated.projectId, projectName: updated.project.name,
      finding: updated.title, response, status: updated.status,
    });
  } catch (err) { next(err); }
});

// ── Work diary and inspection listing — no backing model; honest empty ─────

router.get('/projects/:id/work-diary', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  } catch (err) { next(err); }
});

router.get('/inspections', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractorId = await resolveContractorId(req.user!.userId);
    if (!contractorId) return success(res, { data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const { page, limit } = paginate(req);
    const projectIds = await contractorProjectIds(contractorId);
    const where: Record<string, unknown> = { projectId: { in: projectIds } };
    if (typeof req.query.projectId === 'string') where.projectId = req.query.projectId;

    const [rows, total] = await prisma.$transaction([
      prisma.fieldVerification.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      prisma.fieldVerification.count({ where }),
    ]);

    success(res, {
      data: rows.map((v) => ({
        id: v.id, projectId: v.projectId, projectName: v.project.name,
        scheduledDate: v.scheduledDate?.toISOString(), type: 'FIELD_VERIFICATION',
        status: v.completedDate ? 'COMPLETED' : v.scheduledDate ? 'SCHEDULED' : 'IN_PROGRESS',
        findings: v.notes ?? undefined, createdAt: v.createdAt.toISOString(),
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

export default router;
