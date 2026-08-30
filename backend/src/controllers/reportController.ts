import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { reportService } from "../services/reportService.js";
import { verifyMagicBytes } from "../utils/storage.js";
import { auditLog } from "../services/auditLogService.js";
import { aiService } from "../services/aiService.js";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  "QUALITY", "DELAY", "CORRUPTION", "SAFETY",
  "ENVIRONMENT", "FINANCIAL", "DOCUMENTATION", "OTHER",
] as const;

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const STATUSES = [
  "SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW",
  "RESOLVED", "REJECTED", "CLOSED",
] as const;
const SOURCES = ["WEB", "MOBILE", "API", "WHISTLEBLOWER"] as const;

const createReportSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(255),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES).optional(),
  reporterName: z.string().min(2).max(100).optional(),
  reporterEmail: z.string().email().optional(),
  reporterPhone: z.string().min(7).max(20).optional(),
  isAnonymous: z.boolean().optional(),
  locationDesc: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  projectId: z.string().optional(),
  source: z.enum(SOURCES).optional(),
});

const updateReportSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().min(20).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  reporterName: z.string().min(2).max(100).optional(),
  reporterEmail: z.string().email().optional(),
  reporterPhone: z.string().min(7).max(20).optional(),
  locationDesc: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  projectId: z.string().optional(),
  resolution: z.string().max(2000).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  projectId: z.string().optional(),
  assignedToId: z.string().optional(),
  isAnonymous: z.coerce.boolean().optional(),
  search: z.string().max(255).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const transitionSchema = z.object({
  toStatus: z.enum(STATUSES),
  notes: z.string().max(1000).optional(),
  resolution: z.string().max(2000).optional(),
});

const assignSchema = z.object({
  assignedToId: z.string().min(1, "Assignee user ID is required"),
});

// ── Controller ───────────────────────────────────────────────────────────────

export const reportController = {
  /**
   * Public submission endpoint. No auth required.
   * Citizens (or anonymous sources) submit reports here.
   * Phase 11: Runs AI analysis on submission and stores the result.
   */
  async submit(req: Request, res: Response) {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid report data", parsed.error.issues)
      );
    }

    // Capture IP and user-agent for audit
    const ipAddress = req.ip ?? req.headers["x-forwarded-for"]?.toString();
    const userAgent = req.headers["user-agent"];

    const report = await reportService.create({
      ...parsed.data,
      ipAddress,
      userAgent,
    });

    // Phase 11: Run AI analysis on the submitted report text
    let aiAnalysis: ReturnType<typeof aiService.analyzeReport> | null = null;
    try {
      aiAnalysis = aiService.analyzeReport(report.title, report.description);
      await reportService.setAIAnalysis(report.id, aiAnalysis);
    } catch (err) {
      // AI analysis failure should not block report submission
      console.error("[AI] Report analysis failed:", err);
    }

    await auditLog({
      userId: report.reporterEmail ?? "anonymous",
      action: "REPORT_SUBMIT",
      resource: "Report",
      resourceId: report.id,
      details: { category: report.category, severity: report.severity, isAnonymous: report.isAnonymous },
      req,
    });

    res.status(201).json(successResponse({
      report: {
        id: report.id,
        title: report.title,
        status: report.status,
        category: report.category,
        severity: report.severity,
        createdAt: report.createdAt,
      },
      aiAnalysis, // Include AI result in response
      message: "Report submitted successfully. Track your report using the report ID.",
    }));
  },

  /**
   * Officer / reviewer review queue. Auth required.
   */
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    // Phase 13: pass requesting role so service can apply PII redaction
    const user = (req as any).user;
    const result = await reportService.findAll({
      ...parsed.data,
      requestingRole: user?.role ?? null,
    });

    // Audit log when at least one item was redacted for this requester
    const redactedCount = result.items.filter(
      (r: any) => r.reporterName === "[REDACTED]" || r.reporterEmail === "[REDACTED]" || r.reporterPhone === "[REDACTED]"
    ).length;
    if (redactedCount > 0) {
      await auditLog({
        userId: user?.userId ?? "unknown",
        action: "REPORT_VIEWED_REDACTED",
        resource: "Report",
        resourceId: `list:${result.items.length},redacted:${redactedCount}`,
        details: { role: user?.role, redactedCount, total: result.items.length },
        req,
      });
    }

    res.json(successResponse(result));
  },

  /**
   * Get a single report with full status log and attachments.
   * Phase 13: PII is redacted for non-ADMIN requesters.
   */
  async getOne(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    const user = (req as any).user;
    const report = await reportService.findById(id, user?.role ?? null);

    // Audit log when PII was redacted for this single-report view
    if (
      report.reporterName === "[REDACTED]" ||
      report.reporterEmail === "[REDACTED]" ||
      report.reporterPhone === "[REDACTED]"
    ) {
      await auditLog({
        userId: user?.userId ?? "unknown",
        action: "REPORT_VIEWED_REDACTED",
        resource: "Report",
        resourceId: id,
        details: { role: user?.role, fieldsRedacted: ["reporterName", "reporterEmail", "reporterPhone"] },
        req,
      });
    }

    res.json(successResponse({ report }));
  },

  /**
   * Update report metadata. Does not change status.
   */
  async update(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    const parsed = updateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid report data", parsed.error.issues)
      );
    }

    const report = await reportService.update(id, parsed.data);
    res.json(successResponse({ report }));
  },

  /**
   * Move a report through the status workflow.
   * Validates transitions and writes a status log entry.
   */
  async transition(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid transition data", parsed.error.issues)
      );
    }

    const userId = (req as any).user?.userId ?? null;
    const { toStatus, notes, resolution } = parsed.data;

    const report = await reportService.transitionStatus(
      id,
      toStatus,
      userId,
      notes,
      resolution
    );

    await auditLog({
      userId: userId ?? "unknown",
      action: "REPORT_STATUS_CHANGE",
      resource: "Report",
      resourceId: id,
      details: { toStatus, notes, resolution },
      req,
    });

    res.json(successResponse({ report }));
  },

  /**
   * Assign a report to a reviewer or officer.
   */
  async assign(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid assignment data", parsed.error.issues)
      );
    }

    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Authentication required")
      );
    }

    const report = await reportService.assign(id, parsed.data.assignedToId, userId);
    res.json(successResponse({ report }));
  },

  /**
   * Delete a report. ADMIN only.
   */
  async remove(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    await reportService.delete(id);
    res.json(successResponse({ message: "Report deleted successfully" }));
  },

  /**
   * Review queue statistics for the officer dashboard.
   */
  async stats(_req: Request, res: Response) {
    const stats = await reportService.getStats();
    res.json(successResponse({ stats }));
  },

  /**
   * Upload an attachment to a report. Multipart form-data with field "file".
   * Public endpoint (the report already came through the submit flow).
   */
  async uploadAttachment(req: Request, res: Response) {
    const reportId = String(req.params.id ?? "");
    if (!reportId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    const file = (req as any).file as
      | { originalname: string; mimetype: string; size: number; path: string }
      | undefined;

    if (!file) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "No file uploaded (field name: 'file')")
      );
    }

    // Verify file content matches claimed MIME type (anti-spoofing)
    if (!verifyMagicBytes(file.path, file.mimetype)) {
      // Delete the uploaded file — it's not what it claims to be
      try {
        const fs = await import("fs");
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch { /* ignore */ }
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR",
          "File content does not match its claimed type. Upload rejected.")
      );
    }

    try {
      const attachment = await reportService.addAttachment(reportId, file);
      res.status(201).json(successResponse({ attachment }));
    } catch (err: any) {
      // Clean up the orphaned upload on failure
      try {
        const fs = await import("fs");
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch { /* ignore */ }
      throw err;
    }
  },

  /**
   * Audit-only: return the original, un-redacted report.
   * Requires ADMIN or REVIEWER role + mandatory X-Investigation-Context header.
   * Every invocation is logged to AuditLog with the investigation context.
   */
  async getOriginal(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Report ID is required")
      );
    }

    const investigationContext = req.headers["x-investigation-context"];
    if (
      typeof investigationContext !== "string" ||
      investigationContext.trim().length < 10 ||
      investigationContext.trim().length > 500
    ) {
      return res.status(400).json(
        errorResponse(
          "VALIDATION_ERROR",
          "x-investigation-context header is required (10–500 characters) to access original report data"
        )
      );
    }

    const userId = (req as any).user?.userId ?? null;
    const userRole = (req as any).user?.role ?? null;
    const userEmail = (req as any).user?.email ?? null;

    const report = await reportService.getOriginal(id);

    await auditLog({
      userId: userId ?? "unknown",
      action: "REPORT_ORIGINAL_VIEWED",
      resource: "Report",
      resourceId: id,
      details: {
        investigationContext: investigationContext.trim(),
        accessedByRole: userRole,
        accessedByEmail: userEmail,
        accessedAt: new Date().toISOString(),
        fieldsExposed: [
          "reporterName",
          "reporterEmail",
          "reporterPhone",
          "ipAddress",
          "userAgent",
        ],
      },
      req,
    });

    res.json(successResponse({
      report,
      _warning:
        "ORIGINAL PII — INVESTIGATION ACCESS ONLY. This access has been audit-logged.",
    }));
  },

  /**
   * Delete an attachment. ADMIN / OFFICER / REVIEWER.
   */
  async removeAttachment(req: Request, res: Response) {
    const attachmentId = String(req.params.attachmentId ?? "");
    if (!attachmentId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Attachment ID is required")
      );
    }

    await reportService.removeAttachment(attachmentId);
    res.json(successResponse({ message: "Attachment removed successfully" }));
  },
};
