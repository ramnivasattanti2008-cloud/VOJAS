/**
 * Sectors Routes — M13 16-Sector Intelligence Framework
 *
 * Provides sector configurations, project stats, alerts, and analytics
 * for all 16 VOJAS sectors.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { success } from '../utils/apiResponse';
import { SECTOR_CONFIGS, SECTOR_CODES } from '@vojas/domain';
import type { ProjectSector } from '@vojas/shared';
import type { SectorConfig } from '@vojas/api-client';

const router = Router();

// ── GET /sectors — all sector configs ───────────────────────────────────────

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sectors = SECTOR_CODES.map((code: ProjectSector) => {
      const cfg = SECTOR_CONFIGS[code];
      return {
        code: cfg.code,
        name: cfg.name,
        shortName: cfg.shortName,
        description: cfg.description,
        color: cfg.color,
        icon: cfg.icon,
        sections: cfg.sections.filter((s) => s.enabled),
      };
    });
    success(res, sectors);
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/overview — full overview with project stats ─────────────────

router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sectors = SECTOR_CODES.map((code: ProjectSector) => SECTOR_CONFIGS[code]);

    // Get project counts per sector
    const projects = await prisma.project.groupBy({
      by: ['sector'],
      _count: { id: true },
      _sum: { approvedAmount: true, spentAmount: true },
    });

    const projectsBySector: Record<string, typeof projects[0]> = {};
    for (const p of projects) {
      if (p.sector) projectsBySector[p.sector] = p;
    }

    const projectStats = sectors.map((sector: SectorConfig) => {
      const row = projectsBySector[sector.code];
      const total = row?._count.id ?? 0;
      return {
        sector: sector.code,
        total,
        completed: 0,
        inProgress: 0,
        delayed: 0,
        totalAmount: row?._sum.approvedAmount ?? 0,
        spentAmount: row?._sum.spentAmount ?? 0,
      };
    });

    // Get status breakdown per sector
    const statusRows = await prisma.project.findMany({
      select: { sector: true, status: true },
    });

    for (const row of statusRows) {
      if (!row.sector) continue;
      const stats = projectStats.find((s) => s.sector === row.sector);
      if (!stats) continue;
      if (row.status === 'COMPLETED') stats.completed++;
      else if (row.status === 'IN_PROGRESS') stats.inProgress++;
    }

    success(res, {
      sectors: sectors.map((sector: SectorConfig) => ({
        code: sector.code,
        name: sector.name,
        shortName: sector.shortName,
        description: sector.description,
        color: sector.color,
        icon: sector.icon,
        sections: sector.sections.filter((sec) => sec.enabled),
        indicators: sector.indicators,
        riskRules: sector.riskRules,
        mapLayers: sector.mapLayers,
        dataSources: sector.dataSources,
        aiContext: sector.aiContext,
        dataQualityDimensions: sector.dataQualityDimensions,
      })),
      projectStats,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/config/:code — single sector config ─────────────────────────

router.get('/config/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code as ProjectSector;
    const cfg = SECTOR_CONFIGS[code];
    if (!cfg) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sector not found' } });
    }
    success(res, cfg);
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/summary — project stats per sector ───────────────────────────

router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.groupBy({
      by: ['sector', 'status'],
      _count: { id: true },
      _sum: { approvedAmount: true, spentAmount: true },
    });

    const statsMap: Record<string, { sector: string; total: number; completed: number; inProgress: number; delayed: number; totalAmount: bigint | number; spentAmount: bigint | number }> = {};
    for (const code of SECTOR_CODES) {
      statsMap[code] = { sector: code, total: 0, completed: 0, inProgress: 0, delayed: 0, totalAmount: 0, spentAmount: 0 };
    }

    for (const row of projects) {
      if (!row.sector || !statsMap[row.sector]) continue;
      const stats = statsMap[row.sector];
      stats.total += row._count.id;
      stats.totalAmount = Number(stats.totalAmount) + Number(row._sum.approvedAmount ?? 0);
      stats.spentAmount = Number(stats.spentAmount) + Number(row._sum.spentAmount ?? 0);
      if (row.status === 'COMPLETED') stats.completed += row._count.id;
      else if (row.status === 'IN_PROGRESS') stats.inProgress += row._count.id;
    }

    const stats = SECTOR_CODES.map((code: ProjectSector) => statsMap[code]);
    success(res, stats);
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/projects?code=X — projects for a sector ─────────────────────

router.get('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectorCode = req.query.code as ProjectSector | undefined;

    if (!sectorCode || !SECTOR_CONFIGS[sectorCode as ProjectSector]) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid sector code' } });
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const status = req.query.status as string | undefined;

    const where: { sector: ProjectSector; status?: string } = { sector: sectorCode };
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where: where as any,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        sector: true,
        state: true,
        district: true,
        approvedAmount: true,
        spentAmount: true,
        updatedAt: true,
      },
    });

    success(res, projects);
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/alerts?code=X — risk alerts for a sector ───────────────────

router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectorCode = req.query.code as ProjectSector | undefined;
    if (!sectorCode || !SECTOR_CONFIGS[sectorCode as ProjectSector]) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid sector code' } });
    }

    const alerts = await prisma.anomaly.findMany({
      where: {
        project: { sector: sectorCode },
      },
      include: {
        project: {
          select: { id: true, name: true, sector: true, state: true, district: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    success(res, alerts);
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/reports?code=X — citizen reports for a sector ──────────────

router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectorCode = req.query.code as ProjectSector | undefined;
    if (!sectorCode || !SECTOR_CONFIGS[sectorCode as ProjectSector]) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid sector code' } });
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const status = req.query.status as string | undefined;

    const where: { project: { sector: ProjectSector }; status?: string } = { project: { sector: sectorCode } };
    if (status) where.status = status;

    const reports = await prisma.report.findMany({
      where: where as any,
      include: {
        project: { select: { id: true, name: true, state: true, district: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    success(res, reports);
  } catch (err) {
    next(err);
  }
});

// ── GET /sectors/analytics?code=X — sector analytics ──────────────────────────

router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectorCode = req.query.code as ProjectSector | undefined;
    if (!sectorCode || !SECTOR_CONFIGS[sectorCode as ProjectSector]) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid sector code' } });
    }

    const cfg = SECTOR_CONFIGS[sectorCode];

    const [projectCount, reportCount, anomalyCount] = await Promise.all([
      prisma.project.count({ where: { sector: sectorCode } }),
      prisma.report.count({ where: { project: { sector: sectorCode } } }),
      prisma.anomaly.count({ where: { project: { sector: sectorCode } } }),
    ]);

    const [financial, statusBreakdown] = await Promise.all([
      prisma.project.aggregate({
        where: { sector: sectorCode },
        _sum: { approvedAmount: true, spentAmount: true },
      }),
      prisma.project.groupBy({
        by: ['status'],
        where: { sector: sectorCode },
        _count: { id: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusBreakdown) {
      statusMap[row.status] = row._count.id;
    }

    success(res, {
      sector: sectorCode,
      sectorName: cfg.name,
      projectCount,
      reportCount,
      anomalyCount,
      financial: {
        totalAmount: Number(financial._sum.approvedAmount ?? 0),
        spentAmount: Number(financial._sum.spentAmount ?? 0),
        utilizationRate: financial._sum.approvedAmount
          ? ((Number(financial._sum.spentAmount ?? 0) / Number(financial._sum.approvedAmount)) * 100)
          : 0,
      },
      statusBreakdown: statusMap,
      indicators: cfg.indicators.map((ind) => ({
        ...ind,
        currentValue: null,
      })),
      dataSources: cfg.dataSources,
      dataQualityDimensions: cfg.dataQualityDimensions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
