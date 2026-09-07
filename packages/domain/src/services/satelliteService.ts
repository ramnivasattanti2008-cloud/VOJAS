import { PrismaClient } from '@vojas/db';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { satelliteFiltersSchema } from '../validation/satelliteSchemas.js';

export class SatelliteService {
  constructor(private readonly prisma: PrismaClient) {}

  async findObservations(
    filters: Parameters<typeof satelliteFiltersSchema.parse>[0]
  ): Promise<unknown[]> {
    const parsed = satelliteFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid satellite filters',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    const p = parsed.data;
    const where: Record<string, unknown> = {
      projectId: p.projectId,
    };
    if (p.startDate) where.observationDate = { gte: new Date(p.startDate) };
    if (p.endDate) {
      where.observationDate = {
        ...(where.observationDate as object | undefined),
        lte: new Date(p.endDate),
      };
    }
    if (p.maxCloudCover !== undefined) where.cloudCover = { lte: p.maxCloudCover };
    if (p.quality) where.quality = p.quality;

    return this.prisma.satelliteObservation.findMany({
      where,
      orderBy: { observationDate: 'desc' },
    });
  }

  async getObservationMetadata(id: string): Promise<unknown> {
    const obs = await this.prisma.satelliteObservation.findUnique({ where: { id } });
    if (!obs) throw NotFoundError.notFound('SatelliteObservation', id);
    return obs;
  }

  /**
   * Select the best observation for a project closest to a target date.
   * Picks the lowest cloud cover observation within ±14 days of target.
   */
  async selectBestObservation(
    projectId: string,
    targetDate: Date
  ): Promise<unknown | null> {
    const lower = new Date(targetDate);
    lower.setDate(lower.getDate() - 14);
    const upper = new Date(targetDate);
    upper.setDate(upper.getDate() + 14);

    const observations = await this.prisma.satelliteObservation.findMany({
      where: {
        projectId,
        observationDate: { gte: lower, lte: upper },
      },
      orderBy: [{ cloudCover: 'asc' }, { observationDate: 'asc' }],
      take: 1,
    });

    return observations[0] ?? null;
  }

  async getAnalysisResults(projectId: string): Promise<unknown[]> {
    return this.prisma.analysisResult.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProgressObservations(projectId: string): Promise<unknown[]> {
    return this.prisma.progressObservation.findMany({
      where: { projectId },
      orderBy: { reportDate: 'desc' },
    });
  }
}
