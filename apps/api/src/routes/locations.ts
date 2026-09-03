import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { addLocationSchema } from '@vojas/domain';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();

/**
 * GET /projects/:id/locations — authenticated
 */
router.get(
  '/projects/:id/locations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError('Project');
      }

      const locations = await prisma.projectLocation.findMany({
        where: { projectId: id },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      });

      success(res, locations);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /projects/:id/locations — OFFICER+
 */
router.post(
  '/projects/:id/locations',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError('Project');
      }

      const parsed = addLocationSchema.safeParse({
        ...req.body,
        projectId: id,
      });
      if (!parsed.success) {
        throw new ValidationError('Invalid location data', parsed.error.errors);
      }

      const location = await prisma.projectLocation.create({
        data: {
          projectId: id,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          label: parsed.data.label ?? null,
          address: parsed.data.address ?? null,
          isPrimary: parsed.data.isPrimary,
        },
      });

      created(res, location);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
