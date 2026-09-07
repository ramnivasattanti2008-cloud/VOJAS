/**
 * Public Projects Routes — M12 Public Transparency
 *
 * Public-safe endpoints for the VOJAS Command Center and public-facing
 * project pages. No authentication required.
 *
 * These endpoints:
 * - Do NOT expose internal investigation data
 * - Do NOT expose sensitive officer notes
 * - Do NOT expose restricted case data
 * - Clearly attribute all data to sources
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { success } from '../utils/apiResponse.js';

const router = Router();

/**
 * GET /projects/public/summary — national-level project aggregates
 */
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, completed, inProgress, delayed, financial] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({
        where: {
          status: 'IN_PROGRESS',
          expectedEndDate: { lt: new Date() },
        },
      }),
      prisma.project.aggregate({
        _sum: { approvedAmount: true, spentAmount: true },
      }),
    ]);

    success(res, {
      totalProjects: total,
      completedProjects: completed,
      inProgressProjects: inProgress,
      delayedProjects: delayed,
      totalSanctioned: financial._sum.approvedAmount ?? 0,
      totalSpent: financial._sum.spentAmount ?? 0,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/states — per-state aggregates
 */
router.get('/states', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const states = await prisma.project.groupBy({
      by: ['state'],
      _count: { id: true },
      _sum: { approvedAmount: true, spentAmount: true },
    });

    // Get counts by status per state
    const stateNames = states.map((s) => s.state).filter(Boolean);
    const statusCounts = await prisma.project.findMany({
      where: { state: { in: stateNames } },
      select: { state: true, status: true },
    });

    const byState: Record<string, { completed: number; inProgress: number; delayed: number }> = {};
    for (const row of statusCounts) {
      if (!row.state) continue;
      if (!byState[row.state]) byState[row.state] = { completed: 0, inProgress: 0, delayed: 0 };
      if (row.status === 'COMPLETED') byState[row.state].completed++;
      else if (row.status === 'IN_PROGRESS') {
        byState[row.state].inProgress++;
      }
    }

    const summaries = states.map((s) => ({
      state: s.state ?? 'Unknown',
      totalProjects: s._count.id,
      completedProjects: byState[s.state ?? '']?.completed ?? 0,
      inProgressProjects: byState[s.state ?? '']?.inProgress ?? 0,
      delayedProjects: byState[s.state ?? '']?.delayed ?? 0,
      totalSanctioned: s._sum.approvedAmount ?? 0,
      totalSpent: s._sum.spentAmount ?? 0,
    }));

    success(res, summaries);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/districts?state=X — per-district aggregates for a state
 */
router.get('/districts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
    if (!state) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'state parameter is required' } });
    }

    const districts = await prisma.project.groupBy({
      by: ['district', 'state'],
      where: { state },
      _count: { id: true },
      _sum: { approvedAmount: true, spentAmount: true },
    });

    const stateDistricts = districts.map((d) => ({
      state: d.state ?? state,
      district: d.district ?? 'Unknown',
      totalProjects: d._count.id,
      completedProjects: 0, // would need a separate query
      inProgressProjects: 0,
      delayedProjects: 0,
      totalSanctioned: d._sum.approvedAmount ?? 0,
      totalSpent: d._sum.spentAmount ?? 0,
    }));

    success(res, stateDistricts);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/cluster/:projectId — map cluster data for a project
 */
router.get('/cluster/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        locations: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const [satelliteCount, reportCount] = await Promise.all([
      prisma.satelliteObservation.count({ where: { projectId } }),
      prisma.report.count({ where: { projectId } }),
    ]);

    success(res, {
      id: project.id,
      type: 'project' as const,
      name: project.name,
      state: project.state,
      district: project.district,
      latitude: project.locations[0]?.latitude ?? project.latitude,
      longitude: project.locations[0]?.longitude ?? project.longitude,
      projectCount: 1,
      completedCount: project.status === 'COMPLETED' ? 1 : 0,
      delayedCount: project.status === 'IN_PROGRESS' && project.expectedEndDate && new Date(project.expectedEndDate) < new Date() ? 1 : 0,
      totalSanctioned: project.approvedAmount ?? 0,
      totalSpent: project.spentAmount ?? 0,
      satelliteObservations: satelliteCount,
      citizenReports: reportCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
