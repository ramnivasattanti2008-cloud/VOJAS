import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { AuditService } from '@vojas/domain';
import { ValidationError, NotFoundError, ForbiddenError } from '@vojas/domain';
import { AuditAction } from '@vojas/shared';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();
const auditService = new AuditService(prisma);

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
}).strict();

/**
 * GET /users — ADMIN only
 */
router.get(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      success(res, users);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /users/:id — authenticated (self or ADMIN)
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const currentUser = req.user!;

      if (currentUser.userId !== id && currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenError('view other user profiles');
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      success(res, user);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /users — ADMIN only
 */
router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hashPassword } = await import('../auth/password');
      const { registerSchema } = await import('@vojas/domain');
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid user data', parsed.error.errors);
      }

      const { email, password, name, role } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new ValidationError('User with this email already exists');
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: { email, passwordHash, name, role: (role ?? UserRole.VIEWER) as any },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.USER_CREATED,
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      created(res, user);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /users/:id — authenticated (self or ADMIN)
 */
router.patch(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const currentUser = req.user!;

      if (currentUser.userId !== id && currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenError('update other users');
      }

      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid update data', parsed.error.errors);
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('User');
      }

      const data: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
      if (parsed.data.role !== undefined && currentUser.role === UserRole.ADMIN) {
        data.role = parsed.data.role as any;
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      await auditService.logEvent({
        actorId: currentUser.userId,
        actorType: 'USER',
        action: AuditAction.USER_UPDATED,
        entityType: 'User',
        entityId: id,
        metadata: { fields: Object.keys(parsed.data) },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
