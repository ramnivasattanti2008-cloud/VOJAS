import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { aiService } from "./aiService.js";
import type {
  DocumentType,
  VerificationStatus,
} from "@prisma/client";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { DOCUMENT_UPLOAD_DIR } from "../utils/storage.js";

export interface CreateDocumentInput {
  projectId: string;
  type: DocumentType;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
}

export interface DocumentFilters {
  projectId?: string;
  type?: DocumentType;
  status?: VerificationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DocumentListResult {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Resolve the on-disk path for a document's stored file. */
export function getDocumentPath(filename: string): string {
  return path.resolve(DOCUMENT_UPLOAD_DIR, filename);
}

/** Resolve the public URL for a document. */
export function getDocumentUrl(filename: string): string {
  return `/uploads/projects/${filename}`;
}

const ALLOWED_VERIFICATION_STATUSES: VerificationStatus[] = [
  "VERIFIED",
  "REJECTED",
  "REQUIRES_INFO",
];

export const documentService = {
  /**
   * Create a document record after a successful upload.
   */
  async create(input: CreateDocumentInput) {
    return prisma.document.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        filename: input.filename,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        url: getDocumentUrl(input.filename),
        status: "PENDING",
        uploadedById: input.uploadedById ?? null,
      },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  },

  /**
   * List documents with optional filters. Used for both project-scoped
   * listing (when `filters.projectId` is set) and global search.
   */
  async list(filters: DocumentFilters): Promise<DocumentListResult> {
    const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    // Free-text search: scope to title/description; in global search mode
    // (no projectId) also match by type.
    if (filters.search) {
      const searchClauses: any[] = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
      if (!filters.projectId) {
        searchClauses.push({ type: { contains: filters.search, mode: "insensitive" } });
      }
      where.OR = searchClauses;
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: "desc" },
        include: {
          project: { select: { id: true, name: true, district: true, state: true } },
          uploadedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          verifiedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get a single document by ID.
   */
  async findById(id: string) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true, sector: true },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        verifiedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!document) {
      throw new AppError(404, "NOT_FOUND", `Document with id '${id}' not found`);
    }

    return document;
  },

  /**
   * Update document metadata (title, description).
   */
  async update(
    id: string,
    data: { title?: string; description?: string }
  ) {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Document with id '${id}' not found`);
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;

    return prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: { select: { id: true, name: true, email: true, role: true } },
        verifiedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  },

  /**
   * Verify or reject a document. Officer/Admin only.
   */
  async setVerificationStatus(
    id: string,
    status: VerificationStatus,
    userId: string,
    note?: string
  ) {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Document with id '${id}' not found`);
    }

    if (!ALLOWED_VERIFICATION_STATUSES.includes(status)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        `Invalid verification status: '${status}'. Allowed: ${ALLOWED_VERIFICATION_STATUSES.join(", ")}`
      );
    }

    return prisma.document.update({
      where: { id },
      data: {
        status,
        verifiedById: userId,
        verifiedAt: new Date(),
        verificationNote: note?.trim() ?? null,
      },
      include: {
        project: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  },

  /**
   * Delete a document. Removes the file from disk.
   */
  async remove(id: string): Promise<void> {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Document with id '${id}' not found`);
    }

    const filePath = getDocumentPath(existing.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn(`[document] Could not delete file: ${filePath}`, err);
    }

    await prisma.document.delete({ where: { id } });
  },

  /**
   * Aggregate counts for a project — used for badges and stats.
   */
  async stats(projectId: string) {
    const rows = await prisma.document.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = r._count._all;
    return {
      total: Object.values(byStatus).reduce((s, v) => s + v, 0),
      byStatus,
      verified: byStatus.VERIFIED ?? 0,
      pending: byStatus.PENDING ?? 0,
      rejected: byStatus.REJECTED ?? 0,
      requiresInfo: byStatus.REQUIRES_INFO ?? 0,
    };
  },

  /**
   * Persist OCR results to a document. Called by the upload controller
   * after a successful file upload, in the background.
   */
  async applyOcr(
    id: string,
    data: { extractedText?: string; suggestedType?: DocumentType; aiConfidence?: number }
  ) {
    return prisma.document.update({
      where: { id },
      data: {
        extractedText: data.extractedText ?? null,
        suggestedType: (data.suggestedType as DocumentType | undefined) ?? null,
        aiConfidence: data.aiConfidence ?? null,
      },
    });
  },

  /**
   * Run AI analysis on a document's file. PDF: text extraction + classify.
   * Image: heuristic extractor (Phase 11 ocrService).
   */
  async analyzeDocument(id: string): Promise<{ aiAnalysis: any; ocrStatus: string }> {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new AppError(404, "NOT_FOUND", `Document with id '${id}' not found`);
    }

    const filePath = getDocumentPath(document.filename);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, "NOT_FOUND", `Document file not found on disk`);
    }

    let extractedText = "";
    let ocrStatus = "EXTRACTED";

    if (document.mimeType === "application/pdf") {
      try {
        // pdf-parse is CJS — dynamic import gives the module, function is on .default
        const pdfModule: any = await import("pdf-parse");
        const pdfParse = pdfModule.default ?? pdfModule;
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        extractedText = (data.text ?? "").trim();
        if (!extractedText) ocrStatus = "NO_TEXT_FOUND";
      } catch (err) {
        logger.warn("[document] pdf-parse failed:", err);
        ocrStatus = "EXTRACTION_FAILED";
      }
    } else {
      // Images: use the heuristic OCR service
      try {
        const { ocrService } = await import("./ocrService.js");
        const result = await ocrService.extractText(filePath, document.mimeType);
        extractedText = result.text;
        ocrStatus = result.text ? "EXTRACTED" : "NO_TEXT_FOUND";
      } catch {
        ocrStatus = "MANUAL_REVIEW_NEEDED";
      }
    }

    // Run AI analysis on whatever text we have
    const analysis = aiService.analyzeDocument(extractedText);

    const aiAnalysis = {
      ...analysis,
      ocrStatus,
      analyzedAt: new Date().toISOString(),
    };

    // Write to the new Phase-11 fields
    await prisma.document.update({
      where: { id },
      data: {
        extractedText: extractedText || null,
        suggestedType: (analysis as any).suggestedType ?? null,
        aiConfidence: (analysis as any).confidence ?? null,
      } as any,
    });

    return { aiAnalysis, ocrStatus };
  },
};
