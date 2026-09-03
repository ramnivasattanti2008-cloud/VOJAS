import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();

const createFinancialObsSchema = z.object({
  date: z.string().datetime(),
  type: z.string().min(1),
  amount: z.number(),
  category: z.string().optional(),
  description: z.string().min(1),
  vendor: z.string().optional(),
  invoiceNo: z.string().optional(),
  paidOn: z.string().datetime().optional(),
  status: z.string().default('PENDING'),
  notes: z.string().optional(),
  source: z.string().min(1),
  sourceTxnId: z.string().optional(),
}).strict();

/**
 * GET /projects/:id/financial — authenticated
 */
router.get(
  '/projects/:id/financial',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError('Project');
      }

      const observations = await prisma.financialObservation.findMany({
        where: { projectId: id },
        orderBy: { date: 'desc' },
      });

      success(res, observations);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /projects/:id/financial — OFFICER+
 */
router.post(
  '/projects/:id/financial',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError('Project');
      }

      const parsed = createFinancialObsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid financial data', parsed.error.errors);
      }

      const observation = await prisma.financialObservation.create({
        data: {
          projectId: id,
          date: new Date(parsed.data.date),
          type: parsed.data.type,
          amount: parsed.data.amount,
          category: parsed.data.category ?? null,
          description: parsed.data.description,
          vendor: parsed.data.vendor ?? null,
          invoiceNo: parsed.data.invoiceNo ?? null,
          paidOn: parsed.data.paidOn ? new Date(parsed.data.paidOn) : null,
          status: parsed.data.status,
          notes: parsed.data.notes ?? null,
          source: parsed.data.source,
          sourceTxnId: parsed.data.sourceTxnId ?? null,
        },
      });

      created(res, observation);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
