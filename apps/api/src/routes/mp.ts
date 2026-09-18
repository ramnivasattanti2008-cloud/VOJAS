/**
 * MP Command Center — real aggregates for a single MP's own project portfolio.
 *
 * Backs the frontend's createMpApi (packages/api-client/src/mp.ts), which
 * previously had no backend route at all — GET /mp/:id/financials and
 * /mp/:id/constituency always 404'd, and the frontend's fallback rendered
 * Math.random() fabricated rupee figures. Every field here is a real
 * aggregate over Project/FinancialObservation/ProjectEvent rows for that MP;
 * fields with no real underlying data are null/empty, never backfilled.
 */

import { prisma } from '@vojas/db';
import { NotFoundError } from '@vojas/domain';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { success } from '../utils/apiResponse.js';

const router = Router();

const EVENT_TYPE_MAP: Record<string, 'REPORT' | 'VERIFICATION' | 'ANOMALY' | 'UPDATE'> = {
  CITIZEN_REPORT: 'REPORT',
  VERIFICATION: 'VERIFICATION',
  FIELD_INSPECTION: 'VERIFICATION',
  AI_ALERT: 'ANOMALY',
};

async function getMpOrThrow(id: string) {
  const mp = await prisma.mP.findUnique({ where: { id } });
  if (!mp) throw new NotFoundError('MP');
  return mp;
}

/**
 * GET /mp/:id/constituency — real project-portfolio summary for one MP.
 */
router.get('/:id/constituency', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const mp = await getMpOrThrow(id);

    const [total, completed, inProgress, delayed, financial, attentionNeeded, recentEvents] = await Promise.all([
      prisma.project.count({ where: { mpId: id } }),
      prisma.project.count({ where: { mpId: id, status: 'COMPLETED' } }),
      prisma.project.count({ where: { mpId: id, status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { mpId: id, status: 'IN_PROGRESS', expectedEndDate: { lt: new Date() } } }),
      prisma.project.aggregate({ where: { mpId: id }, _sum: { approvedAmount: true, spentAmount: true } }),
      // "Needs attention": genuinely delayed OR carries a real HIGH/CRITICAL risk score.
      // Never counts a project that simply hasn't been risk-scored yet.
      prisma.project.count({
        where: {
          mpId: id,
          OR: [
            { status: 'IN_PROGRESS', expectedEndDate: { lt: new Date() } },
            { projectRisk: { riskScore: { gte: 50 } } },
          ],
        },
      }),
      prisma.projectEvent.findMany({
        where: { project: { mpId: id } },
        orderBy: { eventDate: 'desc' },
        take: 10,
        select: { eventDate: true, eventType: true, description: true },
      }),
    ]);

    const totalSanctioned = financial._sum.approvedAmount ?? 0;
    const totalSpent = financial._sum.spentAmount ?? 0;

    success(res, {
      mpId: mp.id,
      constituency: mp.constituency,
      state: mp.state,
      house: mp.house,
      totalProjects: total,
      completedProjects: completed,
      inProgressProjects: inProgress,
      delayedProjects: delayed,
      attentionNeeded,
      totalSanctioned,
      totalSpent,
      utilizationRate: totalSanctioned > 0 ? Math.round((totalSpent / totalSanctioned) * 100) : 0,
      recentActivity: recentEvents.map((e) => ({
        date: e.eventDate.toISOString(),
        type: EVENT_TYPE_MAP[e.eventType] ?? 'UPDATE',
        description: e.description,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mp/:id/financials — real financial rollup for one MP's projects.
 */
router.get('/:id/financials', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await getMpOrThrow(id);

    const [financial, bySector, releaseAgg] = await Promise.all([
      prisma.project.aggregate({ where: { mpId: id }, _sum: { approvedAmount: true, spentAmount: true } }),
      prisma.project.groupBy({
        by: ['sector'],
        where: { mpId: id },
        _sum: { approvedAmount: true, spentAmount: true },
      }),
      // No RELEASE-type FinancialObservation rows exist for any project yet
      // (expenditure ingestion hasn't run) — count is checked explicitly so a
      // genuine zero-release project isn't confused with "not measured."
      prisma.financialObservation.aggregate({
        where: { project: { mpId: id }, type: 'RELEASE' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalSanctioned = financial._sum.approvedAmount ?? 0;
    const totalSpent = financial._sum.spentAmount ?? 0;
    const totalReleased = releaseAgg._count > 0 ? releaseAgg._sum.amount ?? 0 : null;

    success(res, {
      totalSanctioned,
      totalReleased,
      totalSpent,
      utilizationPercent: totalSanctioned > 0 ? Math.round((totalSpent / totalSanctioned) * 100) : 0,
      bySector: bySector.map((s) => {
        const sanctioned = s._sum.approvedAmount ?? 0;
        const spent = s._sum.spentAmount ?? 0;
        return {
          sector: s.sector,
          sanctioned,
          spent,
          utilization: sanctioned > 0 ? Math.round((spent / sanctioned) * 100) : 0,
        };
      }),
      // No real monthly disbursement timeline exists yet — that needs dated
      // FinancialObservation rows, not just project-level totals. An empty
      // array is honest; approximating it from project creation month would
      // misrepresent a sanction date as a spending timeline.
      byMonth: [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
