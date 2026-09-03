import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError } from '@vojas/domain';
import { authenticate } from '../middleware/auth';
import { success } from '../utils/apiResponse';

const router = Router();

/**
 * GET /projects/:id/timeline — authenticated
 */
router.get(
  '/projects/:id/timeline',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError('Project');
      }

      const events = await prisma.projectEvent.findMany({
        where: { projectId: id },
        orderBy: { eventDate: 'desc' },
      });

      success(res, events);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
