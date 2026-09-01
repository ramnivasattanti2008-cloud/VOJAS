/**
 * Contractor Service — Phase 27-35: Contractor Portal
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

// ─── Contractor Profile ───────────────────────────────────────────────────────

export const contractorService = {
  async getOrCreateProfile(userId: string) {
    let profile = await prisma.contractorProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.contractorProfile.create({ data: { userId } });
    }
    return profile;
  },

  async updateProfile(userId: string, data: Partial<{
    companyName: string;
    gstin: string;
    udyamRegNo: string;
    pan: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    district: string;
    state: string;
  }>) {
    return prisma.contractorProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  async getDashboard(contractorId: string) {
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: contractorId },
    });

    if (!profile) {
      return { profile: null, projects: [], milestones: [], defects: [], payments: [], message: "No contractor profile found for this user" };
    }

    const projects = await prisma.contractorProject.findMany({
      where: { contractorId },
    });

    const milestones = await prisma.contractorMilestone.findMany({
      where: { contractorProjectId: { in: projects.map(p => p.id) } },
      include: { documents: true },
      orderBy: { dueDate: "asc" },
    });

    const defects = await prisma.contractorDefect.findMany({
      where: { contractorProjectId: { in: projects.map(p => p.id) }, status: { notIn: ["CLOSED"] } },
      orderBy: { createdAt: "desc" },
    });

    const payments = await prisma.contractorPayment.findMany({
      where: { contractorProjectId: { in: projects.map(p => p.id) } },
      orderBy: { submittedAt: "desc" },
      take: 10,
    });

    return { profile, projects, milestones, defects, payments };
  },

  // ─── Milestones ─────────────────────────────────────────────────────────────

  async createMilestone(contractorProjectId: string, data: {
    title: string;
    description?: string;
    dueDate?: Date;
    amount?: number;
  }) {
    return prisma.contractorMilestone.create({
      data: { contractorProjectId, ...data },
    });
  },

  async completeMilestone(id: string, completedDate: Date) {
    return prisma.contractorMilestone.update({
      where: { id },
      data: { completedDate, status: "SUBMITTED" },
    });
  },

  async getMilestoneStatus(id: string) {
    const milestone = await prisma.contractorMilestone.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });
    if (!milestone) throw new AppError(404, "NOT_FOUND", `Milestone '${id}' not found`);
    return milestone;
  },

  // ─── Work Diary ──────────────────────────────────────────────────────────────

  async createWorkDiary(contractorProjectId: string, data: {
    date: Date;
    workCompleted: string;
    siteConditions?: string;
    materials?: string;
    activities?: string;
    progressPhotos?: string;
    issues?: string;
  }) {
    return prisma.contractorWorkDiary.create({
      data: { contractorProjectId, ...data },
    });
  },

  async getWorkDiaries(contractorProjectId: string, page = 1, limit = 30) {
    const [total, items] = await Promise.all([
      prisma.contractorWorkDiary.count({ where: { contractorProjectId } }),
      prisma.contractorWorkDiary.findMany({
        where: { contractorProjectId },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total: Number(total), page, limit };
  },

  // ─── Defects ────────────────────────────────────────────────────────────────

  async createDefect(contractorProjectId: string, data: {
    title: string;
    description: string;
    reportedBy: string;
    severity?: string;
  }) {
    return prisma.contractorDefect.create({
      data: { contractorProjectId, ...data },
    });
  },

  async respondToDefect(id: string, response: string) {
    return prisma.contractorDefect.update({
      where: { id },
      data: {
        contractorResponse: response,
        respondedAt: new Date(),
        status: "UNDER_CORRECTION",
      },
    });
  },

  async closeDefect(id: string) {
    return prisma.contractorDefect.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  },

  // ─── Payments ────────────────────────────────────────────────────────────────

  async submitPayment(contractorProjectId: string, data: {
    milestoneId?: string;
    amount: number;
    invoiceNo?: string;
    invoiceDate?: Date;
    description?: string;
  }) {
    return prisma.contractorPayment.create({
      data: { contractorProjectId, ...data, status: "SUBMITTED_RECEIVED" },
    });
  },

  async getPaymentStatus(id: string) {
    return prisma.contractorPayment.findUnique({ where: { id } });
  },

  // ─── Responses ──────────────────────────────────────────────────────────────

  async submitResponse(contractorId: string, data: {
    anomalyId?: string;
    caseId?: string;
    title: string;
    description: string;
    evidenceUrls?: string;
  }) {
    return prisma.contractorResponse.create({
      data: { contractorId, ...data },
    });
  },

  // ─── Documents ──────────────────────────────────────────────────────────────

  async uploadDocument(contractorId: string, data: {
    milestoneId?: string;
    type: string;
    title: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    notes?: string;
  }) {
    return prisma.contractorDocument.create({
      data: { contractorId, ...data },
    });
  },

  async getMyDocuments(contractorId: string) {
    return prisma.contractorDocument.findMany({
      where: { contractorId },
      include: { milestone: { select: { title: true, status: true } } },
      orderBy: { uploadedAt: "desc" },
    });
  },
};
