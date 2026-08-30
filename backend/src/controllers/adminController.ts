import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { userService } from "../services/userService.js";
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { auditLog } from "../services/auditLogService.js";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(100)
    .refine(
      (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p),
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  role: z.enum(["ADMIN", "OFFICER", "REVIEWER", "ANALYST", "VIEWER"]).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "OFFICER", "REVIEWER", "ANALYST", "VIEWER"]).optional(),
});

const updateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(100).optional(),
});

// ─── System Stats ─────────────────────────────────────────────────────────────

async function systemStats() {
  const [
    userCount,
    projectCount,
    reportCount,
    openAnomalies,
    totalExpenditure,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.report.count(),
    prisma.anomaly.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.expenditure.aggregate({ _sum: { amount: true } }),
  ]);

  return {
    userCount,
    projectCount,
    reportCount,
    openAnomalies,
    totalExpenditure: totalExpenditure._sum.amount ?? 0,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const adminController = {

  // GET /admin/stats
  async getStats(_req: Request, res: Response) {
    const stats = await systemStats();
    res.json(successResponse(stats));
  },

  // GET /admin/users
  async listUsers(_req: Request, res: Response) {
    const users = await userService.findAll();
    res.json(successResponse({ users }));
  },

  // POST /admin/users
  async createUser(req: Request, res: Response) {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid user data", parsed.error.issues)
      );
    }

    const adminUserId = (req as any).user?.userId;
    const user = await userService.create({
      ...parsed.data,
      role: parsed.data.role ?? "VIEWER",
    });

    await auditLog({
      userId: adminUserId,
      action: "CREATE_USER",
      resource: "User",
      resourceId: user.id,
      details: { email: user.email, role: user.role, createdBy: adminUserId },
      req,
    });

    res.status(201).json(successResponse({ user }));
  },

  // PUT /admin/users/:id
  async updateUser(req: Request, res: Response) {
    const id = String(req.params.id);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid update data", parsed.error.issues)
      );
    }

    const existing = await userService.findById(id);
    if (!existing) {
      return res.status(404).json(errorResponse("NOT_FOUND", "User not found"));
    }

    const user = await userService.update(id, parsed.data);
    const adminUserId = (req as any).user?.userId;

    await auditLog({
      userId: adminUserId,
      action: "UPDATE_USER",
      resource: "User",
      resourceId: id,
      details: { before: existing, after: user },
      req,
    });

    res.json(successResponse({ user }));
  },

  // DELETE /admin/users/:id
  async deleteUser(req: Request, res: Response) {
    const id = String(req.params.id);
    const adminUserId = (req as any).user?.userId;

    if (id === adminUserId) {
      return res.status(400).json(
        errorResponse("BAD_REQUEST", "Cannot delete your own account")
      );
    }

    const existing = await userService.findById(id);
    if (!existing) {
      return res.status(404).json(errorResponse("NOT_FOUND", "User not found"));
    }

    await userService.delete(id);

    await auditLog({
      userId: adminUserId,
      action: "DELETE_USER",
      resource: "User",
      resourceId: id,
      details: { deleted: existing },
      req,
    });

    res.json(successResponse({ message: "User deleted successfully" }));
  },

  // GET /admin/anomaly-rules
  async listAnomalyRules(_req: Request, res: Response) {
    const rules = await prisma.anomalyRule.findMany({
      orderBy: { priority: "desc" },
    });
    res.json(successResponse({ rules }));
  },

  // PUT /admin/anomaly-rules/:id
  async updateAnomalyRule(req: Request, res: Response) {
    const id = String(req.params.id);
    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid rule data", parsed.error.issues)
      );
    }

    const rule = await prisma.anomalyRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Anomaly rule not found"));
    }

    const updated = await prisma.anomalyRule.update({
      where: { id },
      data: {
        ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
        ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
      },
    });

    const adminUserId = (req as any).user?.userId;
    await auditLog({
      userId: adminUserId,
      action: "UPDATE_ANOMALY_RULE",
      resource: "AnomalyRule",
      resourceId: id,
      details: { before: rule, after: updated },
      req,
    });

    res.json(successResponse({ rule: updated }));
  },

  // GET /admin/audit-logs
  async listAuditLogs(req: Request, res: Response) {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count(),
    ]);

    res.json(successResponse({
      logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }));
  },
};
