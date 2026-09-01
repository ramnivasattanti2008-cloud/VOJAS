/**
 * Whistleblower Service — Phase 65: Privacy-Preserving Whistleblower System
 * Encrypted, anonymous sensitive reports with restricted access
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { auditLog } from "./auditLogService.js";

export interface SubmitWhistleblowerReportInput {
  category: string;
  title: string;
  description: string;
  encryptedData?: string;
  source?: string;
  ipAddress?: string;
}

export const whistleblowerService = {
  /**
   * Public submission — no auth required. PII is NOT stored.
   * IP address is recorded for security (not displayed to investigators).
   */
  async submit(data: SubmitWhistleblowerReportInput) {
    // Strip any PII-like fields from description (basic sanitization)
    const sanitized = this.sanitizeDescription(data.description);

    const report = await prisma.whistleblowerReport.create({
      data: {
        category: data.category,
        title: data.title,
        description: sanitized,
        encryptedData: data.encryptedData,
        source: data.source ?? "WEB",
        ipAddress: data.ipAddress,
        status: "RECEIVED",
      },
    });

    logger.info(`[whistleblower] Anonymous report received: ${report.id} (${data.category})`);
    return report;
  },

  /**
   * List for authorized reviewers only (ADMIN / REVIEWER).
   * IP address is never returned.
   */
  async list(opts: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, category, page = 1, limit = 50 } = opts;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [total, items] = await Promise.all([
      prisma.whistleblowerReport.count({ where }),
      prisma.whistleblowerReport.findMany({
        where,
        select: {
          id: true,
          category: true,
          title: true,
          description: true,
          status: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          reviewedById: true,
          reviewedAt: true,
          resolution: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) };
  },

  async findById(id: string) {
    const report = await prisma.whistleblowerReport.findUnique({
      where: { id },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        encryptedData: true,
        status: true,
        source: true,
        createdAt: true,
        reviewedById: true,
        reviewedAt: true,
        resolution: true,
        updatedAt: true,
      },
    });
    if (!report) throw new AppError(404, "NOT_FOUND", `Whistleblower report '${id}' not found`);
    return report;
  },

  async review(id: string, userId: string, status: string, resolution?: string) {
    const report = await prisma.whistleblowerReport.update({
      where: { id },
      data: {
        status,
        reviewedById: userId,
        reviewedAt: new Date(),
        resolution,
      },
    });

    await auditLog({
      userId,
      action: "WHISTLEBLOWER_REVIEW",
      resource: "WhistleblowerReport",
      resourceId: id,
      details: { status, resolution },
    });

    logger.info(`[whistleblower] Report ${id} reviewed by ${userId}: ${status}`);
    return report;
  },

  async escalate(id: string, userId: string) {
    return this.review(id, userId, "ESCALATED");
  },

  async getStats() {
    const [total, byStatus, byCategory] = await Promise.all([
      prisma.whistleblowerReport.count(),
      prisma.whistleblowerReport.groupBy({ by: ["status"], _count: true }),
      prisma.whistleblowerReport.groupBy({ by: ["category"], _count: true }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, r._count])),
    };
  },

  /** Basic sanitization — strip phone/email patterns from whistleblower text */
  sanitizeDescription(text: string): string {
    return text
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[REDACTED_EMAIL]")
      .replace(/\b\d{10,}\b/g, "[REDACTED_PHONE]")
      .replace(/\b\d{2}[-\s]?\d{10,}\b/g, "[REDACTED_PHONE]");
  },
};
