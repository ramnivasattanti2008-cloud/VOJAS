/**
 * Citizen Reports Routes — M10 Citizen Intelligence Report
 *
 * Extends the base reports.ts with:
 * - Public submission (no auth)
 * - Whistleblower tracking (public)
 * - Media upload with forensic validation
 * - AI triage pipeline
 * - Report moderation
 * - Nearby / public listing
 */

import type { Prisma } from '@vojas/db';
import { prisma } from '@vojas/db';
import {
    AuditService,
    NotFoundError,
    RiskAnalysisOrchestrator
} from '@vojas/domain';
import {
    AuditAction,
    ModerationAction,
    ReportPrivacyLevel,
    ReportStatus,
    ReportTriageStatus,
    UserRole
} from '@vojas/shared';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { MediaValidationService } from '../services/mediaValidationService.js';
import { ReportTriageService } from '../services/reportTriageService.js';
import { created, error, success } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── Service instances ───────────────────────────────────────────────────────

const auditService = new AuditService(prisma);
const triageService = new ReportTriageService(prisma);
const mediaService = new MediaValidationService();
const riskOrchestrator = new RiskAnalysisOrchestrator(prisma);

// ─── Storage Setup ────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads/reports');
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch { /* ignore */ }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    try {
      mediaService.validateFile(file.mimetype, 0, file.originalname);
      cb(null, true);
    } catch (err) {
      cb(err as Error);
    }
  },
});

// ─── Schemas ─────────────────────────────────────────────────────────────────

const reportSubmitSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(10).max(5000),
  category: z.enum([
    'CONSTRUCTION_QUALITY', 'FINANCIAL_IRREGULARITY', 'DELAYED_WORK',
    'ABANDONED_WORK', 'FAKE_DOCUMENTS', 'VENDOR_MISCONDUCT',
    'LOCATION_MISMATCH', 'PROGRESS_MISMATCH', 'ENVIRONMENTAL_VIOLATION',
    'SAFETY_HAZARD', 'OTHER',
  ]),
  privacyLevel: z.enum(['PUBLIC', 'RESTRICTED', 'CONFIDENTIAL', 'ANONYMOUS']).default('RESTRICTED'),
  locationDesc: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationAccuracyM: z.number().positive().optional(),
  incidentDate: z.string().datetime().optional(),
  projectId: z.string().min(1).optional(),
  reporterName: z.string().max(200).optional(),
  reporterEmail: z.string().email().max(200).optional().or(z.literal('')),
  reporterPhone: z.string().max(20).optional(),
  isAnonymous: z.boolean().default(false),
  source: z.string().default('WEB'),
});

// NOTE: this shadows the exported reportListSchema in @vojas/domain. This is
// the one that takes effect for GET /reports, because citizenReportRoutes is
// mounted ahead of reportRoutes in routes/index.ts.
const reportListSchema = z
  .object({
    status: z.string().optional(),
    category: z.string().optional(),
    severity: z.string().optional(),
    triageStatus: z.string().optional(),
    projectId: z.string().optional(),
    assignedToId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
  })
  // Reject unsupported query parameters rather than letting zod strip them.
  // Stripping meant GET /reports?latitude=999 answered 200 with an unfiltered
  // list — the caller believes it filtered, and on a transparency API a
  // silently ignored filter reads as "there is nothing there".
  .strict();

const moderationSchema = z.object({
  action: z.enum(['PUBLISH', 'RESTRICT', 'REQUEST_MORE_INFORMATION', 'REJECT', 'ESCALATE']),
  reason: z.string().min(1).max(1000),
});

const validateSubmissionSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildReportWhere(filters: z.infer<typeof reportListSchema>): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.severity) where.severity = filters.severity;
  if (filters.triageStatus) where.triageStatus = filters.triageStatus;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  return where;
}

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

/**
 * POST /reports/validate — validate submission without persisting
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = validateSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return error(res, 'VALIDATION_ERROR', 'Invalid submission data', parsed.error.errors, 400);
    }

    const issues: string[] = [];

    if (parsed.data.latitude != null && parsed.data.longitude == null) {
      issues.push('Longitude is required when latitude is provided');
    }
    if (parsed.data.longitude != null && parsed.data.latitude == null) {
      issues.push('Latitude is required when longitude is provided');
    }
    if (
      parsed.data.latitude != null && parsed.data.longitude != null &&
      (Math.abs(parsed.data.latitude) > 90 || Math.abs(parsed.data.longitude) > 180)
    ) {
      issues.push('Invalid coordinates: latitude must be -90 to 90, longitude -180 to 180');
    }

    const validCategories = [
      'CONSTRUCTION_QUALITY', 'FINANCIAL_IRREGULARITY', 'DELAYED_WORK',
      'ABANDONED_WORK', 'FAKE_DOCUMENTS', 'VENDOR_MISCONDUCT',
      'LOCATION_MISMATCH', 'PROGRESS_MISMATCH', 'ENVIRONMENTAL_VIOLATION',
      'SAFETY_HAZARD', 'OTHER',
    ];
    if (parsed.data.category && !validCategories.includes(parsed.data.category)) {
      issues.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    success(res, {
      valid: issues.length === 0,
      issues,
      suggestions: parsed.data.description
        ? {
            suggestedCategory: triageService.suggestCategory(parsed.data.description),
            suggestedSeverity: triageService.suggestPriority(parsed.data.description),
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports — public citizen submission
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return error(res, 'VALIDATION_ERROR', 'Invalid report data', parsed.error.errors, 400);
    }

    const data = parsed.data;
    const reportReference = triageService.generateReportReference();
    const now = new Date();

    // Generate whistleblower access token
    const accessToken = crypto.randomBytes(32).toString('hex');
    const accessTokenExp = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const report = await prisma.report.create({
      data: {
        reportReference,
        title: data.title,
        description: data.description,
        category: data.category,
        privacyLevel: data.privacyLevel,
        severity: 'MEDIUM',
        status: ReportStatus.RECEIVED,
        triageStatus: ReportTriageStatus.PENDING,
        locationDesc: data.locationDesc ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        locationAccuracyM: data.locationAccuracyM ?? null,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : null,
        projectId: data.projectId ?? null,
        reporterName: data.isAnonymous ? null : (data.reporterName ?? null),
        reporterEmail: data.isAnonymous ? null : (data.reporterEmail ?? null),
        reporterPhone: data.isAnonymous ? null : (data.reporterPhone ?? null),
        isAnonymous: data.isAnonymous,
        source: data.source ?? 'WEB',
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        submittedAt: now,
        whistleblowerToken: accessToken,
      },
    });

    // Create anonymous access record for tracking
    await prisma.anonymousReportAccess.create({
      data: {
        reportId: report.id,
        accessToken,
        accessTokenExp,
        canViewStatus: true,
        canViewUpdates: true,
      },
    });

    // Create initial status log
    await prisma.reportStatusLog.create({
      data: {
        reportId: report.id,
        fromStatus: null,
        toStatus: ReportStatus.RECEIVED,
        changedById: null,
        notes: 'Report received via public submission',
      },
    });

    // A project-linked report belongs on that project's unified timeline
    // alongside satellite observations, milestones, and financial updates —
    // not just in the reports queue. No code path wrote this before.
    if (report.projectId) {
      await prisma.projectEvent.create({
        data: {
          projectId: report.projectId,
          eventType: 'CITIZEN_REPORT',
          eventDate: report.submittedAt,
          source: data.isAnonymous ? 'Anonymous citizen report' : 'Citizen report',
          description: `Citizen report submitted: "${report.title}" (${report.category}).`,
          confidence: null,
        },
      });

      // Automatically re-run project risk analysis in the background to incorporate the new report
      riskOrchestrator.analyze(report.projectId, { persist: true, forceNewRun: true }).catch((err) => {
        logger.warn(`Background risk analysis after report failed for ${report.projectId}: ${err}`);
      });
    }

    await auditService.logEvent({
      actorId: data.isAnonymous ? 'anonymous' : (data.reporterEmail ?? 'anonymous'),
      actorType: 'CITIZEN',
      action: AuditAction.REPORT_SUBMITTED,
      entityType: 'Report',
      entityId: report.id,
      metadata: { title: report.title, category: report.category, isAnonymous: data.isAnonymous },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    created(res, {
      id: report.id,
      reportReference: report.reportReference,
      status: report.status,
      accessToken: data.isAnonymous ? accessToken : undefined,
      message: data.isAnonymous
        ? 'Your report has been submitted. Save your access token to track its status.'
        : 'Your report has been submitted. You can track it using your email.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reports/public — list public-visible reports
 */
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const category = req.query.category as string | undefined;

    const where: Record<string, unknown> = {
      privacyLevel: ReportPrivacyLevel.PUBLIC,
      status: { in: [ReportStatus.VERIFIED, ReportStatus.RESOLVED] },
    };
    if (category) where.category = category;

    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reportReference: true,
          title: true,
          category: true,
          status: true,
          locationDesc: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          project: { select: { id: true, name: true, state: true, district: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    success(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reports/nearby — find reports near coordinates
 */
router.get('/nearby', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm ?? 2);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return error(res, 'VALIDATION_ERROR', 'Valid lat/lng required', null, 400);
    }
    if (radiusKm < 0.1 || radiusKm > 50) {
      return error(res, 'VALIDATION_ERROR', 'radiusKm must be between 0.1 and 50', null, 400);
    }

    const results = await triageService.findNearbyProjects(lat, lng, radiusKm);
    success(res, results);
  } catch (err) {
    next(err);
  }
});

// ─── AUTHENTICATED ROUTES ────────────────────────────────────────────────────

/**
 * GET /reports — list all reports (auth required)
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportListSchema.safeParse(req.query);
    if (!parsed.success) {
      return error(res, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.errors, 400);
    }

    const p = parsed.data;
    const where = buildReportWhere(p);

    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        include: {
          project: { select: { id: true, name: true, state: true, district: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { media: true, claims: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    success(res, {
      data: data.map(r => ({ ...r, mediaCount: r._count.media, claimsCount: r._count.claims })),
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
 * GET /reports/:id — get single report with media, claims, status logs
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, state: true, district: true, sector: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        media: { orderBy: { createdAt: 'asc' } },
        claims: { orderBy: { createdAt: 'asc' } },
        moderations: { orderBy: { createdAt: 'desc' }, include: { moderator: { select: { id: true, name: true } } } },
        statusLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!report) throw new NotFoundError('Report');

    // Redact reporter identity if not authorized
    const user = (req as any).user;
    const isPrivileged = [UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST].includes(user?.role);

    const sanitized = {
      ...report,
      reporterName: isPrivileged ? report.reporterName : (report.isAnonymous ? null : report.reporterName),
      reporterEmail: isPrivileged ? report.reporterEmail : null,
      reporterPhone: isPrivileged ? report.reporterPhone : null,
    };

    success(res, sanitized);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reports/:id/evidence — get report with related evidence (satellite, financials)
 */
router.get('/:id/evidence', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true, name: true, state: true, district: true, sector: true,
            status: true, approvedAmount: true, spentAmount: true,
            latitude: true, longitude: true,
            satelliteObservations: {
              orderBy: { observationDate: 'desc' },
              take: 5,
              select: { id: true, observationDate: true, thumbnailUrl: true, cloudCover: true },
            },
            financialObservations: { orderBy: { date: 'desc' }, take: 10 },
            documents: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        media: true,
        claims: true,
        statusLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!report) throw new NotFoundError('Report');

    success(res, report);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reports/by-project/:projectId — list reports for a project
 */
router.get('/by-project/:projectId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { media: true, claims: true } },
        },
      }),
      prisma.report.count({ where: { projectId } }),
    ]);

    success(res, {
      data: data.map(r => ({ ...r, mediaCount: r._count.media, claimsCount: r._count.claims })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports/:id/media — upload media (multipart)
 */
router.post(
  '/:id/media',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST, UserRole.CITIZEN, UserRole.MP),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = req.params.id as string;
      const file = req.file;

      if (!file) {
        return error(res, 'VALIDATION_ERROR', 'No file uploaded', null, 400);
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundError('Report');

      // Validate file
      mediaService.validateFile(file.mimetype, file.size, file.originalname);

      // Read file for signature check
      const buffer = fs.readFileSync(file.path);
      if (!mediaService.validateMediaSignature(buffer, file.mimetype)) {
        fs.unlinkSync(file.path);
        return error(res, 'VALIDATION_ERROR', 'File signature does not match declared type', null, 400);
      }

      // Extract metadata
      const metadata = mediaService.extractMetadata(file.path, file.mimetype);

      // Forensic assessment
      const forensicSignals = mediaService.assessMediaForensics(file.path, new Date());
      const forensicStatus = 'REVIEW_REQUIRED' as const;

      const url = `/uploads/reports/${file.filename}`;

      const media = await prisma.reportMedia.create({
        data: {
          reportId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url,
          mediaType: mediaService.getMediaType(file.mimetype),
          captureDate: metadata.captureDate ? new Date(metadata.captureDate) : null,
          captureLat: metadata.gps?.lat ?? null,
          captureLng: metadata.gps?.lng ?? null,
          stripLocation: false,
          forensicStatus,
          forensicSignals: JSON.parse(JSON.stringify(forensicSignals)) as Prisma.InputJsonValue,
        },
      });

      await auditService.logEvent({
        actorId: (req as any).user?.userId ?? 'anonymous',
        actorType: 'USER',
        action: AuditAction.REPORT_MEDIA_UPLOADED,
        entityType: 'ReportMedia',
        entityId: media.id,
        metadata: { reportId, filename: file.originalname, mimeType: file.mimetype },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      created(res, media);
    } catch (err) {
      // Clean up uploaded file on error
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      next(err);
    }
  }
);

/**
 * POST /reports/:id/triage — run AI triage pipeline
 */
router.post(
  '/:id/triage',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = req.params.id as string;
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundError('Report');

      // Mark as processing
      await prisma.report.update({
        where: { id: reportId },
        data: { triageStatus: ReportTriageStatus.PROCESSING },
      });

      // Run triage (async-safe, wraps in try/catch)
      let triageResult;
      try {
        triageResult = await triageService.analyzeReport(reportId);
      } catch (triageErr) {
        await prisma.report.update({
          where: { id: reportId },
          data: { triageStatus: ReportTriageStatus.FAILED },
        });
        throw triageErr;
      }

      await auditService.logEvent({
        actorId: (req as any).user?.userId,
        actorType: 'USER',
        action: AuditAction.REPORT_CLAIMS_EXTRACTED,
        entityType: 'Report',
        entityId: reportId,
        metadata: {
          suggestedCategory: triageResult.suggestedCategory,
          suggestedSeverity: triageResult.suggestedSeverity,
          claimsCount: triageResult.extractedClaims.length,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, triageResult);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /reports/:id — update report (status, assignedToId, resolution, projectId)
 */
router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Report');

    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    const updatableFields = ['status', 'severity', 'assignedToId', 'resolution', 'projectId', 'category', 'triageStatus'];
    for (const field of updatableFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (body.resolvedAt !== undefined) data.resolvedAt = new Date(body.resolvedAt as string);

    const updated = await prisma.report.update({ where: { id }, data });

    // Status log if status changed
    if (body.status && body.status !== existing.status) {
      await prisma.reportStatusLog.create({
        data: {
          reportId: id,
          fromStatus: existing.status as ReportStatus,
          toStatus: body.status as ReportStatus,
          changedById: (req as any).user?.userId,
          notes: body.statusNote as string | undefined,
        },
      });

      await auditService.logEvent({
        actorId: (req as any).user?.userId,
        actorType: 'USER',
        action: AuditAction.REPORT_STATUS_CHANGED,
        entityType: 'Report',
        entityId: id,
        metadata: { fromStatus: existing.status, toStatus: body.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    success(res, updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reports/:id/moderate — moderate report (ADMIN/OFFICER/ANALYST)
 */
router.post(
  '/:id/moderate',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = req.params.id as string;
      const parsed = moderationSchema.safeParse(req.body);
      if (!parsed.success) {
        return error(res, 'VALIDATION_ERROR', 'Invalid moderation data', parsed.error.errors, 400);
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundError('Report');

      const { action, reason } = parsed.data;
      const userId = (req as any).user?.userId;

      // Create moderation record
      const moderation = await prisma.reportModeration.create({
        data: {
          reportId,
          action: action as ModerationAction,
          reason,
          moderatorId: userId,
        },
      });

      // Apply action consequences
      let statusUpdate: ReportStatus | null = null;
      let privacyUpdate: ReportPrivacyLevel | null = null;
      let notifyAssigned = false;

      switch (action) {
        case ModerationAction.PUBLISH:
          statusUpdate = ReportStatus.VERIFIED;
          privacyUpdate = ReportPrivacyLevel.PUBLIC;
          break;
        case ModerationAction.RESTRICT:
          privacyUpdate = ReportPrivacyLevel.RESTRICTED;
          break;
        case ModerationAction.REJECT:
          statusUpdate = ReportStatus.DISMISSED;
          break;
        case ModerationAction.ESCALATE:
          statusUpdate = ReportStatus.ESCALATED;
          break;
        case ModerationAction.REQUEST_MORE_INFORMATION:
          notifyAssigned = true;
          break;
      }

      const updateData: Record<string, unknown> = {};
      if (statusUpdate) updateData.status = statusUpdate;
      if (privacyUpdate) updateData.privacyLevel = privacyUpdate;

      const updated = Object.keys(updateData).length > 0
        ? await prisma.report.update({ where: { id: reportId }, data: updateData })
        : report;

      // Status log
      if (statusUpdate) {
        await prisma.reportStatusLog.create({
          data: {
            reportId,
            fromStatus: report.status as ReportStatus,
            toStatus: statusUpdate,
            changedById: userId,
            notes: `Moderation: ${action} — ${reason}`,
          },
        });
      }

      // Send notification if more info requested
      if (notifyAssigned && report.reporterEmail) {
        await prisma.notification.create({
          data: {
            userId: 'SYSTEM', // In production, would look up reporter user or send email
            type: 'REPORT_MORE_INFO_REQUESTED' as any,
            title: 'More information requested',
            message: `Your report ${report.reportReference} requires additional information: ${reason}`,
            resource: 'Report',
            resourceId: report.id,
          },
        });
      }

      await auditService.logEvent({
        actorId: userId,
        actorType: 'USER',
        action: AuditAction.REPORT_MODERATED,
        entityType: 'Report',
        entityId: reportId,
        metadata: { action, reason, newStatus: statusUpdate ?? report.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      success(res, { moderation, report: updated });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /reports/:id/status — get current status (public, uses reportReference in body)
 */
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        reportReference: true,
        title: true,
        status: true,
        triageStatus: true,
        evidenceQuality: true,
        updatedAt: true,
        assignedTo: { select: { name: true } },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { toStatus: true, notes: true, createdAt: true },
        },
      },
    });
    if (!report) throw new NotFoundError('Report');

    success(res, {
      reportReference: report.reportReference,
      title: report.title,
      status: report.status,
      triageStatus: report.triageStatus,
      evidenceQuality: report.evidenceQuality,
      assignedTo: report.assignedTo?.name ?? null,
      updatedAt: report.updatedAt,
      recentUpdates: report.statusLogs.map(log => ({
        status: log.toStatus,
        note: log.notes,
        date: log.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── WHISTLEBLOWER ROUTES ────────────────────────────────────────────────────

/**
 * GET /reports/track/:reportReference — track report by reference
 */
router.get('/track/:reportReference', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportReference = req.params.reportReference as string;
    const accessToken = typeof req.query.token === 'string' ? req.query.token : undefined;

    const report = await prisma.report.findUnique({
      where: { reportReference },
      include: {
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    }) as (Prisma.ReportGetPayload<{ include: { statusLogs: true } }> & { statusLogs: Array<{ toStatus: string; notes: string | null; createdAt: Date }> }) | null;

    if (!report) throw new NotFoundError('Report');

    const statusHistory = report.statusLogs.map((log) => ({
      status: log.toStatus,
      note: log.notes,
      date: log.createdAt,
    }));

    // Check access if token provided
    if (accessToken) {
      const access = await prisma.anonymousReportAccess.findUnique({
        where: { accessToken },
      });
      if (!access || access.reportId !== report.id) {
        return error(res, 'FORBIDDEN', 'Invalid access token', null, 403);
      }

      // Return full details with token access
      success(res, {
        reportReference: report.reportReference,
        title: report.title,
        status: report.status,
        triageStatus: report.triageStatus,
        category: report.category,
        submittedAt: report.submittedAt,
        updatedAt: report.updatedAt,
        statusHistory,
        accessTokenValid: true,
      });
      return;
    }

    // No token: return limited public info
    success(res, {
      reportReference: report.reportReference,
      title: report.title,
      status: report.status,
      updatedAt: report.updatedAt,
      statusHistory: statusHistory.map(h => ({ status: h.status, date: h.date })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reports/track/:reportReference/status — status only (minimal public view)
 */
router.get('/track/:reportReference/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportReference } = req.params as { reportReference: string };
    const report = await prisma.report.findUnique({
      where: { reportReference },
      select: {
        reportReference: true,
        status: true,
        updatedAt: true,
      },
    });
    if (!report) throw new NotFoundError('Report');

    success(res, {
      reportReference: report.reportReference,
      status: report.status,
      updatedAt: report.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
