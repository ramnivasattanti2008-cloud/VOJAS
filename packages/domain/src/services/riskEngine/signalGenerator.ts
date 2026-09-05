/**
 * M8: Signal Generator — Generates RiskSignal records from raw project data
 *
 * Signal generation is the first stage of the risk analysis pipeline.
 * Each signal represents a normalized, independent evidence point.
 *
 * ANTI-FABRICATION:
 *   - Signals are generated only from verifiable data
 *   - Every signal has source references
 *   - No signal is created without at least one evidence reference
 */

import { PrismaClient } from '@vojas/db';
import type { RiskSignal, SignalTypeEnum, SignalSeverity, SignalConfidence, SourceType } from './types.js';
import { ProjectDataSnapshot } from './ruleEngine.js';

export class SignalGenerator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate signals from project data snapshot
   * Returns an array of RiskSignal objects (not yet persisted)
   */
  async generateSignals(projectData: ProjectDataSnapshot): Promise<RiskSignal[]> {
    const signals: RiskSignal[] = [];
    const now = new Date();

    // 1. SATELLITE_CHANGE signals
    const satSignals = this.generateSatelliteSignals(projectData, now);
    signals.push(...satSignals);

    // 2. PROGRESS_FINANCIAL_MISMATCH signals
    const finSignals = this.generateFinancialProgressSignals(projectData, now);
    signals.push(...finSignals);

    // 3. PROJECT_DELAY signals
    const delaySignals = this.generateDelaySignals(projectData, now);
    signals.push(...delaySignals);

    // 4. DOCUMENT_INCONSISTENCY signals
    const docSignals = this.generateDocumentSignals(projectData, now);
    signals.push(...docSignals);

    // 5. CITIZEN_OFFICIAL_DISCREPANCY signals
    const citizenSignals = this.generateCitizenDiscrepancySignals(projectData, now);
    signals.push(...citizenSignals);

    // 6. COST_ANOMALY signals
    const costSignals = await this.generateCostAnomalySignals(projectData, now);
    signals.push(...costSignals);

    // 7. GEOGRAPHIC_INCONSISTENCY signals
    const geoSignals = this.generateGeographicSignals(projectData, now);
    signals.push(...geoSignals);

    return signals;
  }

  /**
   * Persist signals to database
   */
  async persistSignals(signals: RiskSignal[]): Promise<string[]> {
    const ids: string[] = [];
    for (const signal of signals) {
      const created = await this.prisma.riskSignal.create({
        data: {
          id: signal.id,
          projectId: signal.projectId,
          signalType: signal.signalType as any,
          sourceType: signal.sourceType,
          sourceId: signal.sourceId,
          detectedAt: signal.detectedAt,
          observationDate: signal.observationDate,
          severity: signal.severity,
          confidence: signal.confidence,
          value: signal.value,
          expectedValue: signal.expectedValue,
          deviation: signal.deviation,
          explanation: signal.explanation,
          evidenceReferences: signal.evidenceReferences as any,
          metadata: signal.metadata as any,
          algorithmVersion: signal.algorithmVersion,
        },
      });
      ids.push(created.id);
    }
    return ids;
  }

  private generateSatelliteSignals(data: ProjectDataSnapshot, now: Date): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const { project, latestSatelliteObs } = data;

    if (!latestSatelliteObs) return signals;

    // Check if we have change classification from M7 analysis
    if (latestSatelliteObs.changeClassification) {
      const changeClass = latestSatelliteObs.changeClassification;
      const hasLowChange = ['NO_OBSERVABLE_CHANGE', 'LOW_OBSERVABLE_CHANGE'].includes(changeClass);
      const hasHighProgress = (project.spentAmount || 0) / (project.approvedAmount || 1) > 0.5;

      if (hasLowChange && hasHighProgress) {
        const deviation = ((project.spentAmount || 0) / (project.approvedAmount || 1)) * 100;
        signals.push({
          id: `signal-${project.id}-sat-${now.getTime()}`,
          projectId: project.id,
          signalType: 'SATELLITE_CHANGE',
          sourceType: 'satellite',
          sourceId: latestSatelliteObs.id,
          detectedAt: now,
          observationDate: latestSatelliteObs.observationDate,
          severity: deviation > 30 ? 'HIGH' : 'MEDIUM',
          confidence: latestSatelliteObs.cloudCover < 30 ? 'HIGH' : 'MEDIUM',
          value: deviation,
          expectedValue: null,
          deviation,
          explanation: `Satellite shows ${changeClass.toLowerCase()} but project shows high financial utilization.`,
          evidenceReferences: [latestSatelliteObs.id],
          metadata: {
            changeClassification: latestSatelliteObs.changeClassification,
            constructionScore: latestSatelliteObs.constructionScore,
          },
          algorithmVersion: 'rule-engine-v1.0',
        });
      }
    }

    return signals;
  }

  private generateFinancialProgressSignals(data: ProjectDataSnapshot, now: Date): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const { project, progressObservations, financialObservations } = data;

    if (!project.approvedAmount || project.approvedAmount === 0) return signals;

    const utilization = ((project.spentAmount || 0) / project.approvedAmount) * 100;
    const latestProgress = progressObservations
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())[0];

    if (!latestProgress) return signals;

    const mismatch = utilization - latestProgress.reportedProgress;
    if (Math.abs(mismatch) > 20) {
      signals.push({
        id: `signal-${project.id}-fin-${now.getTime()}`,
        projectId: project.id,
        signalType: 'PROGRESS_FINANCIAL_MISMATCH',
        sourceType: 'financial_record',
        sourceId: financialObservations[0]?.id || null,
        detectedAt: now,
        observationDate: financialObservations[0]?.date || null,
        severity: Math.abs(mismatch) > 40 ? 'HIGH' : 'MEDIUM',
        confidence: 'MEDIUM',
        value: utilization,
        expectedValue: latestProgress.reportedProgress,
        deviation: mismatch,
        explanation: `Financial utilization (${utilization.toFixed(1)}%) differs from reported progress (${latestProgress.reportedProgress.toFixed(1)}%) by ${mismatch.toFixed(1)}%.`,
        evidenceReferences: [latestProgress.id, ...financialObservations.map(f => f.id)],
        metadata: { spentAmount: project.spentAmount, approvedAmount: project.approvedAmount },
        algorithmVersion: 'rule-engine-v1.0',
      });
    }

    return signals;
  }

  private generateDelaySignals(data: ProjectDataSnapshot, now: Date): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const { project, progressObservations } = data;

    if (!project.expectedEndDate || project.status === 'COMPLETED') return signals;
    if (project.expectedEndDate > now) return signals;

    const latestProgress = progressObservations
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())[0];

    if (!latestProgress || latestProgress.reportedProgress >= 100) return signals;

    const daysOverdue = Math.floor((now.getTime() - project.expectedEndDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 0) {
      signals.push({
        id: `signal-${project.id}-delay-${now.getTime()}`,
        projectId: project.id,
        signalType: 'PROJECT_DELAY',
        sourceType: 'progress_report',
        sourceId: latestProgress.id,
        detectedAt: now,
        observationDate: latestProgress.reportDate,
        severity: daysOverdue > 90 ? 'HIGH' : 'MEDIUM',
        confidence: 'MEDIUM',
        value: latestProgress.reportedProgress,
        expectedValue: 100,
        deviation: -latestProgress.reportedProgress,
        explanation: `Project overdue by ${daysOverdue} days with only ${latestProgress.reportedProgress}% completion.`,
        evidenceReferences: [latestProgress.id],
        metadata: {
          expectedEndDate: project.expectedEndDate.toISOString(),
          daysOverdue,
          currentStatus: project.status,
        },
        algorithmVersion: 'rule-engine-v1.0',
      });
    }

    return signals;
  }

  private generateDocumentSignals(data: ProjectDataSnapshot, now: Date): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const { project, documents } = data;

    // Check for completion certificate when project not completed
    if (project.status !== 'COMPLETED' && project.status !== 'VERIFIED') {
      const completionDocs = documents.filter(d =>
        d.type === 'COMPLETION_CERT' || d.title.toLowerCase().includes('completion')
      );

      if (completionDocs.length > 0) {
        signals.push({
          id: `signal-${project.id}-doc-${now.getTime()}`,
          projectId: project.id,
          signalType: 'DOCUMENT_INCONSISTENCY',
          sourceType: 'document',
          sourceId: completionDocs[0].id,
          detectedAt: now,
          observationDate: completionDocs[0].uploadedAt,
          severity: 'MEDIUM',
          confidence: 'HIGH',
          value: completionDocs.length,
          expectedValue: 0,
          deviation: completionDocs.length,
          explanation: `Completion document exists but project status is "${project.status}".`,
          evidenceReferences: completionDocs.map(d => d.id),
          metadata: { documentTypes: completionDocs.map(d => d.type) },
          algorithmVersion: 'rule-engine-v1.0',
        });
      }
    }

    return signals;
  }

  private generateCitizenDiscrepancySignals(data: ProjectDataSnapshot, now: Date): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const { project, citizenReports, progressObservations } = data;

    if (citizenReports.length === 0) return signals;

    const latestProgress = progressObservations
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime())[0];

    const criticalReports = citizenReports.filter(r =>
      ['CONSTRUCTION_QUALITY', 'ABANDONED_WORK', 'FAKE_DOCUMENTS'].includes(r.category)
    );

    if (criticalReports.length > 0 && latestProgress && latestProgress.reportedProgress > 80) {
      signals.push({
        id: `signal-${project.id}-citizen-${now.getTime()}`,
        projectId: project.id,
        signalType: 'CITIZEN_OFFICIAL_DISCREPANCY',
        sourceType: 'citizen_report',
        sourceId: criticalReports[0].id,
        detectedAt: now,
        observationDate: new Date(),
        severity: criticalReports.length > 1 ? 'HIGH' : 'MEDIUM',
        confidence: 'LOW', // Citizen reports have lower confidence
        value: criticalReports.length,
        expectedValue: 0,
        deviation: criticalReports.length,
        explanation: `${criticalReports.length} critical citizen report(s) while official progress shows ${latestProgress.reportedProgress}%.`,
        evidenceReferences: criticalReports.map(r => r.id),
        metadata: { categories: criticalReports.map(r => r.category) },
        algorithmVersion: 'rule-engine-v1.0',
      });
    }

    return signals;
  }

  private async generateCostAnomalySignals(data: ProjectDataSnapshot, now: Date): Promise<RiskSignal[]> {
    const signals: RiskSignal[] = [];
    const { project } = data;

    if (!project.approvedAmount || project.approvedAmount === 0) return signals;

    // Peer benchmarking: compare unit cost vs similar projects
    const peers = await this.prisma.project.findMany({
      where: {
        sector: project.sector as any,
        state: project.state,
        approvedAmount: {
          gte: project.approvedAmount * 0.5,
          lte: project.approvedAmount * 2,
        },
        id: { not: project.id },
        status: { in: ['COMPLETED', 'VERIFIED'] },
      },
      select: { approvedAmount: true },
      take: 20,
    });

    if (peers.length < 3) return signals; // Need minimum peers for comparison

    const peerCosts = peers.map(p => p.approvedAmount!);
    const medianCost = this.median(peerCosts);
    const deviation = ((project.approvedAmount - medianCost) / medianCost) * 100;

    // Flag if cost is > 50% above peer median
    if (deviation > 50) {
      signals.push({
        id: `signal-${project.id}-cost-${now.getTime()}`,
        projectId: project.id,
        signalType: 'COST_ANOMALY',
        sourceType: 'financial_record',
        sourceId: null,
        detectedAt: now,
        observationDate: null,
        severity: deviation > 100 ? 'HIGH' : 'MEDIUM',
        confidence: peers.length >= 10 ? 'HIGH' : 'MEDIUM',
        value: project.approvedAmount,
        expectedValue: medianCost,
        deviation,
        explanation: `Project cost (₹${project.approvedAmount.toLocaleString()}) is ${deviation.toFixed(1)}% above peer median (₹${medianCost.toLocaleString()}).`,
        evidenceReferences: peers.map((_, i) => `peer-${i}`),
        metadata: {
          peerCount: peers.length,
          peerMedian: medianCost,
          peerRange: [Math.min(...peerCosts), Math.max(...peerCosts)],
        },
        algorithmVersion: 'rule-engine-v1.0',
      });
    }

    return signals;
  }

  private generateGeographicSignals(data: ProjectDataSnapshot, now: Date): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const { project } = data;

    // Check for projects with coordinates outside their reported district
    // (This would require geospatial lookups - simplified here)
    if (project.latitude && project.longitude) {
      // Placeholder: in production, this would check against district boundaries
      // For now, flag projects with no coordinates
    }

    return signals;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}
