import { PrismaClient } from '@vojas/db';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { recordExpenditureSchema, RecordExpenditureInput } from '../validation/financialSchemas.js';

export class FinancialService {
  constructor(private readonly prisma: PrismaClient) {}

  async getObservations(
    projectId: string,
    filters?: { startDate?: Date; endDate?: Date; category?: string }
  ): Promise<unknown[]> {
    const existing = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw NotFoundError.notFound('Project', projectId);

    const where: Record<string, unknown> = { projectId };
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) (where.date as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.date as Record<string, Date>).lte = filters.endDate;
    }
    if (filters?.category) where.category = filters.category;

    return this.prisma.financialObservation.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getProjectSummary(projectId: string): Promise<{
    totalSanctioned: number;
    totalSpent: number;
    utilization: number;
    balance: number;
  }> {
    const project: { approvedAmount: number; spentAmount: number } | null =
      await this.prisma.project.findUnique({
        where: { id: projectId },
      });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const aggregation = await this.prisma.financialObservation.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    const totalSpent = aggregation._sum.amount ?? project.spentAmount;
    const totalSanctioned = project.approvedAmount;
    const balance = totalSanctioned - totalSpent;
    const utilization = totalSanctioned > 0 ? (totalSpent / totalSanctioned) * 100 : 0;

    return {
      totalSanctioned,
      totalSpent,
      utilization,
      balance,
    };
  }

  async getSchemeSummary(): Promise<{
    totalProjects: number;
    totalSanctioned: number;
    totalSpent: number;
    avgUtilization: number;
  }> {
    const [projectCount, sanctionAgg, spendAgg] = await this.prisma.$transaction([
      this.prisma.project.count(),
      this.prisma.project.aggregate({ _sum: { approvedAmount: true } }),
      this.prisma.financialObservation.aggregate({ _sum: { amount: true } }),
    ]);

    const totalSanctioned = sanctionAgg._sum.approvedAmount ?? 0;
    const totalSpent = spendAgg._sum.amount ?? 0;
    const avgUtilization =
      totalSanctioned > 0 ? (totalSpent / totalSanctioned) * 100 : 0;

    return {
      totalProjects: projectCount,
      totalSanctioned,
      totalSpent,
      avgUtilization,
    };
  }

  /**
   * Append-only record of expenditure.  Never overwrites.
   */
  async recordExpenditure(
    projectId: string,
    data: RecordExpenditureInput
  ): Promise<unknown> {
    const parsed = recordExpenditureSchema.safeParse({ ...data, projectId });
    if (!parsed.success) {
      throw new ValidationError(
        'Invalid expenditure data',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const existing = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw NotFoundError.notFound('Project', projectId);

    const created = await this.prisma.financialObservation.create({
      data: {
        projectId,
        amount: parsed.data.amount,
        type: parsed.data.type,
        category: parsed.data.category,
        description: parsed.data.description,
        vendor: parsed.data.vendor,
        invoiceNo: parsed.data.invoiceNo,
        paidOn: parsed.data.paidOn ? new Date(parsed.data.paidOn) : null,
        date: new Date(parsed.data.date),
        notes: parsed.data.notes,
        source: parsed.data.source,
        sourceTxnId: parsed.data.sourceTxnId,
      },
    });

    return created;
  }
}
