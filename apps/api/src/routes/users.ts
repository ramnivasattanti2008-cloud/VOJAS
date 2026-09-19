import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { AuditService } from '@vojas/domain';
import { ValidationError, NotFoundError, ForbiddenError } from '@vojas/domain';
import { AuditAction } from '@vojas/shared';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();
const auditService = new AuditService(prisma);

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  // Admin-controlled link to the MP record this user account represents.
  // null explicitly unlinks. Applied only when the actor is ADMIN — see the
  // same-pattern role guard below. Never settable by a user on themselves.
  mpId: z.string().min(1).nullable().optional(),
  // Same pattern, for the CONTRACTOR record this user account represents.
  contractorId: z.string().min(1).nullable().optional(),
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
          mpId: true,
          contractorId: true,
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
          mpId: true,
          contractorId: true,
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
      const { hashPassword } = await import('../auth/password.js');
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
        data: { email, passwordHash, name, role: role ?? UserRole.VIEWER },
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
        data.role = parsed.data.role;
      }
      if (parsed.data.mpId !== undefined && currentUser.role === UserRole.ADMIN) {
        if (parsed.data.mpId === null) {
          data.mpId = null;
        } else {
          const mp = await prisma.mP.findUnique({ where: { id: parsed.data.mpId } });
          if (!mp) throw new ValidationError('mpId does not reference a real MP record');

          const effectiveRole = parsed.data.role ?? existing.role;
          if (effectiveRole !== UserRole.MP) {
            throw new ValidationError('mpId can only be set on a user with role MP');
          }

          const alreadyLinked = await prisma.user.findFirst({
            where: { mpId: parsed.data.mpId, id: { not: id } },
            select: { id: true, email: true },
          });
          if (alreadyLinked) {
            throw new ValidationError(`This MP record is already linked to another user (${alreadyLinked.email})`);
          }

          data.mpId = parsed.data.mpId;
        }
      }
      if (parsed.data.contractorId !== undefined && currentUser.role === UserRole.ADMIN) {
        if (parsed.data.contractorId === null) {
          data.contractorId = null;
        } else {
          const contractor = await prisma.contractor.findUnique({ where: { id: parsed.data.contractorId } });
          if (!contractor) throw new ValidationError('contractorId does not reference a real Contractor record');

          const effectiveRole = parsed.data.role ?? existing.role;
          if (effectiveRole !== UserRole.CONTRACTOR) {
            throw new ValidationError('contractorId can only be set on a user with role CONTRACTOR');
          }

          const alreadyLinked = await prisma.user.findFirst({
            where: { contractorId: parsed.data.contractorId, id: { not: id } },
            select: { id: true, email: true },
          });
          if (alreadyLinked) {
            throw new ValidationError(`This contractor record is already linked to another user (${alreadyLinked.email})`);
          }

          data.contractorId = parsed.data.contractorId;
        }
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
          mpId: true,
          contractorId: true,
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
