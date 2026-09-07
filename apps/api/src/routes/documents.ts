import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { AuditAction, UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { success, created } from '../utils/apiResponse';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  DocumentIntelligenceService,
  type ExtractedFields,
} from '../services/documentIntelligence.js';

const router = Router();

// ─── File storage directory ────────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch { /* ignore */ }

const intelligenceService = new DocumentIntelligenceService(prisma);

// ─── Schemas ───────────────────────────────────────────────────────────────

const searchSchema = z.object({
  q: z.string().min(2),
  projectId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const uploadSchema = z.object({
  projectId: z.string().uuid(),
  type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  // Base64-encoded file content
  content: z.string(),
  filename: z.string().min(1),
  mimeType: z.string(),
  size: z.number().min(1).max(MAX_FILE_SIZE),
});

// ─── Existing: List documents ───────────────────────────────────────────────

/**
 * GET /documents — list all documents (with optional filters)
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const projectId = req.query.projectId as string | undefined;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true, state: true, district: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    success(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /documents/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
    });
    if (!doc) throw new NotFoundError('Document');
    success(res, doc);
  } catch (err) {
    next(err);
  }
});

// ─── M9: Document Intelligence endpoints ──────────────────────────────────

/**
 * POST /documents/upload — upload a document (OFFICER+)
 * JSON body: { projectId, type?, title?, description?, content(base64), filename, mimeType, size }
 */
router.post(
  '/upload',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) throw new ValidationError('Authentication required');

      const parsed = uploadSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid upload data', parsed.error.errors);

      const { projectId, type, title, description, content, filename, mimeType, size } = parsed.data;

      // Validate MIME type and extension
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new ValidationError(`File type ${mimeType} not allowed.`);
      }
      const ext = path.extname(filename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new ValidationError(`File extension ${ext} not allowed.`);
      }

      // Save file to disk
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${uniqueName}`;

      const document = await intelligenceService.createDocumentFromUpload({
        projectId,
        uploadedById: userId,
        filename: uniqueName,
        originalName: filename,
        mimeType,
        size,
        url: fileUrl,
        type,
        title,
        description,
      });

      created(res, document);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /documents/:id/reprocess — re-run extraction on an existing document
 */
router.post(
  '/:id/reprocess',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const document = await prisma.document.findUnique({ where: { id } });
      if (!document) throw new NotFoundError('Document');

      await intelligenceService.processDocument(id);
      const updated = await prisma.document.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
      });

      success(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /documents/:id/extraction — get document extraction results
 */
router.get(
  '/:id/extraction',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new NotFoundError('Document');

      const extraction = {
        documentId: doc.id,
        extractedText: doc.extractedText ?? null,
        suggestedType: doc.suggestedType ?? null,
        aiConfidence: doc.aiConfidence ?? null,
        status: doc.status,
        processingComplete: doc.extractedText != null,
      };

      success(res, extraction);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /documents/:id/cross-check — run cross-check on a document
 */
router.get(
  '/:id/cross-check',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new NotFoundError('Document');

      const extraction = {
        id: `extraction-${doc.id}`,
        documentId: doc.id,
        extractedText: doc.extractedText ?? '',
        confidence: (doc.aiConfidence
          ? (doc.aiConfidence >= 80 ? 'HIGH' : doc.aiConfidence >= 50 ? 'MEDIUM' : 'LOW')
          : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
        confidenceScore: doc.aiConfidence ?? 0,
        fields: {} as ExtractedFields,
        pageEvidence: [],
        processingStatus: doc.extractedText ? ('COMPLETED' as const) : ('PENDING' as const),
        processingTimeMs: 0,
      };

      const crossCheck = await intelligenceService.crossCheck(doc, extraction);
      success(res, crossCheck);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /documents/search/query — full-text search across document content
 */
router.get(
  '/search/query',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = searchSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Invalid search parameters', parsed.error.errors);

      const { q, projectId, limit } = parsed.data;
      const results = await intelligenceService.search(q, projectId);

      success(res, results.slice(0, limit));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /documents/by-project/:projectId — list all documents for a project
 */
router.get(
  '/by-project/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId as string;
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const documents = await prisma.document.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
      });

      success(res, documents);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /documents/:id/verify — verify/reject a document (OFFICER+)
 */
router.patch(
  '/:id/verify',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.OFFICER, UserRole.REVIEWER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id;
      const { status, verificationNote } = req.body as { status: string; verificationNote?: string };

      if (!['VERIFIED', 'REJECTED', 'REQUIRES_INFO'].includes(status)) {
        throw new ValidationError('status must be VERIFIED, REJECTED, or REQUIRES_INFO');
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new NotFoundError('Document');

      const updated = await prisma.document.update({
        where: { id },
        data: {
          status,
          verifiedById: userId,
          verifiedAt: new Date(),
          verificationNote: verificationNote ?? null,
        },
      });

      success(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
