/**
 * VOJAS PDF Generation Suite
 *
 * Client-side PDF generation engine using jsPDF + jspdf-autotable.
 * Zero fabricated data, honest handling of absent signals, institutional typography,
 * and automatic pagination.
 */

import {
    NOT_AVAILABLE,
    buildReportFilename,
    formatCoordinates,
    formatDateTime,
    formatEnumLabel,
    joinPresent,
} from './format';
import { createReportDocument } from './reportDocument';
import type {
    ReportDefinition,
    ReportMeta,
    ReportMetric,
    TableReportData
} from './types';

// Re-export all core types, primitives, and themes
export * from './format';
export * from './reportDocument';
export * from './theme';
export * from './types';

// ── High-Level Report Generators ─────────────────────────────────────────────

export interface GenerateProjectReportOptions {
  project: any;
  audit?: any | null;
  risk?: any;
  timeline?: any[];
  documents?: any[];
  citizenReports?: any[];
}

/**
 * Generates an institutional-grade PDF dossier for an individual MPLADS project.
 * Includes complete project provenance, financial utilization, and optional
 * forensic AI screening audit results with zero fabricated data.
 */
export async function generateProjectReportPdf(
  options: GenerateProjectReportOptions
): Promise<string> {
  const { project, audit } = options;
  if (!project) {
    throw new Error('Cannot generate report: project data is missing.');
  }

  const meta: ReportMeta = {
    documentKind: 'PROJECT AUDIT DOSSIER',
    title: project.name || 'MPLADS Project Report',
    subtitle: project.description || undefined,
    scopeLabel: joinPresent([project.district, project.state, formatEnumLabel(project.sector)]),
    dataSource: project.source
      ? `MPLADS (${formatEnumLabel(project.source)})`
      : 'MPLADS Portal / Ministry of Statistics and Programme Implementation',
    generatedAt: new Date(),
    orientation: 'portrait',
  };

  const report = await createReportDocument(meta);

  // 1. Financial & Lifecycle Overview
  const hasSanction = typeof project.approvedAmount === 'number' && project.approvedAmount > 0;
  const hasSpent = typeof project.spentAmount === 'number' && project.spentAmount >= 0;
  const utilization =
    hasSanction && hasSpent ? (project.spentAmount / project.approvedAmount) * 100 : null;

  report.section({
    title: 'Financial & Lifecycle Overview',
    metrics: [
      {
        label: 'Approved Sanction',
        value: hasSanction ? project.approvedAmount : null,
        format: 'currency',
        tone: 'neutral',
      },
      {
        label: 'Expenditure Recorded',
        value: hasSpent ? project.spentAmount : null,
        format: 'currency',
        tone: 'neutral',
      },
      {
        label: 'Financial Utilization',
        value: utilization,
        format: 'percent',
        caption:
          hasSanction && hasSpent
            ? `${Math.round(utilization!)}% of sanctioned budget`
            : undefined,
        tone: utilization && utilization > 100 ? 'warning' : 'accent',
      },
      {
        label: 'Project Status',
        value: formatEnumLabel(project.status),
        format: 'text',
        tone:
          project.status === 'COMPLETED'
            ? 'positive'
            : project.status === 'CANCELLED'
            ? 'critical'
            : 'accent',
      },
    ],
    definitions: [
      { label: 'Work Reference ID', value: project.sourceWorkId || project.id },
      { label: 'Sector / Category', value: formatEnumLabel(project.sector) },
      { label: 'State & District', value: joinPresent([project.district, project.state]) },
      { label: 'Constituency', value: project.constituency || NOT_AVAILABLE },
      {
        label: 'Member of Parliament',
        value: project.mp?.name
          ? `${project.mp.name}${project.mp.house ? ` (${project.mp.house})` : ''}${
              project.mp.party ? ` - ${project.mp.party}` : ''
            }`
          : NOT_AVAILABLE,
      },
      { label: 'Implementing Agency / Contractor', value: project.contractor || NOT_AVAILABLE },
      { label: 'Sanction / Start Date', value: project.startDate, format: 'date' },
      { label: 'Target Completion Date', value: project.expectedEndDate, format: 'date' },
      { label: 'Recorded Completion Date', value: project.completedAt, format: 'date' },
      {
        label: 'Site Coordinates (GPS)',
        value: formatCoordinates(project.latitude, project.longitude),
      },
    ],
  });

  // 2. Forensic AI Screening & Statutory Red Flags (if audit has been performed)
  if (audit) {
    const isCritical = audit.riskLevel === 'CRITICAL';
    const isHigh = audit.riskLevel === 'HIGH';
    const riskTone: ReportMetric['tone'] = isCritical
      ? 'critical'
      : isHigh
      ? 'warning'
      : 'positive';

    report.sectionHeading(
      'Forensic AI & Regulatory Screening',
      audit.auditedAt ? `Audited ${formatDateTime(audit.auditedAt)}` : undefined
    );

    report.metrics([
      {
        label: 'Risk Level',
        value: audit.riskLevel,
        format: 'text',
        tone: riskTone,
      },
      {
        label: 'Risk Score',
        value: audit.riskScore,
        format: 'decimal',
        caption: 'Scale: 0 - 100',
        tone: riskTone,
      },
      {
        label: 'Audit Confidence',
        value:
          typeof audit.confidenceScore === 'number'
            ? audit.confidenceScore
            : audit.confidence,
        format: typeof audit.confidenceScore === 'number' ? 'percent' : 'text',
        caption: `Engine: ${audit.modelUsed || 'Vojas AI Core'}`,
        tone: 'neutral',
      },
      {
        label: 'Forensic Verdict',
        value: formatEnumLabel(audit.forensicVerdict),
        format: 'text',
        tone: riskTone,
      },
    ]);

    if (audit.executiveSummary) {
      report.callout({
        title: `AUDIT VERDICT: ${audit.verdictTitle || formatEnumLabel(audit.forensicVerdict)}`,
        body: audit.executiveSummary,
        tone: riskTone,
      });
    }

    // Statutory Red Flags Table
    if (Array.isArray(audit.statutoryRedFlags) && audit.statutoryRedFlags.length > 0) {
      report.table({
        columns: [
          { key: 'rule', header: 'Statutory Rule / Clause', width: 130 },
          { key: 'severity', header: 'Severity', width: 68, emphasis: 'risk' },
          { key: 'violation', header: 'Violation Finding' },
          { key: 'evidence', header: 'Audit Evidence' },
        ],
        rows: audit.statutoryRedFlags.map((flag: any) => ({
          rule: flag.rule,
          severity: flag.severity,
          violation: flag.violation,
          evidence: flag.evidence,
        })),
        note: 'Cross-referenced against GFR 2017, CVC Guidelines, and MPLADS Scheme Mandates.',
      });
    }

    // Financial Reconciliation & Contractor Profile
    if (audit.financialAudit || audit.contractorRiskAssessment) {
      const finDefs: ReportDefinition[] = [];
      if (audit.financialAudit) {
        finDefs.push({
          label: 'Expenditure / Progress Disparity',
          value: audit.financialAudit.disbursalAnomaly
            ? 'FLAGGED DISPARITY DETECTED'
            : 'Disbursal within standard progress bounds',
        });
        if (audit.financialAudit.analysis) {
          finDefs.push({
            label: 'Financial Forensic Analysis',
            value: audit.financialAudit.analysis,
          });
        }
      }
      if (audit.contractorRiskAssessment) {
        finDefs.push({
          label: 'Contractor Risk Profile',
          value:
            audit.contractorRiskAssessment.contractorName ||
            project.contractor ||
            NOT_AVAILABLE,
        });
        if (audit.contractorRiskAssessment.concentrationIndex) {
          finDefs.push({
            label: 'Contractor Concentration Index',
            value: audit.contractorRiskAssessment.concentrationIndex,
          });
        }
        if (
          Array.isArray(audit.contractorRiskAssessment.riskFlags) &&
          audit.contractorRiskAssessment.riskFlags.length > 0
        ) {
          finDefs.push({
            label: 'Identified Contractor Flags',
            value: audit.contractorRiskAssessment.riskFlags.join('; '),
          });
        }
      }
      report.sectionHeading('Financial Reconciliation & Vendor Profile');
      report.definitions(finDefs);
    }

    // Earth Observation / Satellite Telemetry Verdict
    if (audit.satelliteTelemetryVerdict) {
      report.sectionHeading('Earth Observation Telemetry');
      const sat = audit.satelliteTelemetryVerdict;
      report.definitions([
        {
          label: 'Surface Spectral Change',
          value:
            sat.spectralChangeDetected === true
              ? 'Confirmed Spectral Disturbance'
              : sat.spectralChangeDetected === false
              ? 'No Significant Surface Activity Detected'
              : 'Observation Inconclusive / Insufficient Clear Scans',
        },
        {
          label: 'Observation Confidence',
          value: sat.surfaceObservationConfidence || NOT_AVAILABLE,
        },
        {
          label: 'Telemetry Interpretation',
          value: sat.interpretation || NOT_AVAILABLE,
        },
      ]);
    }

    // Recommended Action Plan
    if (Array.isArray(audit.actionPlan) && audit.actionPlan.length > 0) {
      report.sectionHeading('Recommended Investigation Steps');
      report.table({
        columns: [
          { key: 'step', header: 'Step', width: 40, align: 'center' },
          { key: 'urgency', header: 'Priority', width: 75, emphasis: 'strong' },
          { key: 'authority', header: 'Competent Authority', width: 140 },
          { key: 'action', header: 'Required Statutory Action' },
        ],
        rows: audit.actionPlan.map((ap: any) => ({
          step: ap.step,
          urgency: ap.urgency,
          authority: ap.authority,
          action: ap.action,
        })),
      });
    }

    // Citizen Ground Verification Checklist
    if (Array.isArray(audit.citizenChecklist) && audit.citizenChecklist.length > 0) {
      report.sectionHeading('Citizen Ground Verification Checklist');
      report.table({
        columns: [
          { key: 'num', header: '#', width: 35, align: 'center' },
          { key: 'item', header: 'Verification Task' },
        ],
        rows: audit.citizenChecklist.map((item: string, idx: number) => ({
          num: idx + 1,
          item,
        })),
      });
    }
  } else if (project.projectRisk) {
    // Fallback: Baseline Risk Assessment
    const r = project.projectRisk;
    const isCritical = r.riskLevel === 'CRITICAL';
    const isHigh = r.riskLevel === 'HIGH';
    const riskTone: ReportMetric['tone'] = isCritical
      ? 'critical'
      : isHigh
      ? 'warning'
      : 'positive';

    report.section({
      title: 'Baseline Risk Assessment',
      metrics: [
        { label: 'Risk Level', value: r.riskLevel, tone: riskTone },
        {
          label: 'Risk Score',
          value: r.riskScore,
          format: 'decimal',
          caption: 'Scale: 0 - 100',
          tone: riskTone,
        },
        { label: 'Confidence', value: r.confidence, tone: 'neutral' },
        { label: 'Primary Driver', value: r.primaryDriver || NOT_AVAILABLE, tone: 'accent' },
      ],
      definitions: [
        { label: 'Financial Discrepancy Score', value: r.financialScore, format: 'decimal' },
        { label: 'Progress Stall Score', value: r.progressScore, format: 'decimal' },
        { label: 'Satellite Verification Score', value: r.satelliteScore, format: 'decimal' },
        { label: 'Contractor Risk Score', value: r.contractorScore, format: 'decimal' },
      ],
      note: 'Baseline risk signals computed from structured ingestion and discrepancy detection models.',
    });
  }

  // Finalize and download
  const filename = buildReportFilename({
    kind: 'Project-Report',
    reference: project.sourceWorkId || project.id,
  });

  return await report.save(filename);
}

export interface GenerateAnalyticsReportOptions {
  summary?: any;
  states?: any[];
  sectors?: any[];
  risk?: any;
  anomalies?: any;
  trends?: any;
}

/**
 * Generates an institutional-grade PDF summary of national platform analytics.
 */
export async function generateAnalyticsReportPdf(
  options: GenerateAnalyticsReportOptions
): Promise<string> {
  const { summary, states, sectors, anomalies } = options;

  const meta: ReportMeta = {
    documentKind: 'NATIONAL ANALYTICS REPORT',
    title: 'MPLADS Forensic & Performance Analytics',
    subtitle:
      'Platform-wide synthesis of project sanctions, expenditure, sector distribution, and risk indicators.',
    scopeLabel: 'NATIONAL CONSOLIDATED DOSSIER',
    dataSource: 'VOJAS Forensic Platform (MPLADS / MoSPI Data Repositories)',
    generatedAt: new Date(),
    orientation: 'portrait',
  };

  const report = await createReportDocument(meta);

  // 1. Headline metrics
  const totalProjects = summary?.totalProjects ?? null;
  const totalSanctioned = summary?.totalSanctioned ?? null;
  const totalSpent = summary?.totalSpent ?? null;
  const openAnomalies =
    anomalies?.byStatus?.find((b: any) => b.status === 'OPEN')?._count?._all ?? null;

  report.section({
    title: 'National Portfolio Summary',
    metrics: [
      { label: 'Tracked Projects', value: totalProjects, format: 'number' },
      { label: 'Total Sanctioned', value: totalSanctioned, format: 'currencyCompact' },
      { label: 'Total Expenditure', value: totalSpent, format: 'currencyCompact' },
      {
        label: 'Open Anomalies',
        value: openAnomalies,
        format: 'number',
        tone: openAnomalies && openAnomalies > 0 ? 'warning' : 'positive',
      },
    ],
    definitions: [
      { label: 'Completed Works', value: summary?.completedProjects, format: 'number' },
      { label: 'In-Progress Works', value: summary?.inProgressProjects, format: 'number' },
      { label: 'Delayed Works', value: summary?.delayedProjects, format: 'number' },
      { label: 'Database Synchronization', value: summary?.lastUpdated, format: 'datetime' },
    ],
  });

  // 2. Sector breakdown table
  if (Array.isArray(sectors) && sectors.length > 0) {
    report.sectionHeading('Sector-Wise Resource Allocation', `${sectors.length} Sectors Recorded`);
    report.table({
      columns: [
        { key: 'sector', header: 'Sector' },
        { key: 'projects', header: 'Works Count', align: 'right', format: 'number' },
        { key: 'sanctioned', header: 'Sanctioned', align: 'right', format: 'currencyCompact' },
        { key: 'spent', header: 'Expenditure', align: 'right', format: 'currencyCompact' },
      ],
      rows: sectors.map((s: any) => ({
        sector: formatEnumLabel(s.sector || s.name),
        projects: s.total ?? s.count ?? s.projectCount ?? s.totalProjects ?? null,
        sanctioned: s.totalAmount ?? s.totalSanctioned ?? s.approvedAmount ?? null,
        spent: s.spentAmount ?? s.totalSpent ?? null,
      })),
      note: 'Amounts reflect sanctioned and disbursed totals as reported by the respective implementing departments.',
    });
  }

  // 3. State-wise distribution table
  if (Array.isArray(states) && states.length > 0) {
    report.sectionHeading(
      'State & Union Territory Distribution',
      `${states.length} Jurisdictions`
    );
    report.table({
      columns: [
        { key: 'state', header: 'State / UT' },
        { key: 'total', header: 'Total Works', align: 'right', format: 'number' },
        { key: 'completed', header: 'Completed', align: 'right', format: 'number' },
        { key: 'sanctioned', header: 'Sanctioned', align: 'right', format: 'currencyCompact' },
        { key: 'spent', header: 'Expenditure', align: 'right', format: 'currencyCompact' },
      ],
      rows: states.slice(0, 36).map((st: any) => ({
        state: st.state || st.name,
        total: st.totalProjects ?? st.count ?? null,
        completed: st.completedProjects ?? null,
        sanctioned: st.totalSanctioned ?? null,
        spent: st.totalSpent ?? null,
      })),
      note: 'Sorted by jurisdiction records in the VOJAS repository.',
    });
  }

  // 4. Anomaly & Risk categories
  if (
    anomalies?.byCategory &&
    Array.isArray(anomalies.byCategory) &&
    anomalies.byCategory.length > 0
  ) {
    report.sectionHeading('Regulatory & Forensic Anomaly Distribution');
    report.table({
      columns: [
        { key: 'category', header: 'Anomaly Classification' },
        { key: 'count', header: 'Detected Incidents', align: 'right', format: 'number' },
      ],
      rows: anomalies.byCategory.map((b: any) => ({
        category: formatEnumLabel(b.category),
        count: Number(b._count?._all ?? b.count ?? 0),
      })),
      note: 'All flagged anomalies require independent physical verification by vigilance authorities.',
    });
  }

  const filename = buildReportFilename({ kind: 'Analytics-Report' });
  return await report.save(filename);
}

/**
 * Generates an institutional-grade PDF report from a declarative table spec.
 */
export async function generateTableReportPdf(data: TableReportData): Promise<string> {
  const meta: ReportMeta = {
    documentKind: data.meta?.documentKind ?? 'DOCUMENT REGISTER',
    title: data.title,
    subtitle: data.subtitle ?? undefined,
    scopeLabel: data.scopeLabel ?? undefined,
    dataSource: data.meta?.dataSource ?? 'VOJAS Platform Registry',
    generatedAt: data.meta?.generatedAt ?? new Date(),
    orientation: data.meta?.orientation ?? 'portrait',
  };

  const report = await createReportDocument(meta);

  if (data.metrics && data.metrics.length > 0) {
    report.metrics(data.metrics);
  }

  if (data.filters && data.filters.length > 0) {
    report.definitions(data.filters);
  }

  report.table(data.table);

  const filename = buildReportFilename({
    kind: data.meta?.documentKind ?? 'Table-Report',
  });
  return await report.save(filename);
}
