/**
 * Payload contracts for VOJAS PDF reports.
 *
 * Every generator takes data that has *already been fetched* by the page — this
 * module never calls an API, never guesses, and never fills a gap. Any field
 * left null/undefined is printed as "Not available".
 *
 * A note on optional arrays, because the distinction is load-bearing:
 *   - `undefined` — the caller did not request that section. It is omitted.
 *   - `[]`        — the caller requested it and there genuinely is nothing.
 *                   The section is rendered with an explicit empty state.
 */

import type { ReportCellValue, ValueFormat } from './format';
import type { ReportTone } from './theme';

export type { ReportCellValue, ValueFormat } from './format';
export type { ReportTone } from './theme';

// ── Shared building blocks ────────────────────────────────────────────────────

export interface ReportColumn {
  /** Key into each row object. */
  key: string;
  header: string;
  /** Fixed width in points. Omit to let the table size the column automatically. */
  width?: number;
  align?: 'left' | 'center' | 'right';
  /** How the raw value is rendered. Defaults to 'text'. */
  format?: ValueFormat;
  /** 'risk' colours the cell text by risk/severity level; 'strong' bolds it. */
  emphasis?: 'risk' | 'strong';
}

export type ReportRow = Record<string, ReportCellValue>;

export interface ReportTableSpec {
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Shown in place of the table when `rows` is empty. */
  emptyMessage?: string;
  /** Optional second line of the empty state, e.g. why nothing is available. */
  emptyDetail?: string;
  /** Small muted line printed under the table (units, caveats, coverage). */
  note?: string;
}

export interface ReportMetric {
  label: string;
  value: ReportCellValue;
  format?: ValueFormat;
  /** Small line under the value — units, denominator, or a caveat. */
  caption?: string | null;
  tone?: ReportTone;
}

export interface ReportDefinition {
  label: string;
  value: ReportCellValue;
  format?: ValueFormat;
}

export interface ReportSection {
  title: string;
  /** Right-aligned note beside the heading (e.g. record count, as-of date). */
  headingNote?: string;
  description?: string | null;
  metrics?: ReportMetric[];
  definitions?: ReportDefinition[];
  table?: ReportTableSpec;
  /** Closing muted paragraph for the section. */
  note?: string | null;
}

/** Document-level metadata shared by every report. */
export interface ReportMeta {
  /** Small caps label in the masthead, e.g. "PROJECT REPORT". */
  documentKind: string;
  title: string;
  subtitle?: string | null;
  /** Breadcrumb-ish scope line, e.g. "Nalgonda, Telangana - Roads". */
  scopeLabel?: string | null;
  /**
   * Footer provenance. State the real upstream dataset. Left unset it prints
   * "Source: Not specified" rather than implying an authority that was not used.
   */
  dataSource?: string | null;
  generatedAt?: Date;
  orientation?: 'portrait' | 'landscape';
}

// ── Project report ────────────────────────────────────────────────────────────

export interface ProjectReportProject {
  id: string;
  /** Upstream work id shown to auditors (Project.sourceWorkId). */
  reference?: string | null;
  name: string;
  description?: string | null;
  sector?: string | null;
  status?: string | null;
  state?: string | null;
  district?: string | null;
  constituency?: string | null;
  /** Implementing agency / contractor, exactly as recorded. */
  contractor?: string | null;
  mpName?: string | null;
  mpParty?: string | null;
  mpHouse?: string | null;
  mpTerm?: string | null;
  approvedAmount?: number | null;
  spentAmount?: number | null;
  /** Reported progress in percentage points (0-100). */
  progressPercent?: number | null;
  startDate?: string | Date | null;
  expectedEndDate?: string | Date | null;
  completedAt?: string | Date | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Ingestion source id, e.g. "VONTER" / "DATAFUL". */
  source?: string | null;
  lastUpdated?: string | Date | null;
}

export interface ProjectReportRiskComponent {
  label: string;
  /** 0-100. Null when the engine had no usable signal for this component. */
  score?: number | null;
  note?: string | null;
}

export interface ProjectReportFinding {
  title: string;
  type?: string | null;
  severity?: string | null;
  confidence?: string | null;
  status?: string | null;
  detectedAt?: string | Date | null;
  description?: string | null;
  recommendedAction?: string | null;
  limitations?: string | null;
}

export interface ProjectReportRisk {
  /** 0-100. Null when no assessment has been computed. */
  riskScore?: number | null;
  riskLevel?: string | null;
  confidence?: string | null;
  primaryDriver?: string | null;
  components?: ProjectReportRiskComponent[];
  findings?: ProjectReportFinding[];
  /** Engine-supplied disclaimer; the standard AI caveat is printed regardless. */
  disclaimer?: string | null;
  computedAt?: string | Date | null;
  modelVersion?: string | null;
}

export interface ProjectReportTimelineEvent {
  occurredAt?: string | Date | null;
  eventType?: string | null;
  description?: string | null;
  source?: string | null;
}

export interface ProjectReportDocument {
  name?: string | null;
  documentType?: string | null;
  status?: string | null;
  uploadedAt?: string | Date | null;
  /** Human verification only. Machine processing must never mark a doc verified. */
  verifiedAt?: string | Date | null;
  verifiedBy?: string | null;
}

export interface ProjectReportCitizenReport {
  reference?: string | null;
  title?: string | null;
  category?: string | null;
  severity?: string | null;
  status?: string | null;
  submittedAt?: string | Date | null;
}

export interface ProjectReportObservation {
  observedAt?: string | Date | null;
  source?: string | null;
  classification?: string | null;
  confidence?: string | null;
  note?: string | null;
}

export interface ProjectReportData {
  project: ProjectReportProject;
  risk?: ProjectReportRisk | null;
  timeline?: ProjectReportTimelineEvent[];
  documents?: ProjectReportDocument[];
  citizenReports?: ProjectReportCitizenReport[];
  observations?: ProjectReportObservation[];
  /** Extra sections appended before the provenance block. */
  extraSections?: ReportSection[];
  meta?: Partial<ReportMeta>;
}

// ── Analytics report ──────────────────────────────────────────────────────────

export interface AnalyticsReportData {
  title: string;
  subtitle?: string | null;
  scopeLabel?: string | null;
  /** Filters that produced this view — printed verbatim so a result is reproducible. */
  filters?: ReportDefinition[];
  /** Headline tiles. Omit entirely rather than padding with placeholders. */
  metrics?: ReportMetric[];
  sections?: ReportSection[];
  /** Overrides the default "how to read this report" closing note. */
  closingNote?: string | null;
  meta?: Partial<ReportMeta>;
}

// ── Generic single-table report (document registers, lists, exports) ──────────

export interface TableReportData {
  title: string;
  subtitle?: string | null;
  scopeLabel?: string | null;
  filters?: ReportDefinition[];
  metrics?: ReportMetric[];
  table: ReportTableSpec;
  /** Section heading above the table. Defaults to the report title. */
  tableTitle?: string;
  meta?: Partial<ReportMeta>;
}
