import { PrismaClient } from '@vojas/db';
import {
  createProjectSchema,
  updateProjectSchema,
  projectFiltersSchema,
  addLocationSchema,
  ProjectFilters,
  CreateProjectInput,
  UpdateProjectInput,
  AddLocationInput,
} from '../validation/projectSchemas.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors/index.js';
import { UserRole } from '@vojas/shared';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Models will be added when db schema is expanded; use generic shape
// to keep domain code typed independently of Prisma's generated types.
type ProjectLike = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  sector: string;
  district: string;
  state: string;
  constituency?: string | null;
  approvedAmount: number;
  spentAmount: number;
  contractor?: string | null;
  startDate?: Date | null;
  expectedEndDate?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  sourceWorkId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type Project = ProjectLike;

export class ProjectService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateProjectInput): Promise<Project> {
    const parsed = createProjectSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid project data',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    return this.prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        status: parsed.data.status,
        sector: parsed.data.sector,
        district: parsed.data.district,
        state: parsed.data.state,
        constituency: parsed.data.constituency,
        approvedAmount: parsed.data.approvedAmount,
        spentAmount: parsed.data.spentAmount ?? 0,
        contractor: parsed.data.contractor,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        expectedEndDate: parsed.data.expectedEndDate
          ? new Date(parsed.data.expectedEndDate)
          : null,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        source: parsed.data.source,
        sourceWorkId: parsed.data.sourceWorkId,
        // createdById is required on Project; caller must provide it
        createdById: (parsed.data as any).createdById ?? '00000000-0000-0000-0000-000000000000',
      },
    });
  }

  async getById(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw NotFoundError.notFound('Project', id);
    }
    return project;
  }

  async update(id: string, data: UpdateProjectInput): Promise<Project> {
    const parsed = updateProjectSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid project update data',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw NotFoundError.notFound('Project', id);
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.sector !== undefined && { sector: parsed.data.sector }),
        ...(parsed.data.district !== undefined && { district: parsed.data.district }),
        ...(parsed.data.state !== undefined && { state: parsed.data.state }),
        ...(parsed.data.constituency !== undefined && { constituency: parsed.data.constituency }),
        ...(parsed.data.approvedAmount !== undefined && { approvedAmount: parsed.data.approvedAmount }),
        ...(parsed.data.spentAmount !== undefined && { spentAmount: parsed.data.spentAmount }),
        ...(parsed.data.contractor !== undefined && { contractor: parsed.data.contractor }),
        ...(parsed.data.startDate !== undefined && { startDate: new Date(parsed.data.startDate) }),
        ...(parsed.data.expectedEndDate !== undefined && { expectedEndDate: new Date(parsed.data.expectedEndDate) }),
        ...(parsed.data.latitude !== undefined && { latitude: parsed.data.latitude }),
        ...(parsed.data.longitude !== undefined && { longitude: parsed.data.longitude }),
      },
    });
  }

  async delete(id: string, requestingRole: UserRole): Promise<void> {
    if (requestingRole !== UserRole.ADMIN) {
      throw new ForbiddenError('delete project');
    }
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw NotFoundError.notFound('Project', id);
    }
    await this.prisma.project.delete({ where: { id } });
  }

  async search(filters: Partial<ProjectFilters>): Promise<PaginatedResult<Project>> {
    const parsed = projectFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new ValidationError('Invalid filter parameters', parsed.error.errors);
    }
    const p = parsed.data;

    const where: Record<string, unknown> = {};
    if (p.state) where.state = p.state;
    if (p.district) where.district = p.district;
    if (p.constituency) where.constituency = p.constituency;
    if (p.sector) where.sector = p.sector;
    if (p.status) where.status = p.status;
    if (p.minAmount !== undefined || p.maxAmount !== undefined) {
      where.approvedAmount = {};
      if (p.minAmount !== undefined) (where.approvedAmount as Record<string, number>).gte = p.minAmount;
      if (p.maxAmount !== undefined) (where.approvedAmount as Record<string, number>).lte = p.maxAmount;
    }
    if (p.hasAnomalies !== undefined) {
      where.anomalies = p.hasAnomalies
        ? { some: { status: { not: 'RESOLVED' } } }
        : { none: { status: { not: 'RESOLVED' } } };
    }
    if (p.search) {
      where.OR = [
        { name: { contains: p.search, mode: 'insensitive' } },
        { description: { contains: p.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = p.sortBy
      ? { [p.sortBy]: p.sortOrder as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy,
        skip: (p.page - 1) * p.limit,
        take: p.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      total,
      page: p.page,
      limit: p.limit,
      totalPages: Math.ceil(total / p.limit),
    };
  }

  async getTimeline(projectId: string): Promise<unknown[]> {
    const existing = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw NotFoundError.notFound('Project', projectId);

    return this.prisma.projectEvent.findMany({
      where: { projectId },
      orderBy: { eventDate: 'desc' },
    });
  }

  async getLocations(projectId: string): Promise<unknown[]> {
    const existing = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw NotFoundError.notFound('Project', projectId);

    return this.prisma.projectLocation.findMany({ where: { projectId } });
  }

  async getEvidence(
    projectId: string
  ): Promise<{ documents: unknown[]; observations: unknown[] }> {
    const existing = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw NotFoundError.notFound('Project', projectId);

    const [documents, observations] = await Promise.all([
      this.prisma.document.findMany({ where: { projectId } }),
      this.prisma.satelliteObservation.findMany({ where: { projectId } }),
    ]);
    return { documents, observations };
  }

  async addLocation(projectId: string, data: AddLocationInput): Promise<unknown> {
    const parsed = addLocationSchema.safeParse({ ...data, projectId });
    if (!parsed.success) {
      throw new ValidationError('Invalid location data', parsed.error.errors);
    }
    const existing = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw NotFoundError.notFound('Project', projectId);

    return this.prisma.projectLocation.create({
      data: {
        projectId,
        label: parsed.data.label ?? null,
        address: parsed.data.address ?? null,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isPrimary: parsed.data.isPrimary ?? false,
      },
    });
  }

  /**
   * Find projects within a given radius of a point using PostGIS ST_DWithin.
   */
  async findProjectsNear(
    lat: number,
    lng: number,
    radiusMeters: number
  ): Promise<Project[]> {
    // Use raw SQL with PostGIS ST_DWithin for spatial proximity query
    const results = await this.prisma.$queryRaw<Project[]>`
      SELECT p.*
      FROM "Project" p
      WHERE p.latitude  IS NOT NULL
        AND p.longitude IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(p.longitude, p.latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
    `;
    return results;
  }
}
