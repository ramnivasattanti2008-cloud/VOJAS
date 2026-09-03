import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import {
  AuditService,
  NotFoundError,
  ValidationError,
  reportListSchema,
  reportSubmitSchema,
  reportAssignSchema,
  reportResolveSchema,
} from '@vojas/domain';
import { AuditAction, UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();
const auditService = new AuditService(prisma);

/**
 * GET /reports — list with filters
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportListSchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.errors);

    const f = parsed.data;
    const where: Record<string, unknown> = {};
    if (f.status) where.status = f.status;
    if (f.category) where.category = f.category;
    if (f.severity) where.severity = f.severity;
    if (f.projectId) where.projectId = f.projectId;

    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (f.page - 1) * f.limit,
        take: f.limit,
        include: {
          project: { select: { id: true, name: true, state: true, district: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    success(res, { data, total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reports/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, state: true, district: true } },
        statusLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!report) throw new NotFoundError('Report');
    success(res, report);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports — public (citizen submission)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportSubmitSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid report data', parsed.error.errors);

    const report = await prisma.report.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        severity: parsed.data.severity,
        locationDesc: parsed.data.locationDesc ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        projectId: parsed.data.projectId ?? null,
        reporterName: parsed.data.isAnonymous ? null : (parsed.data.reporterName ?? null),
        reporterEmail: parsed.data.isAnonymous ? null : (parsed.data.reporterEmail ?? null),
        reporterPhone: parsed.data.isAnonymous ? null : (parsed.data.reporterPhone ?? null),
        isAnonymous: parsed.data.isAnonymous,
        source: 'WEB',
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    // Log if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await auditService.logEvent({
        actorId: 'anonymous',
        actorType: 'CITIZEN',
        action: AuditAction.REPORT_SUBMITTED,
        entityType: 'Report',
        entityId: report.id,
        metadata: { title: report.title, category: report.category },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    created(res, report);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports/:id/assign — OFFICER+
 */
router.post(
  '/:id/assign',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const parsed = reportAssignSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid assignment', parsed.error.errors);

      const existing = await prisma.report.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Report');

      // Verify assignee exists
      const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
      if (!assignee) throw new NotFoundError('User');

      const updated = await prisma.report.update({
        where: { id },
        data: { status: 'ASSIGNED', assignedToId: parsed.data.assignedToId },
      });

      // Status log
      await prisma.reportStatusLog.create({
        data: {
          reportId: id,
          fromStatus: existing.status,
          toStatus: 'ASSIGNED',
          changedById: req.user!.userId,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.REPORT_ASSIGNED,
        entityType: 'Report',
        entityId: id,
        metadata: { assignedTo: parsed.data.assignedToId },
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
 * POST /reports/:id/resolve — OFFICER+
 */
router.post(
  '/:id/resolve',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const parsed = reportResolveSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid resolution', parsed.error.errors);

      const existing = await prisma.report.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Report');

      const updated = await prisma.report.update({
        where: { id },
        data: { status: 'RESOLVED', resolvedAt: new Date(), resolution: parsed.data.resolution },
      });

      await prisma.reportStatusLog.create({
        data: {
          reportId: id,
          fromStatus: existing.status,
          toStatus: 'RESOLVED',
          changedById: req.user!.userId,
          notes: parsed.data.resolution,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.REPORT_RESOLVED,
        entityType: 'Report',
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

export default router;
