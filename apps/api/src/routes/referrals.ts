/**
 * Phase 4: Enforcement Referral — top-level referral management.
 * Case-scoped creation lives in investigations.ts (POST
 * /investigations/:id/referrals); this file covers list/get/approve/
 * reject/status-transition/history for referrals directly.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { ReferralService, AuditService, NotFoundError, ValidationError, isValidReferralTransition } from '@vojas/domain';
import type { ReferralStatus } from '@vojas/domain';
import { PERMISSIONS, AuditAction, UserRole } from '@vojas/shared';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.js';
import { success } from '../utils/apiResponse.js';

const router = Router();
const referralService = new ReferralService(prisma);
const auditService = new AuditService(prisma);

const VALID_STATUSES: ReferralStatus[] = [
  'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REFERRED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED',
];

/**
 * GET /referrals — list with filters
 */
router.get('/', authenticate, requirePermission(PERMISSIONS.REFERRAL_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, projectId, destinationAuthority, page, limit } = req.query as Record<string, string | undefined>;
    const result = await referralService.listReferrals({
      status,
      projectId,
      destinationAuthority,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /referrals/:id — referral detail, including the dossier snapshot
 * taken at draft time.
 */
router.get('/:id', authenticate, requirePermission(PERMISSIONS.REFERRAL_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referral = await referralService.getReferral(req.params.id as string);
    success(res, referral);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /referrals/:id/history — append-only audit trail for this referral
 */
router.get('/:id/history', authenticate, requirePermission(PERMISSIONS.REFERRAL_READ), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const events = (await auditService.getEventsForEntity('Referral', id)) as Array<{
      id: string;
      actorId: string;
      action: string;
      metadata: Record<string, unknown> | null;
      timestamp: Date;
    }>;
    const actorIds = [...new Set(events.map((e) => e.actorId))].filter((id2) => id2 !== 'SYSTEM' && id2 !== 'AI');
    const actors = actorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    success(res, {
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        performedById: e.actorId,
        performedBy: actorMap.get(e.actorId) ?? undefined,
        metadata: e.metadata,
        timestamp: e.timestamp.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /referrals/:id/approve — human approval, separate permission from
 * REFERRAL_CREATE so drafting officer and approving reviewer are distinct
 * capabilities (RBAC enforces the separation; this route does not check
 * that the approver differs from the preparer, since a single-officer
 * demo/small-office deployment is a legitimate real use case — the
 * permission split is the actual control).
 */
router.post('/:id/approve', authenticate, requirePermission(PERMISSIONS.REFERRAL_APPROVE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const updated = await referralService.approveReferral(id, req.user!.userId);

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.REFERRAL_APPROVED,
      entityType: 'Referral',
      entityId: id,
      metadata: { referenceNo: updated.referenceNo },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /referrals/:id/reject — human rejection at the review step (closes
 * the referral without ever moving it to REFERRED).
 */
router.post('/:id/reject', authenticate, requirePermission(PERMISSIONS.REFERRAL_APPROVE), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body as { notes?: string };
    if (!notes) throw new ValidationError('notes is required when rejecting a referral');

    const updated = await referralService.rejectReferral(id, notes);

    await auditService.logEvent({
      actorId: req.user!.userId,
      actorType: 'USER',
      action: AuditAction.REFERRAL_REJECTED,
      entityType: 'Referral',
      entityId: id,
      metadata: { notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /referrals/:id/status — advance an APPROVED+ referral through its
 * tracking lifecycle (REFERRED -> ACKNOWLEDGED -> UNDER_REVIEW ->
 * ACTION_TAKEN -> RESOLVED -> CLOSED). Any government role that can read
 * referrals may record these — they track what an external authority
 * reported back, not a new internal approval decision.
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { status, notes } = req.body as { status?: string; notes?: string };
      if (!status || !VALID_STATUSES.includes(status as ReferralStatus)) {
        throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      const existing = await prisma.referral.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Referral');
      if (!isValidReferralTransition(existing.status, status)) {
        throw new ValidationError(`Cannot transition from ${existing.status} to ${status}`);
      }

      const updated = await referralService.updateReferralStatus(id, status as ReferralStatus, notes);

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.REFERRAL_STATUS_CHANGED,
        entityType: 'Referral',
        entityId: id,
        metadata: { from: existing.status, to: status, notes: notes ?? null },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
