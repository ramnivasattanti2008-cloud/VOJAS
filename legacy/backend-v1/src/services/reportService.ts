import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { redactReport, redactReportList } from "./redactionService.js";
import { notifyReportSubmitted } from "./notificationService.js";
import type {
  ReportCategory,
  ReportSeverity,
  ReportStatus,
} from "@prisma/client";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

export interface CreateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  severity?: ReportSeverity;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous?: boolean;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateReportInput {
  title?: string;
  description?: string;
  category?: ReportCategory;
  severity?: ReportSeverity;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
  resolution?: string;
}

export interface ReportFilters {
  status?: ReportStatus;
  category?: ReportCategory;
  severity?: ReportSeverity;
  projectId?: string;
  assignedToId?: string;
  isAnonymous?: boolean;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  // Phase 13 — PII redaction
  requestingRole?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Public submission needs at least an email or a name (unless fully anonymous)
function validateReporter(input: CreateReportInput): void {
  if (input.isAnonymous) {
    // Anonymous — no identifying info required
    return;
  }
  if (!input.reporterName && !input.reporterEmail) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Either reporterName or reporterEmail is required for non-anonymous reports"
    );
  }
  if (input.reporterEmail) {
    // Light email format check (full Zod validation lives in controller)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(input.reporterEmail)) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid reporter email format");
    }
  }
}

async function ensureProjectExists(projectId?: string): Promise<void> {
  if (!projectId) return;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new AppError(404, "NOT_FOUND", `Project with id '${projectId}' not found`);
  }
}

export const reportService = {
  /**
   * Create a new citizen report. Public endpoint — no auth required.
   * Always starts as SUBMITTED and writes a status log entry.
   */
  async create(input: CreateReportInput): Promise<any> {
    validateReporter(input);
    await ensureProjectExists(input.projectId);

    const report = await prisma.report.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        severity: input.severity ?? "LOW",
        status: "SUBMITTED",
        reporterName: input.isAnonymous ? null : (input.reporterName?.trim() ?? null),
        reporterEmail: input.isAnonymous ? null : (input.reporterEmail?.trim() ?? null),
        reporterPhone: input.reporterPhone?.trim() ?? null,
        isAnonymous: input.isAnonymous ?? false,
        locationDesc: input.locationDesc?.trim() ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        projectId: input.projectId ?? null,
        source: input.source ?? "WEB",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        statusLogs: {
          create: {
            toStatus: "SUBMITTED",
            notes: "Report submitted",
          },
        },
      },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true },
        },
        statusLogs: true,
      },
    });

    // Fire-and-forget: notify officers and reviewers about the new report.
    void notifyReportSubmitted(report.id, report.title, input.category).catch(
      (err: unknown) => {
        logger.warn("[notify] report notification failed:", err);
      }
    );

    return report;
  },

  /**
   * List reports with filters. Used by the officer review queue.
   */
  async findAll(filters: ReportFilters): Promise<PaginatedResult<any>> {
    const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.severity) where.severity = filters.severity;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.isAnonymous !== undefined) where.isAnonymous = filters.isAnonymous;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { locationDesc: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { severity: "desc" }, // CRITICAL first
          { createdAt: "desc" },
        ],
        include: {
          project: {
            select: { id: true, name: true, district: true, state: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          _count: {
            select: { statusLogs: true, attachments: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      items: redactReportList(items, { requestingRole: filters.requestingRole }).items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findById(id: string, requestingRole?: string | null): Promise<any> {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true, sector: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        statusLogs: {
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
      },
    });

    if (!report) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${id}' not found`);
    }

    return redactReport(report, { requestingRole }).redacted;
  },

  /**
   * Update report metadata (title, description, category, severity, etc.)
   * Does NOT change status — use transitionStatus() for that.
   */
  async update(id: string, input: UpdateReportInput): Promise<any> {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${id}' not found`);
    }

    if (input.projectId !== undefined) {
      await ensureProjectExists(input.projectId);
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.category !== undefined) updateData.category = input.category;
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.reporterName !== undefined) updateData.reporterName = input.reporterName?.trim() ?? null;
    if (input.reporterEmail !== undefined) updateData.reporterEmail = input.reporterEmail?.trim() ?? null;
    if (input.reporterPhone !== undefined) updateData.reporterPhone = input.reporterPhone?.trim() ?? null;
    if (input.locationDesc !== undefined) updateData.locationDesc = input.locationDesc?.trim() ?? null;
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.projectId !== undefined) updateData.projectId = input.projectId ?? null;
    if (input.resolution !== undefined) updateData.resolution = input.resolution?.trim() ?? null;

    return prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }).then(r => redactReport(r, { requestingRole: undefined }));
  },

  /**
   * Move report through the status workflow.
   * Allowed transitions:
   *   SUBMITTED      → ACKNOWLEDGED, UNDER_REVIEW, REJECTED, CLOSED
   *   ACKNOWLEDGED   → UNDER_REVIEW, REJECTED, CLOSED
   *   UNDER_REVIEW   → RESOLVED, REJECTED, CLOSED
   *   RESOLVED       → CLOSED, UNDER_REVIEW (re-open)
   *   REJECTED       → CLOSED
   *   CLOSED         → (terminal)
   */
  async transitionStatus(
    id: string,
    toStatus: ReportStatus,
    changedById: string | null,
    notes?: string,
    resolution?: string
  ): Promise<any> {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${id}' not found`);
    }

    const validTransitions: Record<ReportStatus, ReportStatus[]> = {
      SUBMITTED:    ["ACKNOWLEDGED", "UNDER_REVIEW", "REJECTED", "CLOSED"],
      ACKNOWLEDGED: ["UNDER_REVIEW", "REJECTED", "CLOSED"],
      UNDER_REVIEW: ["RESOLVED", "REJECTED", "CLOSED"],
      RESOLVED:     ["CLOSED", "UNDER_REVIEW"],
      REJECTED:     ["CLOSED"],
      CLOSED:       [],
    };

    if (!validTransitions[existing.status].includes(toStatus)) {
      throw new AppError(
        400,
        "INVALID_TRANSITION",
        `Cannot transition report from '${existing.status}' to '${toStatus}'`
      );
    }

    const updateData: any = { status: toStatus };
    if (toStatus === "RESOLVED") {
      updateData.resolvedAt = new Date();
      if (resolution) updateData.resolution = resolution.trim();
    } else if (toStatus === "UNDER_REVIEW" && existing.status === "RESOLVED") {
      // Re-opening: clear resolution timestamp
      updateData.resolvedAt = null;
    }

    return prisma.report.update({
      where: { id },
      data: {
        ...updateData,
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus,
            changedById: changedById ?? null,
            notes: notes?.trim() ?? null,
          },
        },
      },
      include: {
        statusLogs: {
          orderBy: { createdAt: "asc" },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    }).then(r => redactReport(r, { requestingRole: undefined }));
  },

  /**
   * Assign a report to a reviewer/officer.
   */
  async assign(id: string, assignedToId: string, assignedById: string): Promise<any> {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${id}' not found`);
    }

    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee) {
      throw new AppError(404, "NOT_FOUND", `User with id '${assignedToId}' not found`);
    }

    return prisma.report.update({
      where: { id },
      data: {
        assignedToId,
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: existing.status, // status doesn't change, just assignment
            changedById: assignedById,
            notes: `Assigned to ${assignee.name} (${assignee.role})`,
          },
        },
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }).then(r => redactReport(r, { requestingRole: undefined }));
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${id}' not found`);
    }

    // Cascade delete handles statusLogs and attachments
    await prisma.report.delete({ where: { id } });
  },

  /**
   * Dashboard stats for the officer review queue.
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    unassigned: number;
    criticalOpen: number;
    last7Days: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      total,
      byStatus,
      byCategory,
      bySeverity,
      unassigned,
      criticalOpen,
      last7Days,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.groupBy({ by: ["status"], _count: true }),
      prisma.report.groupBy({ by: ["category"], _count: true }),
      prisma.report.groupBy({ by: ["severity"], _count: true }),
      prisma.report.count({ where: { assignedToId: null, status: { not: "CLOSED" } } }),
      prisma.report.count({
        where: {
          severity: "CRITICAL",
          status: { in: ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW"] },
        },
      }),
      prisma.report.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s.status] = s._count;

    const categoryMap: Record<string, number> = {};
    for (const c of byCategory) categoryMap[c.category] = c._count;

    const severityMap: Record<string, number> = {};
    for (const s of bySeverity) severityMap[s.severity] = s._count;

    return {
      total,
      byStatus: statusMap,
      byCategory: categoryMap,
      bySeverity: severityMap,
      unassigned,
      criticalOpen,
      last7Days,
    };
  },

  /**
   * Add an attachment to a report.
   * file should have: originalname, mimetype, size, path (disk path)
   */
  async addAttachment(
    reportId: string,
    file: { originalname: string; mimetype: string; size: number; path: string }
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${reportId}' not found`);
    }

    // Count existing attachments — max 5
    const count = await prisma.reportAttachment.count({ where: { reportId } });
    if (count >= 5) {
      throw new AppError(400, "ATTACHMENT_LIMIT", "Maximum of 5 attachments per report reached");
    }

    // Store the path relative to the upload base
    const relativeUrl = `/uploads/reports/${path.basename(file.path)}`;

    return prisma.reportAttachment.create({
      data: {
        reportId,
        filename: path.basename(file.path),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: relativeUrl,
      },
    });
  },

  /**
   * Remove an attachment by ID. Deletes the file from disk too.
   */
  async removeAttachment(attachmentId: string) {
    const attachment = await prisma.reportAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      throw new AppError(404, "NOT_FOUND", `Attachment with id '${attachmentId}' not found`);
    }

    // Remove the file from disk
    const filePath = path.resolve(attachment.url.replace("/uploads/", "uploads/"));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Non-fatal — file might already be gone
    }

    await prisma.reportAttachment.delete({ where: { id: attachmentId } });
  },

  /**
   * Phase 11: Store AI analysis results on a report.
   */
  async setAIAnalysis(
    reportId: string,
    analysis: {
      keywords: string[];
      corruptionIndicators: string[];
      sentiment: string;
      suggestedSeverity: string;
      confidence: number;
      summary: string;
    }
  ): Promise<void> {
    await prisma.report.update({
      where: { id: reportId },
      data: {
        aiAnalysis: JSON.stringify(analysis),
        aiAnalyzedAt: new Date(),
      },
    });
  },

  /**
   * Return the raw, un-redacted Report for authorized investigation.
   * This bypasses `redactReport()` so the original PII is exposed.
   * The caller is responsible for:
   *   - role-checking the requester (ADMIN / REVIEWER only)
   *   - requiring an `X-Investigation-Context` header
   *   - writing a `REPORT_ORIGINAL_VIEWED` entry to AuditLog
   *
   * Used only by `reportController.getOriginal`.
   */
  async getOriginal(id: string): Promise<any> {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true, sector: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        statusLogs: {
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
      },
    });

    if (!report) {
      throw new AppError(404, "NOT_FOUND", `Report with id '${id}' not found`);
    }

    return report;
  },
};
