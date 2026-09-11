/**
 * Admin Routes — M14 API Security
 * System Statistics, Audit Trail, User Management, Health, Jobs
 *
 * All routes require admin.manage permission (enforced at route level in index.ts)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { ValidationError, NotFoundError } from '@vojas/domain';
import { success, created } from '../utils/apiResponse.js';
import { UserRole } from '@vojas/shared';

const router = Router();

// ── GET /admin/stats — system-wide statistics ───────────────────────────────

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
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

// ── GET /admin/system-overview — aggregated system overview for Control Center ─

router.get('/system-overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProjects,
      activeProjects,
      totalAnomalies,
      openAnomalies,
      criticalAnomalies,
      totalReports,
      pendingReports,
      totalUsers,
      activeUsers,
      totalSatelliteObs,
      recentAudits,
      recentJobs,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: { in: ['APPROVED', 'SANCTIONED', 'IN_PROGRESS'] } } }),
      prisma.anomaly.count(),
      prisma.anomaly.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'UNDER_INVESTIGATION'] } } }),
      prisma.anomaly.count({ where: { severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: { in: ['SUBMITTED', 'RECEIVED', 'TRIAGED'] } } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.satelliteObservation.count(),
      prisma.auditEvent.count({ where: { timestamp: { gte: sevenDaysAgo } } }),
      prisma.auditEvent.count({
        where: {
          timestamp: { gte: sevenDaysAgo },
          action: { in: ['SATELLITE_ANALYSIS_RUN', 'RISK_RULE_TRIGGERED'] },
        },
      }),
    ]);

    success(res, {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? '2.0.0',
        timestamp: now.toISOString(),
      },
      counts: {
        projects: { total: totalProjects, active: activeProjects },
        anomalies: { total: totalAnomalies, open: openAnomalies, critical: criticalAnomalies },
        reports: { total: totalReports, pending: pendingReports },
        users: { total: totalUsers, active: activeUsers },
        satelliteObservations: totalSatelliteObs,
      },
      activity: {
        auditEventsLast7d: recentAudits,
        jobsLast7d: recentJobs,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/audit — recent audit events ─────────────────────────────────

router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
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

router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const severity = req.query.severity as string | undefined;

    const where: Record<string, unknown> = {};
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

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
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

// ── POST /admin/users — create user ──────────────────────────────────────────

router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      throw new ValidationError('name, email, password, and role are required');
    }

    if (!Object.values(UserRole).includes(role)) {
      throw new ValidationError(`Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`);
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    created(res, user);
  } catch (err) {
    next(err);
  }
});

// ── PUT /admin/users/:id/roles — update user roles ──────────────────────────

router.put('/users/:id/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role) {
      throw new ValidationError('role is required');
    }

    if (!Object.values(UserRole).includes(role)) {
      throw new ValidationError(`Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    success(res, user);
  } catch (err) {
    next(err);
  }
});

// ── PUT /admin/users/:id/disable — disable user ──────────────────────────────

router.put('/users/:id/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    success(res, user);
  } catch (err) {
    next(err);
  }
});

// ── PUT /admin/users/:id/enable — enable user ────────────────────────────────

router.put('/users/:id/enable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    success(res, user);
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/health — system health check ─────────────────────────────────

router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbStart = Date.now();
    const dbCheck = await Promise.allSettled([prisma.$queryRaw`SELECT 1`]);
    const dbLatency = Date.now() - dbStart;
    const dbHealthy = dbCheck[0].status === 'fulfilled';

    const overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' =
      dbHealthy ? 'HEALTHY' : 'UNHEALTHY';

    success(res, {
      overall,
      timestamp: new Date().toISOString(),
      checks: [
        {
          service: 'database',
          status: dbHealthy ? 'HEALTHY' : 'UNHEALTHY',
          latencyMs: dbLatency,
          lastCheck: new Date().toISOString(),
        },
        {
          service: 'api',
          status: 'HEALTHY',
          latencyMs: 0,
          lastCheck: new Date().toISOString(),
        },
      ],
      history: [],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/health/history — health history ───────────────────────────────

router.get('/health/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // No history table yet — return empty array so the API contract holds.
    // The `hours` query param is accepted but has nothing to window over.
    success(res, []);
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/security/events — security events log ─────────────────────────

router.get('/security/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
    const severity = req.query.severity as string | undefined;

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;

    // Security events aren't a dedicated table yet — derive from audit events
    // (auth failures, role changes, permission denials).
    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: {
          ...where,
          action: {
            in: ['AUTH_FAILED_LOGIN', 'AUTH_LOGIN', 'USER_ROLE_CHANGED'],
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    const bySeverity: Record<string, number> = {};
    const byResult: Record<string, number> = {};

    success(res, {
      events: events.map((e) => {
        const result = e.action.includes('FAILED') || e.action.includes('DENIED') ? 'FAILURE' : 'SUCCESS';
        byResult[result] = (byResult[result] ?? 0) + 1;
        return {
          id: e.id,
          type: e.action,
          severity: 'LOW',
          actorId: e.actorId,
          ipAddress: e.ipAddress ?? undefined,
          resource: e.entityType,
          action: e.action,
          result,
          metadata: e.metadata,
          timestamp: e.timestamp,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: { bySeverity, byResult },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /admin/jobs — background jobs list ──────────────────────────────────

router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);

    // Get recent jobs from audit events (using as job history for now)
    const [jobs, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: {
          action: {
            in: [
              'SATELLITE_ANALYSIS_RUN',
              'RISK_SIGNAL_GENERATED',
              'RISK_RULE_TRIGGERED',
              'SYSTEM_CONFIG_CHANGED',
            ],
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditEvent.count({
        where: {
          action: {
            in: [
              'SATELLITE_ANALYSIS_RUN',
              'RISK_SIGNAL_GENERATED',
              'RISK_RULE_TRIGGERED',
              'SYSTEM_CONFIG_CHANGED',
            ],
          },
        },
      }),
    ]);

    success(res, {
      jobs: jobs.map((j) => ({
        id: j.id,
        type: j.action,
        status: 'COMPLETED',
        actorId: j.actorId,
        startedAt: j.timestamp,
        completedAt: j.timestamp,
        metadata: j.metadata,
      })),
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

// ── GET /admin/activity — recent activity summary ────────────────────────────

router.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
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
    
    const dailyProjects = await prisma.$queryRaw<any[]>`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM projects
      WHERE created_at >= ${since}
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
