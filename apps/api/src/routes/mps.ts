import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { authenticate } from '../middleware/auth';
import { success } from '../utils/apiResponse';

const router = Router();

/**
 * GET /mps — list MPs
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = req.query.search as string | undefined;
    const state = req.query.state as string | undefined;
    const house = req.query.house as string | undefined;

    const where: Record<string, unknown> = {};
    if (state) where.state = state;
    if (house) where.house = house;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { constituency: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.mP.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { projects: true } },
        },
      }),
      prisma.mP.count({ where }),
    ]);

    success(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mps/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const mp = await prisma.mP.findUnique({
      where: { id },
      include: {
        _count: { select: { projects: true } },
        projects: {
          select: {
            id: true,
            name: true,
            state: true,
            district: true,
            status: true,
            approvedAmount: true,
            spentAmount: true,
          },
          take: 50,
        },
      },
    });
    if (!mp) throw new NotFoundError('MP');
    success(res, mp);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mps/:id/projects — paginated project list for an MP
 */
router.get('/:id/projects', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const mp = await prisma.mP.findUnique({ where: { id } });
    if (!mp) throw new NotFoundError('MP');

    const [data, total] = await prisma.$transaction([
      prisma.project.findMany({
        where: { mpId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
          status: true,
          sector: true,
          approvedAmount: true,
          spentAmount: true,
          createdAt: true,
        },
      }),
      prisma.project.count({ where: { mpId: id } }),
    ]);

    success(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

export default router;
