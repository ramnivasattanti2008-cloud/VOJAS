/**
 * Vendor service.
 * CRUD + analytics for the new Vendor model.
 */
import { prisma } from "../config/database.js";

export interface VendorFilters {
  state?: string;
  search?: string;
  minPaid?: number;
  page?: number;
  limit?: number;
  sortBy?: "totalPaid" | "projectCount" | "constituencyCount" | "name";
  sortDir?: "asc" | "desc";
}

export interface VendorPaginatedResult {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function findAll(filters: VendorFilters = {}): Promise<VendorPaginatedResult> {
  const {
    state, search, minPaid,
    page = 1, limit = 20,
    sortBy = "totalPaid", sortDir = "desc",
  } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (state) where.state = state.toUpperCase();
  if (minPaid) where.totalPaid = { gte: minPaid };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { nameNormalized: { contains: search } },
    ];
  }

  const orderBy: any = { [sortBy]: sortDir };

  const [items, total] = await Promise.all([
    prisma.vendor.findMany({ where, skip, take: limit, orderBy }),
    prisma.vendor.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findById(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      expenditures: {
        take: 50,
        orderBy: { paidOn: "desc" },
        select: {
          id: true, amount: true, paidOn: true, status: true,
          paymentStatus: true, description: true,
          project: {
            select: { id: true, name: true, district: true, state: true, constituency: true },
          },
        },
      },
    },
  });
}

export async function getStats(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      expenditures: {
        select: {
          amount: true,
          paymentStatus: true,
          project: { select: { id: true, state: true, district: true, constituency: true, mpName: true, mpId: true } },
        },
      },
    },
  });

  if (!vendor) return null;

  const totalPaid = vendor.expenditures.reduce((s, e) => s + e.amount, 0);
  const successPayments = vendor.expenditures.filter(
    (e) => e.paymentStatus?.toLowerCase().includes("success")
  ).length;
  const failedPayments = vendor.expenditures.filter(
    (e) => e.paymentStatus?.toLowerCase().includes("fail")
  ).length;
  const uniqueProjects = new Set(vendor.expenditures.map((e) => e.project?.id)).size;
  const uniqueMPs = new Set(
    vendor.expenditures.map((e) => e.project?.mpId).filter(Boolean)
  ).size;
  const uniqueConstituencies = new Set(
    vendor.expenditures.map((e) => e.project?.constituency).filter(Boolean)
  ).size;
  const uniqueDistricts = new Set(
    vendor.expenditures.map((e) => e.project?.district).filter(Boolean)
  ).size;
  const byState = vendor.expenditures.reduce((acc, e) => {
    const s = e.project?.state || "Unknown";
    acc[s] = (acc[s] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalPaid,
    totalExpenditures: vendor.expenditures.length,
    successPayments,
    failedPayments,
    uniqueProjects,
    uniqueMPs,
    uniqueConstituencies,
    uniqueDistricts,
    crossConstituencyRisk: uniqueConstituencies > 3,
    crossStateRisk: Object.keys(byState).length > 3,
    byState,
  };
}

export async function getTopVendors(limit = 20) {
  return prisma.vendor.findMany({
    take: limit,
    orderBy: { totalPaid: "desc" },
    select: {
      id: true, name: true, nameNormalized: true,
      state: true, district: true,
      totalPaid: true, projectCount: true, constituencyCount: true,
    },
  });
}

export async function remove(id: string) {
  return prisma.vendor.delete({ where: { id } });
}
