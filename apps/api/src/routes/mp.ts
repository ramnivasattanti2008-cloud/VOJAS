/**
 * MP Command Center — real aggregates for the authenticated user's own
 * linked MP.
 *
 * Backs the frontend's createMpApi (packages/api-client/src/mp.ts), which
 * previously had no backend route at all — GET /mp/:id/financials and
 * /mp/:id/constituency always 404'd, and the frontend's fallback rendered
 * Math.random() fabricated rupee figures.
 *
 * Resolution is strictly server-side: the MP is derived from
 * `User.mpId`, an explicit, admin-controlled link (see routes/users.ts) —
 * never from a client-supplied :id. A user with no linked MP gets an
 * honest `linked: false` in the response, never another user's data and
 * never a fabricated fallback. mpId is re-read from the database on every
 * request (not the JWT) so an admin's link/unlink takes effect immediately,
 * without requiring the MP to log out and back in.
 */

import { prisma } from '@vojas/db';
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

async function resolveLinkedMp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mpId: true } });
  if (!user?.mpId) return null;
  return prisma.mP.findUnique({ where: { id: user.mpId } });
}

/**
 * GET /mp/me/constituency — real project-portfolio summary for the
 * authenticated user's own linked MP.
 */
router.get('/me/constituency', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mp = await resolveLinkedMp(req.user!.userId);
    if (!mp) {
      return success(res, {
        linked: false,
        mpId: null,
        constituency: null,
        state: null,
        house: null,
        totalProjects: 0,
        completedProjects: 0,
        inProgressProjects: 0,
        delayedProjects: 0,
        attentionNeeded: 0,
        totalSanctioned: 0,
        totalSpent: 0,
        utilizationRate: 0,
        recentActivity: [],
      });
    }

    const id = mp.id;
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
      linked: true,
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
 * GET /mp/me/financials — real financial rollup for the authenticated
 * user's own linked MP.
 */
router.get('/me/financials', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mp = await resolveLinkedMp(req.user!.userId);
    if (!mp) {
      return success(res, {
        linked: false,
        totalSanctioned: 0,
        totalReleased: null,
        totalSpent: 0,
        utilizationPercent: 0,
        bySector: [],
        byMonth: [],
      });
    }

    const id = mp.id;
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
      linked: true,
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
