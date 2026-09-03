import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../auth/rbac';
import { Permissions } from '../auth/rbac';
import { success } from '../utils/apiResponse';

const router = Router();

const querySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /audit — ADMIN or AUDIT_READ permission
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permissions.AUDIT_READ, Permissions.SYSTEM_CONFIG),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
        });
        return;
      }

      const where: Record<string, unknown> = {};
      if (parsed.data.actorId) where.actorId = parsed.data.actorId;
      if (parsed.data.action) where.action = parsed.data.action;
      if (parsed.data.entityType) where.entityType = parsed.data.entityType;
      if (parsed.data.entityId) where.entityId = parsed.data.entityId;

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: parsed.data.limit,
          skip: parsed.data.offset,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      success(res, {
        data: events,
        total,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
