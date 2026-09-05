/**
 * M8: Risk Analysis API Routes
 *
 * Endpoints:
 *   POST /projects/:id/risk/analyze    — Trigger risk analysis
 *   GET  /projects/:id/risk           — Project risk summary
 *   GET  /projects/:id/risk/signals    — Signals for a project
 *   GET  /projects/:id/risk/findings  — Findings for a project
 *   GET  /projects/:id/risk/findings/:fid — Finding detail
 *   GET  /projects/:id/risk/events     — Risk timeline
 *   GET  /risk/summary                — National risk summary
 *   GET  /risk/trends                 — Risk trends over time
 *   GET  /risk/hotspots               — Geographic hotspots
 *   GET  /risk/rules                  — Rule registry
 *   PATCH /findings/:id/status        — Update finding status
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import {
  RiskAnalysisOrchestrator,
  NotFoundError,
  ValidationError,
} from '@vojas/domain';
import { AuditAction } from '@vojas/shared';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();
const orchestrator = new RiskAnalysisOrchestrator(prisma);

// ──────────────────────────────────────────────────────────────────
// PROJECT-LEVEL RISK ENDPOINTS
// ──────────────────────────────────────────────────────────────────

/**
 * POST /projects/:id/risk/analyze
 * Trigger full risk analysis for a project
 */
router.post(
  '/projects/:id/risk/analyze',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { forceNewRun = false } = req.body;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const result = await orchestrator.analyze(projectId, { persist: true, forceNewRun });

      if (result.status === 'FAILED') {
        return res.status(500).json({
          success: false,
          error: { code: 'ANALYSIS_FAILED', message: result.error },
        });
      }

      if (result.status === 'INSUFFICIENT_DATA') {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: 'Not enough data to perform risk analysis',
            details: result.dataQuality.reasons,
          },
        });
      }

      success(res, {
        projectId: result.projectId,
        status: result.status,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        signalsCount: result.signalsCount,
        findingsCount: result.findingsCount,
        sourceDiversity: result.sourceDiversity,
        methodology: result.methodology,
        dataQuality: result.dataQuality,
        computedAt: result.computedAt,
        processingTimeMs: result.processingTimeMs,
        algorithmVersion: result.algorithmVersion,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/risk
 * Get risk summary for a project
 */
router.get(
  '/projects/:id/risk',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const [risk, signals, findings, events] = await Promise.all([
        prisma.projectRisk.findUnique({ where: { projectId } }),
        prisma.riskSignal.findMany({
          where: { projectId },
          orderBy: { detectedAt: 'desc' },
          take: 20,
        }),
        prisma.riskFinding.findMany({
          where: { projectId },
          orderBy: { detectedAt: 'desc' },
          take: 20,
        }),
        prisma.riskEvent.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      // Compute active signals by type
      const signalsByType: Record<string, number> = {};
      for (const s of signals) {
        signalsByType[s.signalType] = (signalsByType[s.signalType] || 0) + 1;
      }

      // Compute findings by severity
      const findingsBySeverity: Record<string, number> = {};
      for (const f of findings) {
        findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] || 0) + 1;
      }

      success(res, {
        projectId,
        project: {
          name: project.name,
          sector: project.sector,
          status: project.status,
          approvedAmount: project.approvedAmount,
          spentAmount: project.spentAmount,
        },
        risk: risk
          ? {
              score: risk.riskScore,
              level: risk.riskLevel,
              confidence: risk.confidence,
              primaryDriver: risk.primaryDriver,
              signalsCount: risk.signalsCount,
              findingsCount: risk.findingsCount,
              sourceDiversity: risk.sourceDiversity,
              computedAt: risk.computedAt,
              algorithmVersion: risk.algorithmVersion,
            }
          : null,
        signals: {
          total: signals.length,
          byType: signalsByType,
          recent: signals.slice(0, 5).map(s => ({
            id: s.id,
            type: s.signalType,
            severity: s.severity,
            confidence: s.confidence,
            explanation: s.explanation,
            detectedAt: s.detectedAt,
          })),
        },
        findings: {
          total: findings.length,
          bySeverity: findingsBySeverity,
          active: findings.filter(f => !['RESOLVED', 'DISMISSED'].includes(f.status)).length,
          recent: findings.slice(0, 5).map(f => ({
            id: f.id,
            type: f.type,
            title: f.title,
            severity: f.severity,
            riskScore: f.riskScore,
            confidence: f.confidence,
            status: f.status,
            detectedAt: f.detectedAt,
          })),
        },
        timeline: events.map(e => ({
          id: e.id,
          type: e.eventType,
          description: e.description,
          severity: e.severity,
          riskScore: e.riskScore,
          createdAt: e.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/risk/signals
 * Get signals for a project
 */
router.get(
  '/projects/:id/risk/signals',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { type, severity, page = '1', limit = '20' } = req.query;

      const where: Record<string, unknown> = { projectId };
      if (type) where.signalType = type;
      if (severity) where.severity = severity;

      const pageNum = parseInt(String(page));
      const limitNum = Math.min(50, parseInt(String(limit)));

      const [signals, total] = await prisma.$transaction([
        prisma.riskSignal.findMany({
          where,
          orderBy: { detectedAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.riskSignal.count({ where }),
      ]);

      success(res, {
        signals: signals.map(s => ({
          id: s.id,
          type: s.signalType,
          sourceType: s.sourceType,
          sourceId: s.sourceId,
          severity: s.severity,
          confidence: s.confidence,
          value: s.value,
          expectedValue: s.expectedValue,
          deviation: s.deviation,
          explanation: s.explanation,
          evidenceReferences: s.evidenceReferences,
          detectedAt: s.detectedAt,
          observationDate: s.observationDate,
          algorithmVersion: s.algorithmVersion,
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
 * GET /projects/:id/risk/findings
 * Get findings for a project
 */
router.get(
  '/projects/:id/risk/findings',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { status, severity, page = '1', limit = '20' } = req.query;

      const where: Record<string, unknown> = { projectId };
      if (status) where.status = status;
      if (severity) where.severity = severity;

      const pageNum = parseInt(String(page));
      const limitNum = Math.min(50, parseInt(String(limit)));

      const [findings, total] = await prisma.$transaction([
        prisma.riskFinding.findMany({
          where,
          orderBy: { detectedAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.riskFinding.count({ where }),
      ]);

      success(res, {
        findings: findings.map(f => ({
          id: f.id,
          type: f.type,
          title: f.title,
          description: f.description,
          severity: f.severity,
          riskScore: f.riskScore,
          confidence: f.confidence,
          status: f.status,
          recommendedAction: f.recommendedAction,
          limitations: f.limitations,
          signalIds: f.signalIds,
          evidence: f.evidence,
          firstObservedAt: f.firstObservedAt,
          lastObservedAt: f.lastObservedAt,
          detectedAt: f.detectedAt,
          algorithmVersion: f.algorithmVersion,
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
 * GET /projects/:id/risk/findings/:fid
 * Get finding detail with evidence chain
 */
router.get(
  '/projects/:id/risk/findings/:fid',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: projectIdRaw, fid: findingIdRaw } = req.params;
      const projectId = projectIdRaw as string;
      const findingId = findingIdRaw as string;

      const finding = await prisma.riskFinding.findFirst({
        where: { id: findingId, projectId },
      });
      if (!finding) throw new NotFoundError('RiskFinding');

      // Get the signals that contributed to this finding
      const signals = finding.signalIds.length > 0
        ? await prisma.riskSignal.findMany({
            where: { id: { in: finding.signalIds } },
          })
        : [];

      // Get project info
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, sector: true, status: true, approvedAmount: true, spentAmount: true },
      });

      success(res, {
        finding: {
          id: finding.id,
          type: finding.type,
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          riskScore: finding.riskScore,
          confidence: finding.confidence,
          status: finding.status,
          recommendedAction: finding.recommendedAction,
          limitations: finding.limitations,
          algorithmVersion: finding.algorithmVersion,
          firstObservedAt: finding.firstObservedAt,
          lastObservedAt: finding.lastObservedAt,
          detectedAt: finding.detectedAt,
        },
        signals: signals.map(s => ({
          id: s.id,
          type: s.signalType,
          sourceType: s.sourceType,
          severity: s.severity,
          confidence: s.confidence,
          explanation: s.explanation,
          evidenceReferences: s.evidenceReferences,
          detectedAt: s.detectedAt,
          observationDate: s.observationDate,
        })),
        project: project ? {
          name: project.name,
          sector: project.sector,
          status: project.status,
          approvedAmount: project.approvedAmount,
          spentAmount: project.spentAmount,
        } : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /projects/:id/risk/events
 * Get risk timeline for a project
 */
router.get(
  '/projects/:id/risk/events',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(String(page));
      const limitNum = Math.min(100, parseInt(String(limit)));

      const [events, total] = await prisma.$transaction([
        prisma.riskEvent.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.riskEvent.count({ where: { projectId } }),
      ]);

      success(res, {
        events: events.map(e => ({
          id: e.id,
          type: e.eventType,
          description: e.description,
          severity: e.severity,
          riskScore: e.riskScore,
          findingId: e.findingId,
          relatedSignalIds: e.relatedSignalIds,
          createdAt: e.createdAt,
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
// FINDING STATUS MANAGEMENT
// ──────────────────────────────────────────────────────────────────

/**
 * PATCH /findings/:id/status
 * Update finding status (acknowledge, resolve, dismiss, escalate)
 */
router.patch(
  '/findings/:id/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const findingId = req.params.id as string;
      const { status, resolution, notes } = req.body;

      const validStatuses = ['NEW', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'VERIFICATION_REQUIRED', 'RESOLVED', 'DISMISSED', 'ESCALATED'];
      if (!status || !validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const finding = await prisma.riskFinding.findUnique({ where: { id: findingId } });
      if (!finding) throw new NotFoundError('RiskFinding');

      const updateData: Record<string, unknown> = { status };

      if (status === 'ACKNOWLEDGED') {
        updateData.acknowledgedById = req.user!.userId;
        updateData.acknowledgedAt = new Date();
      } else if (status === 'RESOLVED') {
        if (!resolution) throw new ValidationError('Resolution text is required to mark as resolved');
        updateData.resolvedById = req.user!.userId;
        updateData.resolvedAt = new Date();
        updateData.resolution = resolution;
      }

      const updated = await prisma.riskFinding.update({
        where: { id: findingId },
        data: updateData as any,
      });

      // Create risk event
      await prisma.riskEvent.create({
        data: {
          projectId: finding.projectId,
          eventType: `finding_${status.toLowerCase()}`,
          description: `Finding status changed to ${status}${resolution ? `: ${resolution}` : ''}`,
          severity: finding.severity,
          riskScore: finding.riskScore,
          findingId: finding.id,
        },
      });

      success(res, {
        id: updated.id,
        status: updated.status,
        acknowledgedById: updated.acknowledgedById,
        acknowledgedAt: updated.acknowledgedAt,
        resolvedById: updated.resolvedById,
        resolvedAt: updated.resolvedAt,
        resolution: updated.resolution,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// GLOBAL RISK AGGREGATION
// ──────────────────────────────────────────────────────────────────

/**
 * GET /risk/summary
 * National risk summary
 */
router.get(
  '/risk/summary',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalProjects,
        projectRisks,
        findings,
        highRiskProjects,
        delayedProjects,
      ] = await Promise.all([
        prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.projectRisk.findMany({
          select: {
            riskLevel: true,
            riskScore: true,
            findingsCount: true,
            computedAt: true,
          },
        }),
        prisma.riskFinding.findMany({
          where: { status: { notIn: ['RESOLVED', 'DISMISSED'] } },
          select: {
            severity: true,
            confidence: true,
            status: true,
            detectedAt: true,
          },
        }),
        prisma.projectRisk.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
        prisma.project.count({
          where: {
            status: 'IN_PROGRESS',
            expectedEndDate: { lt: new Date() },
          },
        }),
      ]);

      // Risk distribution
      const riskDistribution: Record<string, number> = {
        LOW: 0, GUARDED: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
      };
      for (const r of projectRisks) {
        riskDistribution[r.riskLevel as string] = (riskDistribution[r.riskLevel as string] || 0) + 1;
      }

      // Average risk score
      const avgRiskScore = projectRisks.length > 0
        ? Math.round(projectRisks.reduce((sum, r) => sum + r.riskScore, 0) / projectRisks.length)
        : 0;

      // Findings by severity
      const findingsBySeverity: Record<string, number> = {};
      for (const f of findings) {
        findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] || 0) + 1;
      }

      // Recent findings (last 7 days)
      const recentFindings = findings.filter(
        f => f.detectedAt && new Date(f.detectedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      success(res, {
        totalProjects,
        totalFindings: findings.length,
        riskDistribution,
        highRiskProjects,
        delayedProjects,
        averageRiskScore: avgRiskScore,
        findingsBySeverity,
        recentFindings7Days: recentFindings,
        projectRisksCount: projectRisks.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /risk/trends
 * Risk trends over time
 */
router.get(
  '/risk/trends',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days = '30' } = req.query;
      const daysNum = Math.min(365, parseInt(String(days)));
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      const events = await prisma.riskEvent.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day
      const byDay: Record<string, { newFindings: number; resolved: number; avgRiskScore: number; events: number }> = {};

      for (const e of events) {
        const day = e.createdAt.toISOString().split('T')[0];
        if (!byDay[day]) {
          byDay[day] = { newFindings: 0, resolved: 0, avgRiskScore: 0, events: 0 };
        }
        byDay[day].events++;

        if (e.eventType === 'finding_detected') {
          byDay[day].newFindings++;
        }
        if (e.eventType === 'finding_resolved' || e.eventType === 'finding_dismissed') {
          byDay[day].resolved++;
        }
        if (e.riskScore) {
          byDay[day].avgRiskScore = (byDay[day].avgRiskScore * (byDay[day].events - 1) + e.riskScore) / byDay[day].events;
        }
      }

      const trends = Object.entries(byDay).map(([date, data]) => ({
        date,
        ...data,
        avgRiskScore: Math.round(data.avgRiskScore),
      }));

      success(res, { trends, periodDays: daysNum });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /risk/hotspots
 * Geographic risk hotspots
 */
router.get(
  '/risk/hotspots',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { minScore = '50', limit = '20' } = req.query;
      const minScoreNum = parseInt(String(minScore));
      const limitNum = Math.min(50, parseInt(String(limit)));

      const hotspots = await prisma.$queryRaw<
        Array<{
          state: string;
          district: string;
          latitude: number;
          longitude: number;
          projectCount: bigint;
          findingsCount: number;
          avgRiskScore: number;
        }>
      >`
        SELECT
          p.state,
          p.district,
          p.latitude,
          p.longitude,
          COUNT(*) as project_count,
          COALESCE(SUM(pr.findings_count), 0)::int as findings_count,
          COALESCE(AVG(pr.risk_score), 0)::float as avg_risk_score
        FROM projects p
        LEFT JOIN project_risks pr ON pr.project_id = p.id
        WHERE p.latitude IS NOT NULL
          AND p.longitude IS NOT NULL
          AND (pr.risk_score >= ${minScoreNum} OR pr.risk_score IS NULL)
        GROUP BY p.state, p.district, p.latitude, p.longitude
        ORDER BY avg_risk_score DESC, findings_count DESC
        LIMIT ${limitNum}
      `;

      success(res, {
        hotspots: hotspots.map(h => ({
          state: h.state,
          district: h.district,
          latitude: h.latitude,
          longitude: h.longitude,
          projectCount: Number(h.projectCount),
          findingsCount: h.findingsCount,
          avgRiskScore: Math.round(h.avgRiskScore),
        })),
        threshold: minScoreNum,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /risk/rules
 * Get rule registry
 */
router.get(
  '/risk/rules',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await prisma.riskRule.findMany({
        orderBy: { category: 'asc' },
      });

      success(res, {
        rules: rules.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          version: r.version,
          status: r.status,
          enabled: r.enabled,
          lastRun: r.lastRun,
          matchCount: r.matchCount,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /risk/aggregate/by-state
 * Risk aggregate by state
 */
router.get(
  '/risk/aggregate/by-state',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const byState = await prisma.$queryRaw<
        Array<{
          state: string;
          projectCount: bigint;
          avgRiskScore: number;
          highRiskCount: bigint;
          activeFindings: bigint;
        }>
      >`
        SELECT
          p.state,
          COUNT(DISTINCT p.id)::bigint as project_count,
          COALESCE(AVG(pr.risk_score), 0)::float as avg_risk_score,
          COUNT(DISTINCT CASE WHEN pr.risk_level IN ('HIGH', 'CRITICAL') THEN p.id END)::bigint as high_risk_count,
          COALESCE(SUM(pr.findings_count), 0)::bigint as active_findings
        FROM projects p
        LEFT JOIN project_risks pr ON pr.project_id = p.id
        WHERE p.status = 'IN_PROGRESS'
        GROUP BY p.state
        ORDER BY avg_risk_score DESC
      `;

      success(res, {
        states: byState.map(s => ({
          state: s.state,
          projectCount: Number(s.projectCount),
          avgRiskScore: Math.round(s.avgRiskScore),
          highRiskCount: Number(s.highRiskCount),
          activeFindings: Number(s.activeFindings),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
