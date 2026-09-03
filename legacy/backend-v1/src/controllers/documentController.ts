import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { documentService } from "../services/documentService.js";
import { verifyMagicBytes, getDocumentUpload } from "../utils/storage.js";
import { auditLog } from "../services/auditLogService.js";
import { logger } from "../utils/logger.js";
import { promises as fs } from "fs";
import { ocrService } from "../services/ocrService.js";
import type { VerificationStatus, DocumentType } from "@prisma/client";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  "SANCTION_ORDER", "TENDER", "CONTRACT", "WORK_ORDER",
  "INVOICE", "RECEIPT", "COMPLETION_CERT", "INSPECTION_REPORT",
  "PHOTOGRAPH", "ENVIRONMENTAL_CLEARANCE", "OTHER",
] as const;

const VERIFY_STATUSES = ["VERIFIED", "REJECTED", "REQUIRES_INFO"] as const;

const listQuerySchema = z.object({
  projectId: z.string().optional(),
  type: z.enum(DOCUMENT_TYPES).optional(),
  status: z.enum(VERIFY_STATUSES).optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateMetaSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
});

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "REQUIRES_INFO"]),
  note: z.string().max(1000).optional(),
});

const upload = getDocumentUpload();

// ── Controller ───────────────────────────────────────────────────────────────

export const documentController = {
  /** GET /documents — list with filters, scoped to a project if provided */
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }
    const result = await documentService.list({
      projectId: parsed.data.projectId,
      type: parsed.data.type,
      status: parsed.data.status,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
    res.json(successResponse(result));
  },

  /** GET /documents/search?q=... — global search */
  async search(req: Request, res: Response) {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      return res.status(400).json(errorResponse("BAD_REQUEST", "Query parameter 'q' is required"));
    }
    const page = parseInt(String(req.query.page ?? "1"), 10);
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
    const result = await documentService.list({ search: q, page, limit });
    res.json(successResponse(result));
  },

  /** GET /documents/stats?projectId=... */
  async stats(req: Request, res: Response) {
    const projectId = String(req.query.projectId ?? "");
    if (!projectId) {
      return res.status(400).json(errorResponse("BAD_REQUEST", "projectId is required"));
    }
    const stats = await documentService.stats(projectId);
    res.json(successResponse({ stats }));
  },

  /** GET /documents/:id */
  async getOne(req: Request, res: Response) {
    const doc = await documentService.findById(String(req.params.id));
    res.json(successResponse({ document: doc }));
  },

  /** POST /documents — multipart upload */
  async upload(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
    }

    upload.single("file")(req as any, res as any, async (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json(errorResponse("FILE_TOO_LARGE", "File too large (max 25 MB)"));
        }
        return res.status(400).json(errorResponse("BAD_REQUEST", err.message ?? "Upload failed"));
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json(errorResponse("BAD_REQUEST", "No file uploaded (field 'file' required)"));
      }

      const { projectId, type, title, description } = req.body as {
        projectId?: string; type?: string; title?: string; description?: string;
      };

      if (!projectId || !type || !title) {
        try { await fs.unlink(file.path); } catch { /* ignore */ }
        return res.status(400).json(errorResponse("BAD_REQUEST", "projectId, type, and title are required"));
      }
      if (!DOCUMENT_TYPES.includes(type as any)) {
        try { await fs.unlink(file.path); } catch { /* ignore */ }
        return res.status(400).json(errorResponse("BAD_REQUEST", "Invalid document type"));
      }
      if (!verifyMagicBytes(file.path, file.mimetype)) {
        try { await fs.unlink(file.path); } catch { /* ignore */ }
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "File content does not match its claimed type"));
      }

      try {
        const document = await documentService.create({
          projectId, type: type as any, title,
          description: description || undefined,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: userId,
        });
        await auditLog({
          userId,
          action: "DOCUMENT_UPLOAD",
          resource: "Document",
          resourceId: document.id,
          details: { projectId, type, title },
          req,
        });
        logger.info(`[document] Uploaded: ${title} by user ${userId}`);
        res.status(201).json(successResponse({ document }));

        // Phase 11 — run OCR in the background. Failure here MUST NOT fail the upload.
        void (async () => {
          try {
            const ocr = await ocrService.extractText(file.path, file.mimetype);
            if (ocr.text || ocr.suggestedType) {
              await documentService.applyOcr(document.id, {
                extractedText: ocr.text,
                suggestedType: ocr.suggestedType as any as DocumentType,
                aiConfidence: ocr.confidence,
              });
              logger.info(`[document] OCR done for ${document.id}: ${ocr.suggestedType} (${ocr.confidence}%)`);
            }
          } catch (ocrErr) {
            logger.error("[document] OCR failed:", ocrErr);
          }
        })();
      } catch (e) {
        try { await fs.unlink(file.path); } catch { /* ignore */ }
        logger.error("[document] Upload failed:", e);
        res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to save document record"));
      }
    });
  },

  /** PATCH /documents/:id — update metadata (title, description) */
  async update(req: Request, res: Response) {
    const parsed = updateMetaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid update data", parsed.error.issues)
      );
    }
    const id = String(req.params.id);
    const userId = (req as any).user?.userId ?? "unknown";
    const doc = await documentService.update(id, parsed.data);
    await auditLog({
      userId,
      action: "DOCUMENT_UPDATE",
      resource: "Document",
      resourceId: id,
      details: parsed.data,
      req,
    });
    res.json(successResponse({ document: doc }));
  },

  /** PATCH /documents/:id/verify */
  async verify(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
    }
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid verification data", parsed.error.issues)
      );
    }
    const id = String(req.params.id);
    const { status, note } = parsed.data;
    const doc = await documentService.setVerificationStatus(id, status, userId, note);
    await auditLog({
      userId,
      action: "DOCUMENT_VERIFY",
      resource: "Document",
      resourceId: id,
      details: { status, note },
      req,
    });
    logger.info(`[document] Verified: ${doc.title} -> ${status} by user ${userId}`);
    res.json(successResponse({ document: doc }));
  },

  /** DELETE /documents/:id */
  async remove(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? "unknown";
    const id = String(req.params.id);
    const doc = await documentService.findById(id);
    try { await fs.unlink(`uploads/projects/${doc.filename}`); } catch { /* ignore */ }
    await documentService.remove(id);
    await auditLog({
      userId,
      action: "DOCUMENT_DELETE",
      resource: "Document",
      resourceId: id,
      details: { filename: doc.originalName },
      req,
    });
    logger.info(`[document] Deleted: ${doc.title} by user ${userId}`);
    res.json(successResponse({ deleted: true, id }));
  },

  /** POST /documents/:id/analyze — run AI/OCR analysis */
  async analyze(req: Request, res: Response) {
    const id = String(req.params.id);
    const result = await documentService.analyzeDocument(id);
    res.json(successResponse(result));
  },
};
