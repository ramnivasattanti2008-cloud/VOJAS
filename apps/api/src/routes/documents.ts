import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { AuditAction, UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();

/**
 * GET /documents — list all documents
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const projectId = req.query.projectId as string | undefined;

    const where = projectId ? { projectId } : {};
    const [data, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true, state: true, district: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    success(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /documents/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
    });
    if (!doc) throw new NotFoundError('Document');
    success(res, doc);
  } catch (err) {
    next(err);
  }
});

export default router;
