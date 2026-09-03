import { PrismaClient } from '@vojas/db';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { z } from 'zod';
import { DataSourceStatus } from '@vojas/shared';

const createDataSourceSchema = z.object({
  sourceName: z.string().min(1),
  datasetName: z.string().min(1),
  department: z.string().optional(),
  officialUrl: z.string().url().optional(),
  format: z.string().min(1).default('MANUAL'),
  apiAvailable: z.boolean().default(false),
  downloadAvailable: z.boolean().default(false),
  status: z.nativeEnum(DataSourceStatus).default(DataSourceStatus.ACTIVE),
  notes: z.string().optional(),
  transformationNotes: z.string().optional(),
});

export class DataSourceService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<unknown[]> {
    return this.prisma.dataSource.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async getById(id: string): Promise<unknown> {
    const source = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!source) throw NotFoundError.notFound('DataSource', id);
    return source;
  }

  async create(data: z.infer<typeof createDataSourceSchema>): Promise<unknown> {
    const parsed = createDataSourceSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError('Invalid data source data', parsed.error.errors);
    }
    return this.prisma.dataSource.create({ data: parsed.data });
  }

  async update(
    id: string,
    data: Partial<z.infer<typeof createDataSourceSchema>>
  ): Promise<unknown> {
    const existing = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!existing) throw NotFoundError.notFound('DataSource', id);
    return this.prisma.dataSource.update({ where: { id }, data });
  }

  async markFetched(id: string): Promise<unknown> {
    const existing = await this.prisma.dataSource.findUnique({ where: { id } });
    if (!existing) throw NotFoundError.notFound('DataSource', id);
    return this.prisma.dataSource.update({
      where: { id },
      data: { lastFetched: new Date() },
    });
  }
}
