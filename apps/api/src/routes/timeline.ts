import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError } from '@vojas/domain';
import { authenticate } from '../middleware/auth.js';
import { success } from '../utils/apiResponse.js';

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

      const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'))));

      const [events, total] = await prisma.$transaction([
        prisma.projectEvent.findMany({
          where: { projectId: id },
          orderBy: { eventDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.projectEvent.count({ where: { projectId: id } }),
      ]);

      success(res, {
        data: events,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
