/**
 * Admin Routes — System Statistics, Audit Trail, Risk Overview, User Management
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { success } from '../utils/apiResponse';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ── GET /admin/stats — system-wide statistics ───────────────────────────────

router.get('/stats', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalProjects,
      completedProjects,
      inProgressProjects,
      delayedProjects,
      totalAnomalies,
      openAnomalies,
      totalReports,
      pendingReports,
      totalUsers,
      activeUsers,
      totalVendors,
      totalSatelliteObs,
      financial,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'IN_PROGRESS', expectedEndDate: { lt: new Date() } } }),
      prisma.anomaly.count(),
      prisma.anomaly.count({ where: { status: 'OPEN' } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: { in: ['SUBMITTED', 'RECEIVED', 'TRIAGED', 'UNDER_VERIFICATION'] } } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.vendor.count(),
      prisma.satelliteObservation.count(),
      prisma.project.aggregate({
        _sum: { approvedAmount: true, spentAmount: true },
      }),
    ]);

    success(res, {
      projects: {
        total: totalProjects,
        completed: completedProjects,
        inProgress: inProgressProjects,
        delayed: delayedProjects,
        completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
      },
      anomalies: {
        total: totalAnomalies,
        open: openAnomalies,
        resolvedRate: totalAnomalies > 0 ? ((totalAnomalies - openAnomalies) / totalAnomalies) * 100 : 0,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        pendingRate: totalReports > 0 ? (pendingReports / totalReports) * 100 : 0,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      vendors: {
        total: totalVendors,
      },
      satellite: {
        totalObservations: totalSatelliteObs,
      },
      financial: {
        totalSanctioned: Number(financial._sum.approvedAmount ?? 0),
        totalSpent: Number(financial._sum.spentAmount ?? 0),
        utilizationRate: financial._sum.approvedAmount
          ? (Number(financial._sum.spentAmount ?? 0) / Number(financial._sum.approvedAmount)) * 100
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/audit — recent audit events ─────────────────────────────────

router.get('/audit', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);

    const events = await prisma.auditEvent.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    success(res, events);
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/alerts — active risk alerts summary ──────────────────────────

router.get('/alerts', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const severity = req.query.severity as string | undefined;

    const where: any = {};
    if (severity) where.severity = severity;

    const [openAnomalies, recentHighSeverity, byCategory] = await Promise.all([
      prisma.anomaly.findMany({
        where: { status: 'OPEN', ...where },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: {
          project: {
            select: { id: true, name: true, sector: true, state: true, district: true },
          },
        },
      }),
      prisma.anomaly.findMany({
        where: { status: 'OPEN', severity: { in: ['HIGH', 'CRITICAL'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, severity: true, category: true, projectId: true },
      }),
      prisma.anomaly.groupBy({
        by: ['category'],
        where: { status: 'OPEN' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const byStatus = await prisma.anomaly.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    success(res, {
      openAnomalies,
      recentHighSeverity,
      byCategory: byCategory.map((t) => ({ category: t.category, count: t._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      totalOpen: openAnomalies.length,
      totalHighSeverity: recentHighSeverity.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/users — user list ─────────────────────────────────────────────

router.get('/users', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    success(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/activity — recent activity summary ───────────────────────────

router.get('/activity', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.max(1, Math.min(parseInt(String(req.query.days ?? '7'), 10), 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      newProjects,
      newReports,
      newAnomalies,
      resolvedAnomalies,
      newUsers,
      auditEvents,
    ] = await Promise.all([
      prisma.project.count({ where: { createdAt: { gte: since } } }),
      prisma.report.count({ where: { createdAt: { gte: since } } }),
      prisma.anomaly.count({ where: { createdAt: { gte: since } } }),
      prisma.anomaly.count({ where: { resolvedAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.auditEvent.count({ where: { timestamp: { gte: since } } }),
    ]);

    // Daily breakdown for projects
    const startDate = since.toISOString().split('T')[0];
    const dailyProjects = await prisma.$queryRaw<any[]>`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM projects
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    success(res, {
      period: { days, since: since.toISOString() },
      summary: {
        newProjects,
        newReports,
        newAnomalies,
        resolvedAnomalies,
        newUsers,
        auditEvents,
      },
      dailyProjects: dailyProjects.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
        count: Number(r.count),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
