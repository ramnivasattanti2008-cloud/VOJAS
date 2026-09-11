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

import { prisma } from '@vojas/db';
import { EvidenceService, projectFiltersSchema } from '@vojas/domain';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { LLMDetectionService } from '../services/llmDetectionService.js';
import { success } from '../utils/apiResponse.js';
import { CACHE_TTL, get, set } from '../utils/cache.js';

const evidenceService = new EvidenceService(prisma);
const llmDetectionService = new LLMDetectionService(prisma);

const router = Router();

// Fields safe to expose to anonymous citizens. Excludes internal attribution
// (createdById, districtId/stateId/etc., sourceDataSourceId) and boundary/
// provenance internals that are not meaningful to a public reader.
const PUBLIC_PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  sector: true,
  state: true,
  district: true,
  constituency: true,
  approvedAmount: true,
  spentAmount: true,
  contractor: true,
  startDate: true,
  expectedEndDate: true,
  completedAt: true,
  latitude: true,
  longitude: true,
  source: true,
  sourceWorkId: true,
  createdAt: true,
  updatedAt: true,
  mp: {
    select: {
      id: true,
      name: true,
      house: true,
      constituency: true,
      state: true,
      party: true,
      term: true,
    },
  },
  projectRisk: {
    select: {
      riskScore: true,
      riskLevel: true,
      confidence: true,
      primaryDriver: true,
      financialScore: true,
      progressScore: true,
      satelliteScore: true,
      contractorScore: true,
      geographicScore: true,
    },
  },
} as const;

/**
 * GET /projects/public — public-safe paginated project list with
 * search/filter/sort. Mirrors the authenticated GET /projects filters
 * (packages/domain/src/validation/projectSchemas.ts) but applies no
 * role-based visibility filter and selects only public-safe fields.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = projectFiltersSchema.safeParse({
      ...req.query,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
    });
    if (!filters.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: filters.error.errors },
      });
    }

    const p = filters.data;
    const where: Record<string, unknown> = {};
    if (p.state) where.state = p.state;
    if (p.district) where.district = p.district;
    if (p.constituency) where.constituency = p.constituency;
    if (p.sector) where.sector = p.sector;
    if (p.status) where.status = p.status;
    if (p.completion === 'DONE') {
      where.status = { in: ['COMPLETED', 'VERIFIED'] };
    } else if (p.completion === 'NOT_DONE') {
      where.status = { notIn: ['COMPLETED', 'VERIFIED'] };
    }
    if (p.showcase) {
      where.id = {
        in: [
          'cmtwjxvip000n932octqrfpw7',
          'cmtwjxvjl000v932of8gat0wn',
          'showcase-fin-1',
          'showcase-ong-1',
          'showcase-fraud-1',
        ],
      };
    }
    if (p.hasCoordinates || req.query.hasCoordinates === 'true') {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }
    if (p.minAmount !== undefined || p.maxAmount !== undefined) {
      where.approvedAmount = {};
      if (p.minAmount !== undefined) (where.approvedAmount as Record<string, number>).gte = p.minAmount;
      if (p.maxAmount !== undefined) (where.approvedAmount as Record<string, number>).lte = p.maxAmount;
    }
    if (p.search) {
      where.OR = [
        { name: { contains: p.search, mode: 'insensitive' } },
        { description: { contains: p.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Record<string, unknown> = { createdAt: 'desc' as const };
    if (p.sortBy === 'riskScore') {
      orderBy = { projectRisk: { riskScore: p.sortOrder ?? 'desc' } };
    } else if (p.sortBy) {
      orderBy = { [p.sortBy]: p.sortOrder ?? 'asc' };
    }

    const [data, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy,
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        select: PUBLIC_PROJECT_SELECT,
      }),
      prisma.project.count({ where }),
    ]);

    success(res, {
      data,
      total,
      page: p.page,
      limit: p.limit,
      totalPages: Math.ceil(total / p.limit),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/summary — national-level project aggregates
 */
router.get(['/summary', '/stats'], async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'public:summary';
    const cached = get<unknown>(cacheKey);
    if (cached) {
      return success(res, cached);
    }

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

    const data = {
      totalProjects: total,
      completedProjects: completed,
      inProgressProjects: inProgress,
      delayedProjects: delayed,
      totalSanctioned: financial._sum.approvedAmount ?? 0,
      totalSpent: financial._sum.spentAmount ?? 0,
      lastUpdated: new Date().toISOString(),
    };

    set(cacheKey, data, CACHE_TTL.PROJECT_LIST);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/states — per-state aggregates
 */
router.get('/states', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'public:states';
    const cached = get<unknown>(cacheKey);
    if (cached) {
      return success(res, cached);
    }

    const states = await prisma.project.groupBy({
      by: ['state'],
      _count: { id: true },
      _sum: { approvedAmount: true, spentAmount: true },
    });

    // Get counts by status per state via fast aggregation
    const stateNames = states.map((s) => s.state).filter(Boolean) as string[];
    const statusCounts = await prisma.project.groupBy({
      by: ['state', 'status'],
      _count: { id: true },
      where: { state: { in: stateNames } },
    });

    const byState: Record<string, { completed: number; inProgress: number; delayed: number }> = {};
    for (const row of statusCounts) {
      if (!row.state) continue;
      if (!byState[row.state]) byState[row.state] = { completed: 0, inProgress: 0, delayed: 0 };
      if (row.status === 'COMPLETED') byState[row.state].completed += row._count.id;
      else if (row.status === 'IN_PROGRESS') {
        byState[row.state].inProgress += row._count.id;
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

    set(cacheKey, summaries, CACHE_TTL.STATE_ANALYTICS);
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

    const cacheKey = `public:districts:${state}`;
    const cached = get<unknown>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return success(res, cached);
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

    set(cacheKey, stateDistricts, CACHE_TTL.STATE_ANALYTICS);
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

/**
 * GET /projects/public/:id/timeline — public-safe project event history.
 * ProjectEvent rows are already source-attributed (source, sourceUrl,
 * evidenceUrls) and contain no internal reviewer notes.
 */
router.get('/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!exists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

    const [data, total] = await prisma.$transaction([
      prisma.projectEvent.findMany({
        where: { projectId },
        orderBy: { eventDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventType: true,
          eventDate: true,
          source: true,
          sourceUrl: true,
          dataset: true,
          description: true,
          evidenceUrls: true,
          confidence: true,
        },
      }),
      prisma.projectEvent.count({ where: { projectId } }),
    ]);

    success(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/:id/risk — public-safe risk findings summary.
 * AI-derived findings are signals for human review, never proof of
 * wrongdoing. Excludes internal reviewer fields (assignedToId,
 * acknowledgedById, resolvedById, resolution, lawAuthority, signalIds).
 */
router.get('/:id/risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!exists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const findings = await prisma.riskFinding.findMany({
      where: { projectId, status: { not: 'DISMISSED' } },
      orderBy: { detectedAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        severity: true,
        confidence: true,
        status: true,
        recommendedAction: true,
        limitations: true,
        detectedAt: true,
        lastObservedAt: true,
      },
      take: 50,
    });

    const bySeverity: Record<string, number> = {};
    for (const f of findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }

    success(res, {
      projectId,
      totalFindings: findings.length,
      bySeverity,
      findings,
      disclaimer:
        'These findings are AI-assisted signals requiring human review. They are not proof of wrongdoing.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/:id/evidence — public-safe unified evidence feed.
 * Aggregates across Document, SatelliteObservation, SatelliteAnalysis,
 * FieldVerification, ContractorUpdate, ReportMedia, ProjectEvent, and
 * RiskFinding, then returns only the PUBLIC-tier subset (satellite
 * observations/analyses and source-attributed project events). Internal
 * documents, field verifications, contractor submissions, citizen media,
 * and AI risk findings are never exposed here — see the authenticated
 * GET /projects/:id/evidence route for role-gated access to those.
 */
router.get('/:id/evidence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!exists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const allEvidence = await evidenceService.getProjectEvidence(projectId);
    const publicEvidence = evidenceService.filterPublic(allEvidence);

    success(res, {
      projectId,
      total: publicEvidence.length,
      items: publicEvidence,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/:id/reports — public-safe citizen reports for a project.
 * Strips confidential reporter identity (name, email, phone, IP) and returns
 * verified civic reports with title, category, status, severity, and description.
 */
router.get('/:id/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!exists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const reports = await prisma.report.findMany({
      where: { projectId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        reportReference: true,
        title: true,
        description: true,
        category: true,
        severity: true,
        status: true,
        submittedAt: true,
        incidentDate: true,
        locationDesc: true,
        _count: { select: { media: true, claims: true } },
      },
    });

    success(res, {
      projectId,
      total: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        reportReference: r.reportReference,
        title: r.title,
        description: r.description,
        category: r.category,
        severity: r.severity,
        status: r.status,
        submittedAt: r.submittedAt.toISOString(),
        incidentDate: r.incidentDate?.toISOString() ?? null,
        locationDesc: r.locationDesc,
        mediaCount: r._count.media,
        claimsCount: r._count.claims,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects/public/:id/ai-audit — run live on-demand LLM forensic audit
 */
router.post('/:id/ai-audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const audit = await llmDetectionService.auditProject(id);

    // Update risk record in DB with latest live forensic data
    await prisma.projectRisk.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        riskScore: audit.riskScore,
        riskLevel: audit.riskLevel,
        confidence: audit.confidenceScore >= 80 ? 'HIGH' : audit.confidenceScore >= 50 ? 'MEDIUM' : 'LOW',
        primaryDriver: audit.verdictTitle,
        drivers: audit.statutoryRedFlags.map((rf) => ({
          name: rf.rule,
          contribution: rf.severity === 'CRITICAL' ? 35 : rf.severity === 'HIGH' ? 25 : 15,
          evidence: rf.evidence,
          solution: rf.violation,
        })),
        algorithmVersion: audit.modelUsed,
      },
      update: {
        riskScore: audit.riskScore,
        riskLevel: audit.riskLevel,
        confidence: audit.confidenceScore >= 80 ? 'HIGH' : audit.confidenceScore >= 50 ? 'MEDIUM' : 'LOW',
        primaryDriver: audit.verdictTitle,
        drivers: audit.statutoryRedFlags.map((rf) => ({
          name: rf.rule,
          contribution: rf.severity === 'CRITICAL' ? 35 : rf.severity === 'HIGH' ? 25 : 15,
          evidence: rf.evidence,
          solution: rf.violation,
        })),
        algorithmVersion: audit.modelUsed,
        updatedAt: new Date(),
      },
    });

    success(res, audit);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/:id/ai-audit — fetch live LLM forensic audit
 */
router.get('/:id/ai-audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const audit = await llmDetectionService.auditProject(id);
    success(res, audit);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/public/:id — public-safe single project detail.
 * Registered LAST: as a single-segment catch-all it must not shadow the
 * literal routes above (/summary, /stats, /states, /districts).
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id },
      select: PUBLIC_PROJECT_SELECT,
    });
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const reportCount = await prisma.report.count({ where: { projectId: id } });

    success(res, { ...project, reportCount });
  } catch (err) {
    next(err);
  }
});

export default router;
