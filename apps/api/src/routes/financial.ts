import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError, FinancialIntelligenceService } from '@vojas/domain';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

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

const intelligenceService = new FinancialIntelligenceService(prisma);

// ─── Existing: List observations ───────────────────────────────────────────

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
      if (!project) throw new NotFoundError('Project');

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
      if (!project) throw new NotFoundError('Project');

      const parsed = createFinancialObsSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid financial data', parsed.error.errors);

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

// ─── M9: Financial Intelligence endpoints ──────────────────────────────────

/**
 * GET /projects/:id/financial/summary — Fund lifecycle tracking
 * Returns: SANCTIONED → ALLOCATED → RELEASED → COMMITTED → EXPENDED → REMAINING
 */
router.get(
  '/projects/:id/financial/summary',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const lifecycle = await intelligenceService.getFundLifecycle(id);
      success(res, lifecycle);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/financial/reconciliation — Cross-source reconciliation
 * Compares financial progress vs satellite/reported progress and documents
 */
router.get(
  '/projects/:id/financial/reconciliation',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const reconciliation = await intelligenceService.reconcile(id);
      success(res, reconciliation);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/financial/benchmarks — Peer benchmarking
 * Compares this project's unit cost vs sector/district/state/national peers
 * scope query param: sector | district | state | national
 */
router.get(
  '/projects/:id/financial/benchmarks',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const scope = (req.query.scope as string) || 'sector';
      if (!['sector', 'district', 'state', 'national'].includes(scope)) {
        throw new ValidationError('scope must be one of: sector, district, state, national');
      }
      const benchmark = await intelligenceService.benchmark(id, scope as 'sector' | 'district' | 'state' | 'national');
      success(res, benchmark);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/financial/signals — Financial risk signals for M8 engine
 * Generates 5 types of financial risk signals
 */
router.get(
  '/projects/:id/financial/signals',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const signals = await intelligenceService.generateRiskSignals(id);
      success(res, signals);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/financial/timeline — Financial timeline for Time Machine
 */
router.get(
  '/projects/:id/financial/timeline',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const timeline = await intelligenceService.getFinancialTimeline(id);
      success(res, timeline);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/financial/correlation — Cross-source correlation
 */
router.get(
  '/projects/:id/financial/correlation',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const correlation = await intelligenceService.correlateSources(id);
      success(res, correlation);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
