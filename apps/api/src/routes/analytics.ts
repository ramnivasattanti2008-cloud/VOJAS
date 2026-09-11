/**
 * M16: Advanced Analytics API Routes
 *
 * Endpoints:
 *   GET  /projects/:id/analytics                    — Project analytics summary
 *   GET  /aggregated                     — Aggregated metrics (entity level)
 *   GET  /benchmarks/:metricType         — Benchmark distribution
 *   GET  /cross-project-patterns         — Cross-project signal patterns
 *   GET  /hotspot                        — Geographic hotspot analysis
 *   GET  /projects/:id/benchmark/:metricType      — Project vs peer benchmark
 *   GET  /projects/:id/forecast/delay              — Delay forecast
 *   GET  /projects/:id/forecast/cost               — Cost forecast
 *   GET  /projects/:id/forecast/risk               — Risk forecast
 *   POST /projects/:id/scenario                    — Run what-if scenario
 *   GET  /scenarios/comparative          — Comparative scenario across entities
 *   GET  /snapshots                      — List analytics snapshots
 *   POST /snapshots                      — Create analytics snapshot (admin)
 *   GET  /insights                       — List analytics insights
 *   GET  /models                         — List model versions
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import {
  AnalyticsEngine,
  BenchmarkService,
  ForecastingService,
  ScenarioService,
  NotFoundError,
} from '@vojas/domain';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();

// Instantiate services
const engine = new AnalyticsEngine(prisma);
const benchmarkService = new BenchmarkService(prisma);
const forecastingService = new ForecastingService(prisma);
const scenarioService = new ScenarioService(prisma);

// ──────────────────────────────────────────────────────────────────
// PROJECT ANALYTICS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /projects/:id/analytics
 * Get comprehensive analytics for a single project
 */
router.get(
  '/projects/:id/analytics',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const analytics = await engine.calculateProjectAnalytics(projectId);

      success(res, analytics);
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// AGGREGATED METRICS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /aggregated
 * Aggregated analytics for an entity (state, sector, district, national)
 */
router.get(
  '/aggregated',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId, state, sector, districtId } = req.query;

      if (!entityType || !entityId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'entityType and entityId are required' },
        });
      }

      const metrics = await engine.calculateAggregatedMetrics(
        entityType as any,
        entityId as any,
        {
          state: state as string | undefined,
          sector: sector as string | undefined,
          districtId: districtId as string | undefined,
        }
      );

      success(res, metrics);
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// BENCHMARKS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /benchmarks/:metricType
 * Get benchmark distribution for a metric type
 */
router.get(
  '/benchmarks/:metricType',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { metricType } = req.params;
      const { peerCriteria } = req.query;

      let criteria: Record<string, unknown> = {};
      if (peerCriteria && typeof peerCriteria === 'string') {
        try {
          criteria = JSON.parse(peerCriteria);
        } catch {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_JSON', message: 'peerCriteria must be valid JSON' },
          });
        }
      }

      const distribution = await engine.calculateBenchmark(metricType as any, criteria);

      if (!distribution) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_DATA', message: 'Insufficient data to calculate benchmark' },
        });
      }

      success(res, distribution);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/benchmark/:metricType
 * Benchmark a single project against its peers
 */
router.get(
  '/projects/:id/benchmark/:metricType',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { metricType } = req.params;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const benchmark = await benchmarkService.benchmarkProject(projectId, metricType as any);

      if (!benchmark) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_DATA', message: 'Insufficient peer data for benchmark comparison' },
        });
      }

      success(res, benchmark);
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// CROSS-PROJECT PATTERNS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /cross-project-patterns
 * Detect cross-project signal correlations
 */
router.get(
  '/cross-project-patterns',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sector, state, districtId } = req.query;

      const patterns = await engine.detectCrossProjectPatterns({
        sector: sector as string | undefined,
        state: state as string | undefined,
        districtId: districtId as string | undefined,
      });

      success(res, { patterns });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// HOTSPOTS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /hotspot
 * Geographic hotspot analysis
 */
router.get(
  '/hotspot',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { locationType, locationId, locationName, metric } = req.query;

      const hotspot = await engine.calculateHotspot(
        (locationType as string | undefined) ?? 'NATIONAL',
        (locationId as string | undefined) ?? 'all',
        (locationName as string | undefined) ?? 'India',
        (metric as string | undefined) ?? 'RISK'
      );

      success(res, { hotspot });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// FORECASTING
// ──────────────────────────────────────────────────────────────────

/**
 * GET /projects/:id/forecast/delay
 * Forecast project delay
 */
router.get(
  '/projects/:id/forecast/delay',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { horizonDays } = req.query;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const forecast = await forecastingService.forecastDelay(
        projectId,
        horizonDays ? parseInt(String(horizonDays)) : 90
      );

      success(res, forecast);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/forecast/cost
 * Forecast project cost / expenditure
 */
router.get(
  '/projects/:id/forecast/cost',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const forecast = await forecastingService.forecastCost(projectId);

      success(res, forecast);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/forecast/risk
 * Forecast project risk trajectory
 */
router.get(
  '/projects/:id/forecast/risk',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const forecast = await forecastingService.forecastRisk(projectId);

      success(res, forecast);
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// SCENARIOS
// ──────────────────────────────────────────────────────────────────

/**
 * POST /projects/:id/scenario
 * Run a what-if scenario for a project
 */
router.post(
  '/projects/:id/scenario',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { scenarioType, baselineValue, changeRate, horizonDays } = req.body;

      if (!scenarioType || baselineValue === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'scenarioType and baselineValue are required' },
        });
      }

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const result = await scenarioService.runScenario(projectId, {
        scenarioType,
        baselineValue: Number(baselineValue),
        changeRate: changeRate !== undefined ? Number(changeRate) : undefined,
        horizonDays: horizonDays !== undefined ? Number(horizonDays) : undefined,
      });

      success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /scenarios/comparative
 * Run comparative scenario across multiple projects
 */
router.get(
  '/scenarios/comparative',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId, scenarioType, changeRate } = req.query;

      if (!entityType || !entityId || !scenarioType || changeRate === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'entityType, entityId, scenarioType, and changeRate are required' },
        });
      }

      const results = await scenarioService.runComparativeScenario(
        entityType as string,
        entityId as string,
        scenarioType as any,
        Number(changeRate)
      );

      success(res, { scenarios: results });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// SNAPSHOTS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /snapshots
 * List analytics snapshots
 */
router.get(
  '/snapshots',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(String(page));
      const limitNum = Math.min(50, parseInt(String(limit)));

      const where: Record<string, unknown> = {};
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;

      const [snapshots, total] = await prisma.$transaction([
        prisma.analyticsSnapshot.findMany({
          where,
          orderBy: { snapshotDate: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.analyticsSnapshot.count({ where }),
      ]);

      success(res, {
        snapshots: snapshots.map(s => ({
          id: s.id,
          entityType: s.entityType,
          entityId: s.entityId,
          metrics: s.metrics,
          snapshotDate: s.snapshotDate,
          dataQuality: s.dataQuality,
          modelVersion: s.modelVersion,
          period: s.period,
          createdAt: s.createdAt,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /snapshots
 * Create a manual analytics snapshot (admin only)
 */
router.post(
  '/snapshots',
  authenticate,
  requirePermission('admin.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId, metrics } = req.body;

      if (!entityType || !entityId || !metrics) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'entityType, entityId, and metrics are required' },
        });
      }

      const snapshot = await prisma.analyticsSnapshot.create({
        data: {
          entityType,
          entityId,
          metrics,
          snapshotDate: new Date(),
        },
      });

      created(res, {
        id: snapshot.id,
        entityType: snapshot.entityType,
        entityId: snapshot.entityId,
        metrics: snapshot.metrics,
        snapshotDate: snapshot.snapshotDate,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// INSIGHTS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /insights
 * List analytics insights
 */
router.get(
  '/insights',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // No entity filter: AnalyticsInsight stores affected entities in the
      // affectedEntities JSON blob, not as queryable entityType/entityId
      // columns, so such a filter cannot be honoured without a schema change.
      const { severity, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(String(page));
      const limitNum = Math.min(50, parseInt(String(limit)));

      const where: Record<string, unknown> = {};
      if (severity) where.severity = severity;

      const [insights, total] = await prisma.$transaction([
        prisma.analyticsInsight.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.analyticsInsight.count({ where }),
      ]);

      success(res, {
        insights: insights.map(i => ({
          id: i.id,
          insightType: i.insightType,
          title: i.title,
          description: i.description,
          summary: i.summary,
          severity: i.severity,
          confidence: i.confidence,
          dataQuality: i.dataQuality,
          affectedEntities: i.affectedEntities,
          recommendedAction: i.recommendedAction,
          validFrom: i.validFrom,
          validUntil: i.validUntil,
          resolved: i.resolved,
          createdAt: i.createdAt,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// MODEL VERSIONS
// ──────────────────────────────────────────────────────────────────

/**
 * GET /models
 * List model versions used for forecasting/analytics
 */
router.get(
  '/models',
  authenticate,
  requirePermission('project.read.internal'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { active } = req.query;

      const where: Record<string, unknown> = {};
      if (active !== undefined) where.status = active === 'true' ? 'ACTIVE' : { not: 'ACTIVE' };

      const models = await prisma.modelVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      success(res, {
        models: models.map(m => ({
          id: m.id,
          modelId: m.modelId,
          name: m.name,
          version: m.version,
          modelType: m.modelType,
          description: m.description,
          status: m.status,
          dataCount: m.dataCount,
          evaluationMetrics: m.evaluationMetrics,
          createdAt: m.createdAt,
          createdBy: m.createdBy,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
