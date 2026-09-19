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
        bySectorCount: [],
        recentActivity: [],
      });
    }

    const id = mp.id;
    const [total, completed, inProgress, delayed, financial, attentionNeeded, recentEvents, bySector] = await Promise.all([
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
      // Real per-sector project counts, not the Math.random() placeholder
      // the MP home page used to render.
      prisma.project.groupBy({ by: ['sector'], where: { mpId: id }, _count: true }),
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
      bySectorCount: bySector.map((s) => ({ sector: s.sector, count: s._count })),
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

/**
 * GET /mp/me/projects — paginated project list for the authenticated user's
 * own linked MP. Mirrors GET /mps/:id/projects (the public MP directory's
 * existing working route) but resolves the MP from the session instead of
 * a client-supplied id, and adds sanctionedAmount/progressPercent so the
 * MP project list and map pages have real values instead of undefined.
 */
router.get('/me/projects', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mp = await resolveLinkedMp(req.user!.userId);
    if (!mp) {
      return success(res, { linked: false, data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    }

    const { status, sector, district, search, page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where: Record<string, unknown> = { mpId: mp.id };
    if (status) where.status = status;
    if (sector) where.sector = sector;
    if (district) where.district = district;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          name: true,
          description: true,
          sector: true,
          status: true,
          state: true,
          district: true,
          constituency: true,
          mpId: true,
          approvedAmount: true,
          spentAmount: true,
          latitude: true,
          longitude: true,
          startDate: true,
          expectedEndDate: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.project.count({ where }),
    ]);

    // Latest reported progress per project, from real dated/sourced
    // ProgressObservation rows — never a fabricated percentage.
    const observations = await prisma.progressObservation.findMany({
      where: { projectId: { in: projects.map((p) => p.id) } },
      orderBy: { reportDate: 'desc' },
      select: { projectId: true, reportedProgress: true },
    });
    const latestProgress = new Map<string, number>();
    for (const obs of observations) {
      if (!latestProgress.has(obs.projectId)) latestProgress.set(obs.projectId, obs.reportedProgress);
    }

    success(res, {
      linked: true,
      data: projects.map((p) => ({
        ...p,
        sanctionedAmount: p.approvedAmount,
        progressPercent: latestProgress.get(p.id) ?? null,
        startDate: p.startDate?.toISOString(),
        expectedEndDate: p.expectedEndDate?.toISOString(),
        completedAt: p.completedAt?.toISOString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mp/me/signals — real citizen reports linked (via Report.projectId)
 * to one of this MP's projects. A report with no project cannot be honestly
 * attributed to any MP's constituency, so it is excluded rather than guessed
 * at from free-text location fields.
 */
router.get('/me/signals', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mp = await resolveLinkedMp(req.user!.userId);
    if (!mp) {
      return success(res, { linked: false, data: [], total: 0, pendingCount: 0, page: 1, limit: 20, totalPages: 0 });
    }

    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const where = { project: { mpId: mp.id } };

    const [reports, total, pendingCount] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          title: true,
          description: true,
          locationDesc: true,
          latitude: true,
          longitude: true,
          status: true,
          submittedAt: true,
          projectId: true,
          project: { select: { id: true, name: true, sector: true } },
        },
      }),
      prisma.report.count({ where }),
      prisma.report.count({ where: { ...where, status: 'SUBMITTED' } }),
    ]);

    success(res, {
      linked: true,
      // Every row here is a real Report — there is no CLAIM/FEEDBACK source
      // in the schema, so `type` is honestly always REPORT, never invented.
      data: reports.map((r) => ({
        id: r.id,
        type: 'REPORT' as const,
        title: r.title,
        description: r.description,
        location: r.locationDesc ?? undefined,
        latitude: r.latitude ?? undefined,
        longitude: r.longitude ?? undefined,
        sector: r.project?.sector,
        status: r.status,
        submittedAt: r.submittedAt.toISOString(),
        projectId: r.projectId ?? undefined,
        projectName: r.project?.name,
      })),
      total,
      pendingCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mp/me/demand-clusters — real citizen reports for this MP's projects,
 * grouped by (sector, location). There is no geospatial clustering engine
 * in this codebase, so "cluster" here means an honest group-by over real
 * rows, not a spatial algorithm; intensity is a deterministic bucket over
 * the real request count, not an invented severity score.
 */
router.get('/me/demand-clusters', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mp = await resolveLinkedMp(req.user!.userId);
    if (!mp) {
      return success(res, { linked: false, data: [] });
    }

    const reports = await prisma.report.findMany({
      where: { project: { mpId: mp.id } },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        locationDesc: true,
        latitude: true,
        longitude: true,
        project: { select: { sector: true } },
      },
    });

    interface Group {
      location: string;
      sector: string;
      latitude: number | null;
      longitude: number | null;
      requests: typeof reports;
    }
    const groups = new Map<string, Group>();
    for (const r of reports) {
      const sector = r.project?.sector ?? 'OTHER';
      const location = r.locationDesc?.trim() || 'Unspecified Location';
      const key = `${sector}::${location}`;
      let group = groups.get(key);
      if (!group) {
        group = { location, sector, latitude: r.latitude ?? null, longitude: r.longitude ?? null, requests: [] };
        groups.set(key, group);
      }
      if (group.latitude == null && r.latitude != null) {
        group.latitude = r.latitude;
        group.longitude = r.longitude;
      }
      group.requests.push(r);
    }

    const clusters = Array.from(groups.entries())
      .map(([id, g]) => ({
        id,
        location: g.location,
        latitude: g.latitude,
        longitude: g.longitude,
        requestCount: g.requests.length,
        sector: g.sector,
        // The most recent report's title stands in for "primary issue" — a
        // real citizen submission, not an invented summary.
        primaryIssue: g.requests[0]?.title ?? g.location,
        intensity: g.requests.length >= 5 ? 'HIGH' as const : g.requests.length >= 2 ? 'MEDIUM' as const : 'LOW' as const,
        recentRequests: g.requests.slice(0, 5).map((r) => ({
          id: r.id,
          description: r.title,
          submittedAt: r.submittedAt.toISOString(),
        })),
      }))
      .sort((a, b) => b.requestCount - a.requestCount);

    success(res, { linked: true, data: clusters });
  } catch (err) {
    next(err);
  }
});

export default router;
