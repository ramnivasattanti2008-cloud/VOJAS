import { PrismaClient } from '@vojas/db';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { AnomalySeverity, RiskLevel } from '@vojas/shared';

const SEVERITY_WEIGHTS: Record<AnomalySeverity, number> = {
  [AnomalySeverity.LOW]: 5,
  [AnomalySeverity.MEDIUM]: 10,
  [AnomalySeverity.HIGH]: 20,
  [AnomalySeverity.CRITICAL]: 35,
};

export interface RiskFinding {
  id: string;
  projectId: string;
  overallScore: number;
  riskLevel: RiskLevel;
  factors: Array<{ code: string; label: string; points: number; detail: string }>;
  computedAt: Date;
}

export class RiskService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Calculate a simple risk score for a project.
   * Aggregates: anomaly count (weighted by severity), financial overruns,
   * and progress discrepancies.
   */
  async calculateRisk(projectId: string): Promise<RiskFinding> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const factors: RiskFinding['factors'] = [];
    let overallScore = 0;

    // 1. Risk score: open risk findings × severity weight
    const openAnomalies = await this.prisma.riskFinding.findMany({
      where: { projectId, status: { not: 'RESOLVED' } },
    });
    if (openAnomalies.length > 0) {
      let anomalyPoints = 0;
      for (const a of openAnomalies as Array<{ severity: string; code?: string; description: string }>) {
        const w = SEVERITY_WEIGHTS[a.severity as AnomalySeverity] ?? 5;
        anomalyPoints += w;
      }
      const capped = Math.min(anomalyPoints, 40);
      overallScore += capped;
      factors.push({
        code: 'ANOMALY_AGGREGATE',
        label: `${openAnomalies.length} open anomaly(ies)`,
        points: capped,
        detail: `Anomalies weighted by severity: ${(openAnomalies as Array<{ severity: string; code?: string; description: string }>)
          .map((a) => `${a.severity}:${a.code ?? a.description}`)
          .join(', ')}`,
      });
    }

    // 2. Financial overrun: spent > approved
    if (project.approvedAmount > 0 && project.spentAmount > project.approvedAmount) {
      const overrunPct =
        ((project.spentAmount - project.approvedAmount) / project.approvedAmount) * 100;
      const points = Math.min(25, Math.round(overrunPct));
      overallScore += points;
      factors.push({
        code: 'BUDGET_OVERRUN',
        label: 'Budget overrun detected',
        points,
        detail: `Spent ₹${project.spentAmount} vs approved ₹${project.approvedAmount} (${overrunPct.toFixed(1)}% over)`,
      });
    }

    // 3. Progress discrepancies (POTENTIAL_DISCREPANCY outcomes)
    const discrepancies = await this.prisma.progressObservation.findMany({
      where: { projectId, verificationResult: 'POTENTIAL_DISCREPANCY' },
    });
    if (discrepancies.length > 0) {
      const points = Math.min(15, discrepancies.length * 5);
      overallScore += points;
      factors.push({
        code: 'PROGRESS_DISCREPANCY',
        label: 'Progress vs satellite discrepancies',
        points,
        detail: `${discrepancies.length} discrepancy(ies) detected between reported and observed progress.`,
      });
    }

    // Determine risk level
    let riskLevel: RiskLevel = RiskLevel.LOW;
    if (overallScore > 75) riskLevel = RiskLevel.CRITICAL;
    else if (overallScore > 50) riskLevel = RiskLevel.HIGH;
    else if (overallScore > 25) riskLevel = RiskLevel.MEDIUM;

    const finding: RiskFinding = {
      id: projectId,
      projectId,
      overallScore,
      riskLevel,
      factors,
      computedAt: new Date(),
    };

    // Persist latest finding on the most recent RiskFinding (or use a separate aggregate table — for M1 we just return)
    return finding;
  }

  async getFindings(projectId: string): Promise<RiskFinding[]> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw NotFoundError.notFound('Project', projectId);

    const projectRisk = await this.prisma.riskFinding.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (projectRisk.length === 0) return [];

    return projectRisk.map((r) => ({
      id: r.id,
      projectId,
      overallScore: r.severity === 'CRITICAL' ? 90 : r.severity === 'HIGH' ? 70 : r.severity === 'MEDIUM' ? 40 : 15,
      riskLevel: r.severity as unknown as RiskLevel,
      factors: [],
      computedAt: r.createdAt,
    }));
  }

  async acknowledgeFinding(id: string, userId: string): Promise<unknown> {
    if (!userId) throw new ValidationError('userId is required');
    const finding = await this.prisma.riskFinding.findUnique({ where: { id } });
    if (!finding) throw NotFoundError.notFound('RiskFinding', id);
    await this.prisma.riskFinding.update({
      where: { id },
      data: {
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
        status: 'ACKNOWLEDGED',
      },
    });
    return { id, acknowledgedBy: userId, acknowledgedAt: new Date() };
  }

  async resolveFinding(id: string, userId: string, resolution: string): Promise<unknown> {
    if (!userId) throw new ValidationError('userId is required');
    if (!resolution || resolution.trim().length === 0) {
      throw new ValidationError('Resolution text is required');
    }
    const finding = await this.prisma.riskFinding.findUnique({ where: { id } });
    if (!finding) throw NotFoundError.notFound('RiskFinding', id);
    await this.prisma.riskFinding.update({
      where: { id },
      data: {
        resolvedById: userId,
        resolvedAt: new Date(),
        resolution,
        status: 'RESOLVED',
      },
    });
    return { id, resolvedBy: userId, resolvedAt: new Date(), resolution };
  }

  async escalateToLawEnforcement(
    id: string,
    authority: string,
    userId: string
  ): Promise<unknown> {
    if (!userId) throw new ValidationError('userId is required');
    if (!authority) throw new ValidationError('Authority is required');
    const finding = await this.prisma.riskFinding.findUnique({ where: { id } });
    if (!finding) throw NotFoundError.notFound('RiskFinding', id);
    await this.prisma.riskFinding.update({
      where: { id },
      data: {
        lawEscalation: true,
        lawAuthority: authority,
        status: 'ESCALATED',
      },
    });
    return { id, authority, escalatedBy: userId, escalatedAt: new Date() };
  }
}
