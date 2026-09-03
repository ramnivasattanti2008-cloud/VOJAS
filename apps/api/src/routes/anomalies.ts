import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import type { Prisma } from '@vojas/db';
import {
  AuditService,
  NotFoundError,
  ValidationError,
  anomalyListSchema,
  anomalyResolveSchema,
  anomalyEscalateSchema,
  anomalyCreateSchema,
} from '@vojas/domain';
import { AuditAction, UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();
const auditService = new AuditService(prisma);

/**
 * GET /anomalies — list with filters
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = anomalyListSchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.errors);

    const f = parsed.data;
    const where: Record<string, unknown> = {};
    if (f.status) where.status = f.status;
    if (f.severity) where.severity = f.severity;
    if (f.category) where.category = f.category;
    if (f.projectId) where.projectId = f.projectId;

    const [data, total] = await prisma.$transaction([
      prisma.anomaly.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (f.page - 1) * f.limit,
        take: f.limit,
        include: { project: { select: { id: true, name: true, state: true, district: true } } },
      }),
      prisma.anomaly.count({ where }),
    ]);

    success(res, {
      data,
      total,
      page: f.page,
      limit: f.limit,
      totalPages: Math.ceil(total / f.limit),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /anomalies/stats — dashboard stats
 */
router.get('/stats', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [byStatus, bySeverity, byCategory, recent] = await Promise.all([
      prisma.anomaly.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.anomaly.groupBy({ by: ['severity'], _count: { _all: true } }),
      prisma.anomaly.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.anomaly.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    success(res, { byStatus, bySeverity, byCategory, last7Days: recent });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /anomalies/:id — fetch one
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const anomaly = await prisma.anomaly.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, state: true, district: true } },
      },
    });
    if (!anomaly) throw new NotFoundError('Anomaly');
    success(res, anomaly);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /anomalies — OFFICER+
 */
router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = anomalyCreateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid anomaly data', parsed.error.errors);

      const anomaly = await prisma.anomaly.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          severity: parsed.data.severity,
          projectId: parsed.data.projectId ?? null,
          ruleCode: parsed.data.ruleCode ?? null,
          evidence: (parsed.data.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.ANOMALY_CREATED,
        entityType: 'Anomaly',
        entityId: anomaly.id,
        metadata: { title: anomaly.title, category: anomaly.category },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      created(res, anomaly);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /anomalies/:id/acknowledge — ANALYST+
 */
router.post(
  '/:id/acknowledge',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.anomaly.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Anomaly');

      const updated = await prisma.anomaly.update({
        where: { id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedById: req.user!.userId,
          acknowledgedAt: new Date(),
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.ANOMALY_ACKNOWLEDGED,
        entityType: 'Anomaly',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /anomalies/:id/resolve — OFFICER+
 */
router.post(
  '/:id/resolve',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const parsed = anomalyResolveSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid resolution', parsed.error.errors);

      const existing = await prisma.anomaly.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Anomaly');

      const updated = await prisma.anomaly.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedById: req.user!.userId,
          resolvedAt: new Date(),
          resolution: parsed.data.resolution,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.ANOMALY_RESOLVED,
        entityType: 'Anomaly',
        entityId: id,
        metadata: { resolution: parsed.data.resolution },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /anomalies/:id/escalate — OFFICER+ (law enforcement)
 */
router.post(
  '/:id/escalate',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const parsed = anomalyEscalateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid escalation data', parsed.error.errors);

      const existing = await prisma.anomaly.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Anomaly');

      const updated = await prisma.anomaly.update({
        where: { id },
        data: {
          status: 'ESCALATED',
          lawEscalation: true,
          lawAuthority: parsed.data.authority ?? null,
          lawEscalatedAt: new Date(),
          lawEscalatedById: req.user!.userId,
          lawNotes: parsed.data.notes ?? null,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.ANOMALY_ESCALATED,
        entityType: 'Anomaly',
        entityId: id,
        metadata: { authority: parsed.data.authority },
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
