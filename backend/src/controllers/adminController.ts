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

  // POST /admin/seed — no auth required, seeded by a secret token
  // Call with: POST /api/v1/admin/seed?key=<SEED_SECRET>
  async seed(req: Request, res: Response) {
    const key = String(req.query.key ?? "");
    const SEED_SECRET = process.env.SEED_SECRET || "vojas-dev-seed";
    if (key !== SEED_SECRET) {
      return res.status(403).json(errorResponse("FORBIDDEN", "Invalid seed key"));
    }
    const bcrypt = (await import("bcryptjs")).default;
    const { config } = await import("../config/index.js");
    const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "VojasDevPassword123";
    const DEMO_USERS = [
      { name: "Anitha Krishnan", email: "admin@vojas.gov",   role: "ADMIN" },
      { name: "Ravi Shankar",    email: "officer@vojas.gov", role: "OFFICER" },
      { name: "Priya Menon",     email: "analyst@vojas.gov",  role: "ANALYST" },
      { name: "Demo Reviewer",   email: "reviewer@vojas.gov", role: "REVIEWER" },
    ];
    const users: Record<string, string> = {};
    for (const u of DEMO_USERS) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        users[u.role] = existing.id;
        if (existing.role !== u.role) {
          await prisma.user.update({ where: { id: existing.id }, data: { role: u.role as any, name: u.name } });
        }
      } else {
        const hashed = await bcrypt.hash(DEMO_PASSWORD, config.bcrypt.rounds);
        const user = await prisma.user.create({ data: { email: u.email, password: hashed, name: u.name, role: u.role as any } });
        users[u.role] = user.id;
      }
    }
    const counts: Record<string, number> = { users: await prisma.user.count() };
    if (await prisma.project.count() === 0) {
      const projects = [
        { name: "Rural Road — Vellanad GP", sector: "TRANSPORT", district: "Thiruvananthapuram", state: "Kerala", approvedAmount: 4800000, spentAmount: 2250000, status: "IN_PROGRESS", latitude: 8.5241, longitude: 76.9366, description: "2.5km BT road connecting Vellanad to NH-66", contractor: "Highway Tech Constructions" },
        { name: "Anganwadi Renovation — Ward 7", sector: "EDUCATION", district: "Bangalore Rural", state: "Karnataka", approvedAmount: 1500000, spentAmount: 1472500, status: "COMPLETED", latitude: 13.2516, longitude: 77.7081, description: "Renovation of 3 anganwadi centres", contractor: "Shree Vinayaka Infrastructure" },
        { name: "Community Water Tank — Block B", sector: "WATER_SANITATION", district: "Varanasi", state: "Uttar Pradesh", approvedAmount: 3200000, spentAmount: 3180000, status: "VERIFIED", latitude: 25.3176, longitude: 82.9739, description: "50,000L overhead water tank for 120 households", contractor: "AquaBuild Engineering" },
        { name: "Solar Street Lighting — Main Market Road", sector: "ENERGY", district: "Nagpur", state: "Maharashtra", approvedAmount: 2250000, spentAmount: 0, status: "APPROVED", latitude: 21.1458, longitude: 79.0882, description: "45 solar LED street lights on 3km road", contractor: null },
        { name: "PHC Equipment Upgrade", sector: "HEALTH", district: "Koraput", state: "Odisha", approvedAmount: 2800000, spentAmount: 1400000, status: "IN_PROGRESS", latitude: 18.8120, longitude: 82.7100, description: "Medical equipment for Primary Health Centre", contractor: "MedEquip Solutions" },
        { name: "Village Pond Desilting", sector: "AGRICULTURE", district: "Yavatmal", state: "Maharashtra", approvedAmount: 850000, spentAmount: 810000, status: "COMPLETED", latitude: 20.3888, longitude: 78.1304, description: "Desilting of Chandrapur village pond", contractor: "Rural Water Works" },
        { name: "Flood Relief Drainage — Ward 12", sector: "PUBLIC_INFRASTRUCTURE", district: "Patna", state: "Bihar", approvedAmount: 6500000, spentAmount: 1800000, status: "IN_PROGRESS", latitude: 25.5941, longitude: 85.1376, description: "600m underground drainage in Ward 12", contractor: "Bihar Infrastructure Ltd" },
        { name: "Solid Waste Management Centre", sector: "ENVIRONMENT", district: "Coimbatore", state: "Tamil Nadu", approvedAmount: 1800000, spentAmount: 0, status: "PROPOSED", latitude: 11.0168, longitude: 76.9558, description: "Community solid waste segregation and composting", contractor: null },
      ];
      for (const p of projects) {
        await prisma.project.create({ data: { ...p, createdById: users["OFFICER"] ?? null } as any });
      }
      counts.projects = projects.length;
    } else {
      counts.projects = await prisma.project.count();
    }
    if (await prisma.report.count() === 0) {
      const reports = [
        { title: "Road deteriorating within 3 months", description: "Potholes and cracks appeared just 3 months after road completion near Vellanad junction.", category: "QUALITY", severity: "HIGH", status: "UNDER_REVIEW", reporterName: "Rajesh Kumar", reporterEmail: "rajesh.kumar@email.com", isAnonymous: false, locationDesc: "Vellanad Junction, Thiruvananthapuram, Kerala" },
        { title: "Project delayed by 14 months", description: "Anganwadi renovation in Ward 7 is 14 months overdue with no explanation.", category: "DELAY", severity: "MEDIUM", status: "ACKNOWLEDGED", reporterName: "Lakshmi Devi", reporterEmail: "lakshmi.devi@email.com", isAnonymous: false, locationDesc: "Ward 7, Devanahalli, Bangalore Rural" },
        { title: "Substandard cement bags", description: "Contractor using non-ISI certified cement, stored in open without moisture protection.", category: "QUALITY", severity: "CRITICAL", status: "SUBMITTED", reporterName: "Anonymous", reporterEmail: null, isAnonymous: true, locationDesc: "Ward 12, Bankipur, Patna, Bihar" },
        { title: "Budget discrepancy — ₹31.8L spent vs ₹20L work", description: "Water tank project shows inflated costs. Work appears worth far less than claimed.", category: "FINANCIAL", severity: "HIGH", status: "UNDER_REVIEW", reporterName: "Vijay Singh", reporterEmail: "vijay.singh@email.com", isAnonymous: false, locationDesc: "Block B, Madhur GP, Varanasi" },
        { title: "Solar panels non-functional for 6 weeks", description: "18 of 45 solar street lights not working. No maintenance team visited.", category: "OTHER", severity: "MEDIUM", status: "ACKNOWLEDGED", reporterName: "Mohammed Ismail", reporterEmail: "mohd.ismail@email.com", isAnonymous: false, locationDesc: "Main Market Road, Ramtek, Nagpur, Maharashtra" },
      ];
      for (const r of reports) {
        await prisma.report.create({ data: { ...r, source: "WEB", assignedToId: users["OFFICER"] ?? null } as any });
      }
      counts.reports = reports.length;
    } else {
      counts.reports = await prisma.report.count();
    }
    if (await prisma.expenditure.count() === 0) {
      const projs = await prisma.project.findMany({ select: { id: true } });
      const expenditures = [
        { projectIndex: 0, amount: 450000, category: "MATERIAL", description: "Granular sub-base material", vendor: "StoneTech Aggregates", status: "PAID" },
        { projectIndex: 0, amount: 600000, category: "MATERIAL", description: "BT mix 280 MT", vendor: "Kerala Bitumen Corp", status: "PAID" },
        { projectIndex: 0, amount: 800000, category: "LABOR", description: "Earthwork & sub-base laying", vendor: "Vellanad Workers Co-op", status: "PAID" },
        { projectIndex: 1, amount: 480000, category: "MATERIAL", description: "Cement, tiles, paint", vendor: "Shree Vinayaka Infrastructure", status: "PAID" },
        { projectIndex: 1, amount: 550000, category: "LABOR", description: "Mason + helper wages", vendor: "Shree Vinayaka Infrastructure", status: "PAID" },
        { projectIndex: 2, amount: 1200000, category: "MATERIAL", description: "RCC tank — steel & cement", vendor: "AquaBuild Engineering", status: "PAID" },
        { projectIndex: 2, amount: 950000, category: "LABOR", description: "Skilled + unskilled labour", vendor: "AquaBuild Engineering", status: "PAID" },
        { projectIndex: 3, amount: 120000, category: "CONSULTANCY", description: "Site survey + DPR", vendor: "SunRise Solar Consultants", status: "PAID" },
        { projectIndex: 4, amount: 800000, category: "EQUIPMENT", description: "Oximeters, ICU beds", vendor: "MedEquip Solutions", status: "PAID" },
        { projectIndex: 5, amount: 360000, category: "EQUIPMENT", description: "JCB + desilting pump", vendor: "Rural Water Works", status: "PAID" },
        { projectIndex: 6, amount: 750000, category: "MATERIAL", description: "RCC pipes 600mm", vendor: "Bihar Infrastructure Ltd", status: "PAID" },
        { projectIndex: 6, amount: 600000, category: "LABOR", description: "Trench excavation crew", vendor: "Bihar Infrastructure Ltd", status: "PAID" },
      ];
      for (const e of expenditures) {
        const pid = projs[e.projectIndex]?.id;
        if (pid) await prisma.expenditure.create({ data: { projectId: pid, amount: e.amount, category: e.category, description: e.description, vendor: e.vendor, status: e.status, createdById: users["OFFICER"] ?? null } as any });
      }
      counts.expenditures = expenditures.length;
    } else {
      counts.expenditures = await prisma.expenditure.count();
    }
    counts.anomalies = await prisma.anomaly.count();
    res.json(successResponse({ message: "Seed complete", counts }));
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
