import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export interface CreateLocationInput {
  projectId: string;
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
  landmark?: string;
  isPrimary?: boolean;
}

export interface UpdateLocationInput {
  latitude?: number;
  longitude?: number;
  label?: string;
  address?: string;
  landmark?: string;
  isPrimary?: boolean;
}

export interface LocationFilters {
  projectId?: string;
  verified?: boolean;
  primary?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

// India bounding box — reject obvious garbage coordinates
const INDIA_BOUNDS = {
  minLat: 6.5,
  maxLat: 37.5,
  minLng: 68.0,
  maxLng: 97.5,
};

function validateCoordinates(lat: number, lng: number): void {
  if (typeof lat !== "number" || isNaN(lat) || lat < -90 || lat > 90) {
    throw new AppError(400, "VALIDATION_ERROR", `Invalid latitude: ${lat}. Must be between -90 and 90.`);
  }
  if (typeof lng !== "number" || isNaN(lng) || lng < -180 || lng > 180) {
    throw new AppError(400, "VALIDATION_ERROR", `Invalid longitude: ${lng}. Must be between -180 and 180.`);
  }
  if (lat < INDIA_BOUNDS.minLat || lat > INDIA_BOUNDS.maxLat ||
      lng < INDIA_BOUNDS.minLng || lng > INDIA_BOUNDS.maxLng) {
    // Soft warning — not a hard error. MPLAD projects are always in India,
    // but we won't reject since this could trip up border-adjacent districts.
    // (Kept here as documentation of expected range.)
  }
}

export const locationService = {
  /**
   * Create a new location for a project. If isPrimary is true,
   * demote any existing primary location for the project.
   */
  async create(input: CreateLocationInput): Promise<any> {
    validateCoordinates(input.latitude, input.longitude);

    // Ensure project exists
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${input.projectId}' not found`);
    }

    // If this is being marked primary, unset others
    if (input.isPrimary) {
      await prisma.location.updateMany({
        where: { projectId: input.projectId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const location = await prisma.location.create({
      data: {
        projectId: input.projectId,
        latitude: input.latitude,
        longitude: input.longitude,
        label: input.label?.trim() ?? null,
        address: input.address?.trim() ?? null,
        landmark: input.landmark?.trim() ?? null,
        isPrimary: input.isPrimary ?? false,
      },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true },
        },
      },
    });

    return location;
  },

  /**
   * List locations with optional filters.
   * Used by the map view to render all project markers.
   */
  async findAll(filters: LocationFilters): Promise<PaginatedResult<any>> {
    const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.verified !== undefined) where.verified = filters.verified;
    if (filters.primary !== undefined) where.isPrimary = filters.primary;

    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        include: {
          project: {
            select: { id: true, name: true, district: true, state: true, status: true, sector: true },
          },
        },
      }),
      prisma.location.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findById(id: string): Promise<any> {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true },
        },
      },
    });

    if (!location) {
      throw new AppError(404, "NOT_FOUND", `Location with id '${id}' not found`);
    }

    return location;
  },

  /**
   * Get all locations for a specific project.
   * Convenience used by the project detail page's map tab.
   */
  async findByProject(projectId: string): Promise<any[]> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${projectId}' not found`);
    }

    return prisma.location.findMany({
      where: { projectId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
  },

  async update(id: string, input: UpdateLocationInput): Promise<any> {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Location with id '${id}' not found`);
    }

    if (input.latitude !== undefined || input.longitude !== undefined) {
      validateCoordinates(
        input.latitude ?? existing.latitude,
        input.longitude ?? existing.longitude,
      );
    }

    const updateData: any = {};
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.label !== undefined) updateData.label = input.label?.trim() ?? null;
    if (input.address !== undefined) updateData.address = input.address?.trim() ?? null;
    if (input.landmark !== undefined) updateData.landmark = input.landmark?.trim() ?? null;

    if (input.isPrimary === true) {
      // Demote others first
      await prisma.location.updateMany({
        where: { projectId: existing.projectId, isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
      updateData.isPrimary = true;
    } else if (input.isPrimary === false) {
      updateData.isPrimary = false;
    }

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, district: true, state: true, status: true },
        },
      },
    });

    return location;
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Location with id '${id}' not found`);
    }

    await prisma.location.delete({ where: { id } });
  },

  /**
   * Mark a location as verified by an authorized user (REVIEWER / ADMIN).
   */
  async verify(id: string, verifiedById: string): Promise<any> {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Location with id '${id}' not found`);
    }

    return prisma.location.update({
      where: { id },
      data: {
        verified: true,
        verifiedById,
        verifiedAt: new Date(),
      },
    });
  },

  /**
   * Get map-friendly summary for the entire country/state view.
   * Returns lat/lng + project id/name so the map can render markers efficiently.
   */
  async getMapData(filters?: { state?: string; status?: string }): Promise<{
    total: number;
    stateCounts: Record<string, number>;
    markers: Array<{
      id: string;
      latitude: number;
      longitude: number;
      label: string | null;
      isPrimary: boolean;
      verified: boolean;
      project: { id: string; name: string; status: string; district: string; state: string; sector: string };
    }>;
  }> {
    const where: any = { isPrimary: true }; // one marker per project on the overview map
    if (filters?.state) {
      where.project = { state: { contains: filters.state, mode: "insensitive" } };
    }
    if (filters?.status) {
      where.project = { ...where.project, status: filters.status as any };
    }

    const items = await prisma.location.findMany({
      where,
      include: {
        project: {
          select: {
            id: true, name: true, status: true, district: true, state: true, sector: true,
            approvedAmount: true, startDate: true, expectedEndDate: true,
          },
        },
      },
    });

    // Aggregate project counts per state (independent of state filter)
    const stateWhere: any = {};
    if (filters?.status) {
      stateWhere.project = { status: filters.status as any };
    }
    const allForStateCount = await prisma.location.findMany({
      where: { isPrimary: true, ...stateWhere },
      select: { project: { select: { state: true } } },
    });
    const stateCounts: Record<string, number> = {};
    for (const { project } of allForStateCount) {
      if (project.state) {
        stateCounts[project.state] = (stateCounts[project.state] ?? 0) + 1;
      }
    }

    return {
      total: items.length,
      stateCounts,
      markers: items.map((l) => ({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        label: l.label,
        isPrimary: l.isPrimary,
        verified: l.verified,
        project: l.project,
      })),
    };
  },
};
