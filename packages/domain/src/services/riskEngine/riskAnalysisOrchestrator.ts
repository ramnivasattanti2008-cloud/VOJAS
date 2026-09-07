/**
 * M8: Risk Analysis Orchestrator — Top-level coordinator
 *
 * The orchestrator runs the full risk analysis pipeline:
 *   1. Data quality gate
 *   2. Signal generation
 *   3. Rule evaluation
 *   4. Signal correlation
 *   5. Risk scoring
 *   6. Finding generation
 *   7. AI explanation
 *   8. Persistence + audit
 *
 * ASYNC PIPELINE:
 *   Data updated → Signal generation → Rule evaluation → Correlation →
 *   Risk calculation → Finding generation → Store
 *
 * STATUS: QUEUED → PROCESSING → COMPLETED | FAILED
 */

import { PrismaClient } from '@vojas/db';
import type { Prisma } from '@vojas/db';
import { SignalGenerator } from './signalGenerator.js';
import { CorrelationEngine } from './correlationEngine.js';
import { RiskScorer, ProjectRiskResult } from './riskScorer.js';
import { DataQualityGate } from './dataQualityGate.js';
import { AIExplainer } from './aiExplainer.js';
import { RiskRuleEngine, ProjectDataSnapshot } from './ruleEngine.js';
import type {
  RiskSignal,
  CorrelatedFinding,
  RiskFindingInput,
  DataQualityAssessment,
  RiskLevel,
} from './types.js';

const ALGORITHM_VERSION = 'rule-engine-v1.0';

export interface RiskAnalysisResult {
  projectId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INSUFFICIENT_DATA';
  signals: RiskSignal[];
  findings: RiskFindingInput[];
  dataQuality: DataQualityAssessment;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  methodology: string;
  contributors: Array<{ sourceType: string; contribution: number; label: string }>;
  signalsCount: number;
  findingsCount: number;
  sourceDiversity: number;
  error?: string;
  processingTimeMs: number;
  algorithmVersion: string;
  computedAt: Date;
}

export class RiskAnalysisOrchestrator {
  private prisma: PrismaClient;
  private signalGenerator: SignalGenerator;
  private correlationEngine: CorrelationEngine;
  private riskScorer: RiskScorer;
  private dataQualityGate: DataQualityGate;
  private aiExplainer: AIExplainer;
  private ruleEngine: RiskRuleEngine;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.signalGenerator = new SignalGenerator(prisma);
    this.correlationEngine = new CorrelationEngine(prisma, {
      severityPoints: { LOW: 5, MEDIUM: 15, HIGH: 30, CRITICAL: 50 },
      confidenceMultiplier: { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.2 },
      sourceDiversityBonus: 2,
      correlationBonus: 5,
      temporalCorrelationBonus: 3,
    });
    this.riskScorer = new RiskScorer({
      severityPoints: { LOW: 5, MEDIUM: 15, HIGH: 30, CRITICAL: 50 },
      confidenceMultiplier: { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.2 },
      sourceDiversityBonus: 2,
      correlationBonus: 5,
      temporalCorrelationBonus: 3,
    });
    this.dataQualityGate = new DataQualityGate(prisma);
    this.aiExplainer = new AIExplainer('rule-engine-v1.0', 'explain-v1.0');
    this.ruleEngine = new RiskRuleEngine(prisma);
  }

  /**
   * Run the full risk analysis pipeline for a project
   */
  async analyze(projectId: string, options: { persist?: boolean; forceNewRun?: boolean } = {}): Promise<RiskAnalysisResult> {
    const startTime = Date.now();
    const { persist = true } = options;

    try {
      // 1. Load project data
      const projectData = await this.loadProjectData(projectId);
      if (!projectData) {
        return {
          projectId,
          status: 'FAILED',
          signals: [],
          findings: [],
          dataQuality: this.emptyDataQuality(projectId),
          riskScore: 0,
          riskLevel: 'LOW',
          confidence: 'LOW',
          methodology: 'Project not found',
          contributors: [],
          signalsCount: 0,
          findingsCount: 0,
          sourceDiversity: 0,
          error: 'Project not found',
          processingTimeMs: Date.now() - startTime,
          algorithmVersion: ALGORITHM_VERSION,
          computedAt: new Date(),
        };
      }

      // 2. Data quality gate
      const dataQuality = await this.dataQualityGate.assess(projectData);
      const shouldProceed = await this.dataQualityGate.shouldProceed(dataQuality);

      if (!shouldProceed) {
        return {
          projectId,
          status: 'INSUFFICIENT_DATA',
          signals: [],
          findings: [],
          dataQuality,
          riskScore: 0,
          riskLevel: 'LOW',
          confidence: 'LOW',
          methodology: 'Data quality gate failed',
          contributors: [],
          signalsCount: 0,
          findingsCount: 0,
          sourceDiversity: 0,
          error: 'Insufficient data: ' + dataQuality.reasons.join('; '),
          processingTimeMs: Date.now() - startTime,
          algorithmVersion: ALGORITHM_VERSION,
          computedAt: new Date(),
        };
      }

      // 3. Signal generation
      const signals = await this.signalGenerator.generateSignals(projectData);

      // 4. Rule evaluation
      const rules = await this.ruleEngine.loadRules();
      for (const rule of rules) {
        const result = await this.ruleEngine.evaluateRule(rule, projectId, projectData);
        if (result.triggered && result.signal) {
          signals.push(result.signal);
        }
      }

      // 5. Adjust confidence for data quality
      for (const signal of signals) {
        const adjusted = this.dataQualityGate.adjustConfidenceForQuality(signal.confidence, dataQuality);
        signal.confidence = adjusted;
      }

      // 6. Correlate signals
      const findings = await this.correlationEngine.correlate(signals);

      // 7. Compute risk score
      const riskResult = this.riskScorer.computeProjectRiskScore(signals, findings);

      // 8. Generate RiskFinding inputs
      const riskFindings: RiskFindingInput[] = findings.map(f => ({
        projectId,
        type: f.findingType,
        title: f.title,
        description: f.description,
        severity: f.severity as any,
        riskScore: f.riskScore,
        confidence: f.confidence,
        status: 'NEW' as const,
        recommendedAction: f.recommendedAction,
        limitations: f.limitations,
        signalIds: f.signalIds,
        evidence: {
          evidenceChain: f.evidenceChain,
          contributors: f.contributors,
          explanation: f.explanation,
        },
        algorithmVersion: ALGORITHM_VERSION,
      }));

      // 9. Persist if requested
      let persistedSignalIds: string[] = [];
      let persistedFindingIds: string[] = [];
      if (persist) {
        persistedSignalIds = await this.signalGenerator.persistSignals(signals);
        persistedFindingIds = await this.persistFindings(riskFindings, projectId);
        await this.persistProjectRisk(projectId, riskResult);
        await this.persistRiskEvents(projectId, riskFindings, riskResult);
      }

      return {
        projectId,
        status: 'COMPLETED',
        signals,
        findings: riskFindings,
        dataQuality,
        riskScore: riskResult.score,
        riskLevel: riskResult.riskLevel,
        confidence: riskResult.confidence,
        methodology: riskResult.methodology,
        contributors: riskResult.contributors,
        signalsCount: signals.length,
        findingsCount: riskFindings.length,
        sourceDiversity: new Set(signals.map(s => s.sourceType)).size,
        processingTimeMs: Date.now() - startTime,
        algorithmVersion: ALGORITHM_VERSION,
        computedAt: new Date(),
      };
    } catch (error) {
      return {
        projectId,
        status: 'FAILED',
        signals: [],
        findings: [],
        dataQuality: this.emptyDataQuality(projectId),
        riskScore: 0,
        riskLevel: 'LOW',
        confidence: 'LOW',
        methodology: 'Analysis failed',
        contributors: [],
        signalsCount: 0,
        findingsCount: 0,
        sourceDiversity: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
        algorithmVersion: ALGORITHM_VERSION,
        computedAt: new Date(),
      };
    }
  }

  /**
   * Load project data for analysis
   */
  private async loadProjectData(projectId: string): Promise<ProjectDataSnapshot | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        progressObservations: { orderBy: { reportDate: 'desc' }, take: 20 },
        financialObservations: { orderBy: { date: 'desc' }, take: 50 },
        documents: { orderBy: { uploadedAt: 'desc' }, take: 50 },
        vendor: true,
      },
    });

    if (!project) return null;

    // Get latest satellite observation
    const latestSatelliteObs = await this.prisma.satelliteObservation.findFirst({
      where: { projectId },
      orderBy: { observationDate: 'desc' },
    });

    // Get latest change analysis
    const latestChangeAnalysis = await this.prisma.changeAnalysis.findFirst({
      where: { projectId, processingStatus: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // Get citizen reports
    const citizenReports = await this.prisma.report.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get anomalies
    const anomalies = await this.prisma.anomaly.findMany({
      where: { projectId, status: { notIn: ['RESOLVED', 'DISMISSED'] } },
      take: 50,
    });

    return {
      projectId,
      project: {
        id: project.id,
        name: project.name,
        approvedAmount: project.approvedAmount,
        spentAmount: project.spentAmount,
        startDate: project.startDate,
        expectedEndDate: project.expectedEndDate,
        completedAt: project.completedAt,
        latitude: project.latitude,
        longitude: project.longitude,
        district: project.district,
        state: project.state,
        sector: project.sector,
        status: project.status,
      },
      latestSatelliteObs: latestSatelliteObs
        ? {
            id: latestSatelliteObs.id,
            observationDate: latestSatelliteObs.observationDate,
            cloudCover: latestSatelliteObs.cloudCover,
            resolution: latestSatelliteObs.resolution,
            centerLat: latestSatelliteObs.centerLat,
            centerLng: latestSatelliteObs.centerLng,
            constructionScore: latestSatelliteObs.constructionScore,
            changeClassification: latestChangeAnalysis?.changeClassification || null,
          }
        : null,
      progressObservations: project.progressObservations.map(p => ({
        id: p.id,
        reportDate: p.reportDate,
        reportedProgress: p.reportedProgress,
        reportSource: p.reportSource,
        observedChange: p.observedChange,
        verificationResult: p.verificationResult,
      })),
      financialObservations: project.financialObservations.map(f => ({
        id: f.id,
        date: f.date,
        type: f.type,
        amount: f.amount,
        category: f.category,
        description: f.description,
      })),
      documents: project.documents.map(d => ({
        id: d.id,
        type: d.type,
        title: d.title,
        uploadedAt: d.uploadedAt,
        status: d.status,
      })),
      citizenReports: citizenReports.map(r => ({
        id: r.id,
        submittedAt: r.createdAt,
        category: r.category,
        severity: r.severity,
        status: r.status,
      })),
      contractor: project.vendor
        ? {
            id: project.vendor.id,
            name: project.vendor.name,
            totalPaid: project.vendor.totalValue,
            projectCount: project.vendor.totalContracts,
          }
        : null,
      changeAnalyses: latestChangeAnalysis
        ? [
            {
              id: latestChangeAnalysis.id,
              analysisType: latestChangeAnalysis.analysisType,
              changeClassification: latestChangeAnalysis.changeClassification,
              confidence: latestChangeAnalysis.confidence,
              changePercent: latestChangeAnalysis.changePercent,
              reportedProgressComparison: latestChangeAnalysis.reportedProgressComparison,
              methodology: latestChangeAnalysis.methodology,
              limitations: latestChangeAnalysis.limitations,
            },
          ]
        : null,
      anomalies: anomalies.map((a: { id: string; category: string; severity: string; status: string; description: string }) => ({
        id: a.id,
        category: a.category,
        severity: a.severity,
        status: a.status,
        description: a.description,
      })),
    };
  }

  /**
   * Persist findings
   */
  private async persistFindings(findings: RiskFindingInput[], projectId: string): Promise<string[]> {
    const ids: string[] = [];

    for (const finding of findings) {
      // Check for existing open finding of same type for same project
      const existing = await this.prisma.riskFinding.findFirst({
        where: {
          projectId,
          type: finding.type,
          status: { in: ['NEW', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'VERIFICATION_REQUIRED'] },
        },
      });

      if (existing) {
        // Update existing finding with new evidence
        const updated = await this.prisma.riskFinding.update({
          where: { id: existing.id },
          data: {
            riskScore: Math.max(existing.riskScore, finding.riskScore),
            confidence: finding.confidence,
            signalIds: Array.from(new Set([...existing.signalIds, ...finding.signalIds])),
            evidence: finding.evidence as any,
            lastObservedAt: new Date(),
          },
        });
        ids.push(updated.id);
      } else {
        // Create new finding
        const created = await this.prisma.riskFinding.create({
          data: {
            projectId,
            type: finding.type,
            title: finding.title,
            description: finding.description,
            severity: finding.severity as any,
            riskScore: finding.riskScore,
            confidence: finding.confidence,
            status: 'NEW',
            recommendedAction: finding.recommendedAction,
            limitations: finding.limitations,
            signalIds: finding.signalIds,
            evidence: finding.evidence as any,
            algorithmVersion: finding.algorithmVersion,
            firstObservedAt: new Date(),
            lastObservedAt: new Date(),
          },
        });
        ids.push(created.id);
      }
    }

    return ids;
  }

  /**
   * Persist project risk score
   */
  private async persistProjectRisk(projectId: string, risk: ProjectRiskResult): Promise<void> {
    // Compute component scores
    const componentScores = this.computeComponentScores(risk);

    await this.prisma.projectRisk.upsert({
      where: { projectId },
      create: {
        projectId,
        riskLevel: risk.riskLevel as any,
        riskScore: risk.score,
        financialScore: componentScores.financial,
        satelliteScore: componentScores.satellite,
        progressScore: componentScores.progress,
        documentScore: componentScores.document,
        citizenScore: componentScores.citizen,
        contractorScore: componentScores.contractor,
        geographicScore: componentScores.geographic,
        correlationScore: componentScores.correlation,
        confidence: risk.confidence,
        primaryDriver: this.findPrimaryDriver(risk),
        drivers: risk.contributors as any,
        findingsCount: risk.findingCount,
        signalsCount: risk.signalCount,
        sourceDiversity: risk.sourceTypes.length,
        algorithmVersion: ALGORITHM_VERSION,
        computedAt: new Date(),
      },
      update: {
        riskLevel: risk.riskLevel as any,
        riskScore: risk.score,
        financialScore: componentScores.financial,
        satelliteScore: componentScores.satellite,
        progressScore: componentScores.progress,
        documentScore: componentScores.document,
        citizenScore: componentScores.citizen,
        contractorScore: componentScores.contractor,
        geographicScore: componentScores.geographic,
        correlationScore: componentScores.correlation,
        confidence: risk.confidence,
        primaryDriver: this.findPrimaryDriver(risk),
        drivers: risk.contributors as any,
        findingsCount: risk.findingCount,
        signalsCount: risk.signalCount,
        sourceDiversity: risk.sourceTypes.length,
        algorithmVersion: ALGORITHM_VERSION,
        computedAt: new Date(),
      },
    });
  }

  private computeComponentScores(risk: ProjectRiskResult) {
    const componentScores = {
      financial: 0,
      satellite: 0,
      progress: 0,
      document: 0,
      citizen: 0,
      contractor: 0,
      geographic: 0,
      correlation: risk.correlationBonus,
    };

    for (const contributor of risk.contributors) {
      if (contributor.sourceType.includes('FINANCIAL')) {
        componentScores.financial += Math.round(contributor.contribution);
      } else if (contributor.sourceType.includes('SATELLITE')) {
        componentScores.satellite += Math.round(contributor.contribution);
      } else if (contributor.sourceType.includes('PROGRESS')) {
        componentScores.progress += Math.round(contributor.contribution);
      } else if (contributor.sourceType.includes('DOCUMENT')) {
        componentScores.document += Math.round(contributor.contribution);
      } else if (contributor.sourceType.includes('CITIZEN')) {
        componentScores.citizen += Math.round(contributor.contribution);
      } else if (contributor.sourceType.includes('CONTRACTOR')) {
        componentScores.contractor += Math.round(contributor.contribution);
      } else if (contributor.sourceType.includes('GEOGRAPHIC')) {
        componentScores.geographic += Math.round(contributor.contribution);
      }
    }

    return componentScores;
  }

  private findPrimaryDriver(risk: ProjectRiskResult): string {
    if (risk.contributors.length === 0) return 'None';
    const sorted = [...risk.contributors].sort((a, b) => b.contribution - a.contribution);
    return sorted[0].label;
  }

  private async persistRiskEvents(
    projectId: string,
    findings: RiskFindingInput[],
    risk: ProjectRiskResult
  ): Promise<void> {
    for (const finding of findings) {
      await this.prisma.riskEvent.create({
        data: {
          projectId,
          eventType: 'finding_detected',
          description: finding.title,
          severity: finding.severity as any,
          riskScore: finding.riskScore,
          relatedSignalIds: finding.signalIds as any,
          metadata: {
            findingType: finding.type,
            confidence: finding.confidence,
            algorithmVersion: finding.algorithmVersion,
          },
        },
      });
    }

    // Risk score updated event
    await this.prisma.riskEvent.create({
      data: {
        projectId,
        eventType: 'score_updated',
        description: `Risk score updated to ${risk.score}/100 (${risk.riskLevel})`,
        severity: risk.riskLevel as any,
        riskScore: risk.score,
        metadata: {
          signalCount: risk.signalCount,
          findingCount: risk.findingCount,
          confidence: risk.confidence,
        },
      },
    });
  }

  private emptyDataQuality(projectId: string): DataQualityAssessment {
    return {
      projectId,
      sourcesAvailable: false,
      sourceCount: 0,
      freshnessDays: null,
      completenessScore: 0,
      geometryValid: false,
      observationQuality: 'INSUFFICIENT',
      overallPass: false,
      reasons: ['No project data available'],
    };
  }
}
