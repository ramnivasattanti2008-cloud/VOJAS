/**
 * Phase 4: Investigation Dossier + Enforcement Referral
 *
 * Workflow: INVESTIGATION (VerificationCase) -> OFFICER DECISION ->
 * REVIEW DOSSIER -> HUMAN APPROVAL -> CREATE REFERRAL -> TRACK STATUS -> AUDIT.
 *
 * Every write here is a real, human-triggered action tied to a real user
 * (req.user.userId) and logged to the append-only AuditEvent log. Nothing
 * in this file auto-generates a referral or auto-escalates based on a risk
 * score — see referralService.ts for why the legacy auto-escalate path was
 * deliberately not ported.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import {
  ReferralService,
  AuditService,
  NotFoundError,
  ValidationError,
  REFERRAL_AUTHORITIES,
  type ReferralAuthorityCode,
} from '@vojas/domain';
import { UserRole, PERMISSIONS, AuditAction } from '@vojas/shared';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();
const referralService = new ReferralService(prisma);
const auditService = new AuditService(prisma);

function viewerFromReq(req: Request) {
  const user = req.user!;
  return { userId: user.userId, role: user.role, mpHasOversight: user.role === UserRole.MP };
}

// ──────────────────────────────────────────────────────────────────
// INVESTIGATIONS (VerificationCase)
// ──────────────────────────────────────────────────────────────────

/**
 * POST /investigations — open a new investigation case for a project.
 * Optionally links to a RiskFinding that prompted it.
 */
router.post('/', authenticate, requirePermission(PERMISSIONS.CASE_CREATE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, findingId, type, priority, notes } = req.body as {
      projectId?: string; findingId?: string; type?: string; priority?: string; notes?: string;
    };
    if (!projectId || !type) throw new ValidationError('projectId and type are required');

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundError('Project');

    if (findingId) {
      const finding = await prisma.riskFinding.findUnique({ where: { id: findingId }, select: { id: true } });
      if (!finding) throw new NotFoundError('RiskFinding');
    }

    const verificationCase = await prisma.verificationCase.create({
      data: {
        projectId,
        findingId: findingId ?? null,
        type,
        priority: priority ?? 'MEDIUM',
        notes: notes ?? null,
        status: 'OPEN',
      },
    });

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.VERIFICATION_CASE_CREATED,
      entityType: 'VerificationCase',
      entityId: verificationCase.id,
      metadata: { projectId, findingId: findingId ?? null, type },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    created(res, verificationCase);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /investigations — list cases with filters
 */
router.get('/', authenticate, requirePermission(PERMISSIONS.FINDING_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, projectId, page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(50, parseInt(limit, 10));

    const [data, total] = await Promise.all([
      prisma.verificationCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
      prisma.verificationCase.count({ where }),
    ]);

    success(res, { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /investigations/:id — case detail
 */
router.get('/:id', authenticate, requirePermission(PERMISSIONS.FINDING_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const verificationCase = await prisma.verificationCase.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, state: true, district: true } },
        assignedTo: { select: { id: true, name: true } },
        finding: { select: { id: true, title: true, severity: true, status: true } },
      },
    });
    if (!verificationCase) throw new NotFoundError('VerificationCase');
    success(res, verificationCase);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /investigations/:id/dossier — full investigation dossier.
 * Never accessible to CITIZEN/CONTRACTOR — this is a government/
 * investigator-only surface.
 */
router.get(
  '/:id/dossier',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER, UserRole.ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const dossier = await referralService.getInvestigationDossier(id, viewerFromReq(req));
      success(res, dossier);
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// ENFORCEMENT REFERRALS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /investigations/authorities — configured destination authorities
 */
router.get('/meta/authorities', authenticate, requirePermission(PERMISSIONS.REFERRAL_READ), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, { authorities: REFERRAL_AUTHORITIES });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /investigations/:id/referrals — draft a referral from this case.
 * Status starts at DRAFT. Requires a separate approval action
 * (POST /referrals/:id/approve, REFERRAL_APPROVE permission) before it can
 * move to REFERRED — drafting alone never notifies or refers anyone.
 */
router.post(
  '/:id/referrals',
  authenticate,
  requirePermission(PERMISSIONS.REFERRAL_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseId = req.params.id as string;
      const { destinationAuthority, reason } = req.body as { destinationAuthority?: string; reason?: string };
      if (!destinationAuthority || !reason) {
        throw new ValidationError('destinationAuthority and reason are required');
      }
      // Real type guard against the same list createReferral itself checks,
      // rather than an `as any` cast that would have suppressed the compiler
      // for any typo here, not just widened this one field.
      const isValidAuthority = (v: string): v is ReferralAuthorityCode =>
        REFERRAL_AUTHORITIES.some((a) => a.code === v);
      if (!isValidAuthority(destinationAuthority)) {
        throw new ValidationError(
          `Unknown destination authority: ${destinationAuthority}. Must be one of: ${REFERRAL_AUTHORITIES.map((a) => a.code).join(', ')}`
        );
      }

      const referral = await referralService.createReferral({
        caseId,
        destinationAuthority,
        reason,
        preparedById: req.user!.userId,
        viewer: viewerFromReq(req),
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.REFERRAL_CREATED,
        entityType: 'Referral',
        entityId: referral.id,
        metadata: { caseId, destinationAuthority, referenceNo: referral.referenceNo },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      created(res, referral);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /investigations/:id/referrals — referrals prepared from this case
 */
router.get('/:id/referrals', authenticate, requirePermission(PERMISSIONS.REFERRAL_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.id as string;
    const referrals = await prisma.referral.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        preparedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    success(res, { data: referrals, total: referrals.length });
  } catch (err) {
    next(err);
  }
});

export default router;
