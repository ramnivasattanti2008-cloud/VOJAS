/**
 * M16: Benchmark Service
 */

import { PrismaClient } from '@vojas/db';
import { percentile, benchmarkPercentile } from './analyticsEngine.js';

export type MetricType = 'RISK_SCORE' | 'FINANCIAL_UTILIZATION' | 'DELAY_DAYS' | 'EXPENDITURE_VELOCITY' | 'PROGRESS_VELOCITY';

export interface BenchmarkDistribution {
  metricType: MetricType;
  min: number; p10: number; p25: number; median: number; p75: number; p90: number; max: number; mean: number;
  stdDev: number | null; count: number;
}

export interface ProjectBenchmark {
  projectId: string; projectName: string; metricValue: number; percentile: number;
  band: 'BELOW_PEER' | 'WITHIN_PEER' | 'ABOVE_PEER';
  distribution: BenchmarkDistribution; confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'; comparison: string;
}

export class BenchmarkService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateBenchmarkDistribution(peerCriteria: Record<string, unknown>, metricType: MetricType): Promise<BenchmarkDistribution | null> {
    const projects = await this.prisma.project.findMany({ where: this.criteriaToWhere(peerCriteria), include: { projectRisk: true } });
    if (projects.length < 3) return null;
    const values: number[] = [];
    for (const p of projects) {
      const v = this.extractMetric(p, metricType);
      if (v !== null) values.push(v);
    }
    if (values.length < 3) return null;
    return {
      metricType, min: percentile(values, 0), p10: percentile(values, 10), p25: percentile(values, 25),
      median: percentile(values, 50), p75: percentile(values, 75), p90: percentile(values, 90),
      max: percentile(values, 100), mean: values.reduce((s, v) => s + v, 0) / values.length,
      stdDev: this.stdDev(values), count: values.length
    };
  }

  async benchmarkProject(projectId: string, metricType: MetricType): Promise<ProjectBenchmark | null> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { projectRisk: true } });
    if (!project) return null;
    const peerCriteria: Record<string, unknown> = { sector: project.sector };
    if (project.state) peerCriteria.state = project.state;
    if (project.approvedAmount > 0) {
      peerCriteria.minAmount = project.approvedAmount * 0.5;
      peerCriteria.maxAmount = project.approvedAmount * 2;
    }
    const dist = await this.calculateBenchmarkDistribution(peerCriteria, metricType);
    if (!dist) return null;
    const value = this.extractMetric(project, metricType);
    if (value === null) return null;
    const sorted = await this.getSortedValues(peerCriteria, metricType);
    const pct = benchmarkPercentile(value, sorted);
    const band: ProjectBenchmark['band'] = pct < 25 ? 'BELOW_PEER' : pct > 75 ? 'ABOVE_PEER' : 'WITHIN_PEER';
    return { projectId: project.id, projectName: project.name, metricValue: value, percentile: Math.round(pct), band, distribution: dist, confidence: dist.count >= 20 ? 'HIGH' : dist.count >= 10 ? 'MEDIUM' : 'LOW', comparison: this.compare(value, dist, band) };
  }

  async benchmarkAllProjects(peerCriteria: Record<string, unknown>, metricType: MetricType): Promise<ProjectBenchmark[]> {
    const dist = await this.calculateBenchmarkDistribution(peerCriteria, metricType);
    if (!dist) return [];
    const projects = await this.prisma.project.findMany({ where: this.criteriaToWhere(peerCriteria) });
    const results: ProjectBenchmark[] = [];
    for (const p of projects) {
      const value = this.extractMetric(p, metricType);
      if (value === null) continue;
      const sorted = await this.getSortedValues(peerCriteria, metricType);
      const pct = benchmarkPercentile(value, sorted);
      const band: ProjectBenchmark['band'] = pct < 25 ? 'BELOW_PEER' : pct > 75 ? 'ABOVE_PEER' : 'WITHIN_PEER';
      results.push({ projectId: p.id, projectName: p.name, metricValue: value, percentile: Math.round(pct), band, distribution: dist, confidence: dist.count >= 20 ? 'HIGH' : dist.count >= 10 ? 'MEDIUM' : 'LOW', comparison: this.compare(value, dist, band) });
    }
    return results.sort((a, b) => b.percentile - a.percentile);
  }

  private extractMetric(project: any, metricType: MetricType): number | null {
    switch (metricType) {
      case 'RISK_SCORE': return project.projectRisk?.riskScore ?? null;
      case 'FINANCIAL_UTILIZATION': return project.approvedAmount > 0 ? Math.round((project.spentAmount / project.approvedAmount) * 100) : null;
      case 'DELAY_DAYS': {
        if (!project.expectedEndDate || project.status !== 'IN_PROGRESS') return null;
        return Math.max(0, Math.floor((new Date().getTime() - project.expectedEndDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
      default: return null;
    }
  }

  private async getSortedValues(criteria: Record<string, unknown>, metricType: MetricType): Promise<number[]> {
    const projects = await this.prisma.project.findMany({ where: this.criteriaToWhere(criteria), include: { projectRisk: true } });
    const values: number[] = [];
    for (const p of projects) { const v = this.extractMetric(p, metricType); if (v !== null) values.push(v); }
    return [...values].sort((a, b) => a - b);
  }

  private criteriaToWhere(criteria: Record<string, unknown>): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (criteria.sector) where.sector = criteria.sector;
    if (criteria.state) where.state = criteria.state;
    if (criteria.districtId) where.districtId = criteria.districtId;
    if (criteria.minAmount !== undefined || criteria.maxAmount !== undefined) {
      where.approvedAmount = {};
      if (criteria.minAmount !== undefined) (where.approvedAmount as Record<string, number>).gte = criteria.minAmount as number;
      if (criteria.maxAmount !== undefined) (where.approvedAmount as Record<string, number>).lte = criteria.maxAmount as number;
    }
    return where;
  }

  private stdDev(values: number[]): number | null {
    if (values.length < 2) return null;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private compare(value: number, dist: BenchmarkDistribution, band: ProjectBenchmark['band']): string {
    const diff = value - dist.median;
    const pctDiff = dist.median !== 0 ? Math.round((diff / dist.median) * 100) : 0;
    if (band === 'BELOW_PEER') return value + ' (' + Math.abs(pctDiff) + '% below peer median of ' + Math.round(dist.median) + ')';
    if (band === 'ABOVE_PEER') return value + ' (' + pctDiff + '% above peer median of ' + Math.round(dist.median) + ')';
    return value + ' (within peer range of ' + Math.round(dist.p25) + '-' + Math.round(dist.p75) + ')';
  }
}
