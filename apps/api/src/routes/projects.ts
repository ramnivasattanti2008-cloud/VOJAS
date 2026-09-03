import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { AuditService, ValidationError, NotFoundError } from '@vojas/domain';
import { AuditAction } from '@vojas/shared';
import {
  createProjectSchema,
  projectFiltersSchema,
} from '@vojas/domain';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();
const auditService = new AuditService(prisma);

/**
 * GET /projects — authenticated
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = projectFiltersSchema.safeParse({
      ...req.query,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
    });
    if (!filters.success) {
      throw new ValidationError('Invalid query parameters', filters.error.errors);
    }

    const p = filters.data;
    const where: Record<string, unknown> = {};
    if (p.state) where.state = p.state;
    if (p.district) where.district = p.district;
    if (p.constituency) where.constituency = p.constituency;
    if (p.sector) where.sector = p.sector;
    if (p.status) where.status = p.status;
    if (p.minAmount !== undefined || p.maxAmount !== undefined) {
      where.approvedAmount = {};
      if (p.minAmount !== undefined) (where.approvedAmount as Record<string, number>).gte = p.minAmount;
      if (p.maxAmount !== undefined) (where.approvedAmount as Record<string, number>).lte = p.maxAmount;
    }
    if (p.search) {
      where.OR = [
        { name: { contains: p.search, mode: 'insensitive' } },
        { description: { contains: p.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = p.sortBy
      ? { [p.sortBy]: p.sortOrder as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    const [data, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy,
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      prisma.project.count({ where }),
    ]);

    success(res, {
      data,
      total,
      page: p.page,
      limit: p.limit,
      totalPages: Math.ceil(total / p.limit),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects — OFFICER+
 */
router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid project data', parsed.error.errors);
      }

      const project = await prisma.project.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          status: parsed.data.status,
          sector: parsed.data.sector,
          district: parsed.data.district,
          state: parsed.data.state,
          constituency: parsed.data.constituency ?? null,
          approvedAmount: parsed.data.approvedAmount,
          spentAmount: parsed.data.spentAmount ?? 0,
          contractor: parsed.data.contractor ?? null,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
          expectedEndDate: parsed.data.expectedEndDate ? new Date(parsed.data.expectedEndDate) : null,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          source: parsed.data.source,
          sourceWorkId: parsed.data.sourceWorkId ?? null,
          createdById: req.user!.userId,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.PROJECT_CREATED,
        entityType: 'Project',
        entityId: project.id,
        metadata: { name: project.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      created(res, project);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id — authenticated
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundError('Project');
    }
    success(res, project);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /projects/:id — OFFICER+
 */
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Project');
      }

      const data: Record<string, unknown> = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.status !== undefined) data.status = req.body.status;
      if (req.body.sector !== undefined) data.sector = req.body.sector;
      if (req.body.approvedAmount !== undefined) data.approvedAmount = req.body.approvedAmount;
      if (req.body.spentAmount !== undefined) data.spentAmount = req.body.spentAmount;
      if (req.body.contractor !== undefined) data.contractor = req.body.contractor;
      if (req.body.latitude !== undefined) data.latitude = req.body.latitude;
      if (req.body.longitude !== undefined) data.longitude = req.body.longitude;
      if (req.body.startDate !== undefined) data.startDate = new Date(req.body.startDate);
      if (req.body.expectedEndDate !== undefined) data.expectedEndDate = new Date(req.body.expectedEndDate);

      const project = await prisma.project.update({ where: { id }, data });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.PROJECT_UPDATED,
        entityType: 'Project',
        entityId: id,
        metadata: { fields: Object.keys(data) },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, project);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /projects/:id — ADMIN only
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Project');
      }

      await prisma.project.delete({ where: { id } });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.PROJECT_DELETED,
        entityType: 'Project',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
