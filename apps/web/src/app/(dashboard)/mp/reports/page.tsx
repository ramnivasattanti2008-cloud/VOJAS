'use client';

/**
 * MP Reports Center — M14
 * Generate constituency project reports.
 */

import { useState } from 'react';
import {
  FileText, Download, BarChart3, PieChart, TrendingUp,
  Users, Building2, Loader2, CheckCircle2
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useMPConstituency, useMPDemandClusters, useMPFinancials, useMPProjects } from '@/hooks/useMP';
import { cn } from '@/lib/utils';
import type { ReportRow } from '@/lib/pdf';
import type { ProjectSector } from '@vojas/shared';

const REPORT_TYPES = [
  {
    id: 'PROGRESS',
    label: 'Progress Report',
    description: 'Comprehensive project status across all sectors',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'FINANCIAL',
    label: 'Financial Summary',
    description: 'Budget allocation, releases, and expenditure',
    icon: PieChart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'DEMAND',
    label: 'Development Demand',
    description: 'Citizen demand clusters by location and sector',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'SECTOR',
    label: 'Sector Summary',
    description: 'Performance breakdown by sector',
    icon: BarChart3,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
];

const SECTOR_LABELS: Partial<Record<ProjectSector, string>> = {
  PUBLIC_INFRASTRUCTURE: 'Public Infrastructure',
  WATER_SANITATION: 'Water & Sanitation',
  EDUCATION: 'Education',
  HEALTH: 'Health',
  AGRICULTURE: 'Agriculture',
  ENVIRONMENT: 'Environment',
  TRANSPORT: 'Transport',
  ENERGY: 'Energy',
  HOUSING: 'Housing',
  RURAL_DEVELOPMENT: 'Rural Development',
  SOCIAL_WELFARE: 'Social Welfare',
  PUBLIC_ADMIN: 'Public Admin',
  FINANCE_PROCUREMENT: 'Finance',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

export default function MPReportsPage() {
  const { data: constituency } = useMPConstituency();
  const { data: financials } = useMPFinancials();
  const { data: projectsData } = useMPProjects({ limit: 500 });
  const { data: demandData } = useMPDemandClusters();

  const [selectedType, setSelectedType] = useState<string>('PROGRESS');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const projects = projectsData?.data ?? [];
  const demandClusters = (selectedSector
    ? demandData?.data.filter((d) => d.sector === selectedSector)
    : demandData?.data) ?? [];
  const bySector = (selectedSector
    ? financials?.bySector.filter((s) => s.sector === selectedSector)
    : financials?.bySector) ?? [];

  const buildReport = () => {
    switch (selectedType) {
      case 'FINANCIAL':
        return {
          title: 'Constituency Financial Summary',
          metrics: [
            { label: 'Total Sanctioned', value: financials?.totalSanctioned ?? null, format: 'currency' as const },
            { label: 'Total Released', value: financials?.totalReleased ?? null, format: 'currency' as const },
            { label: 'Total Spent', value: financials?.totalSpent ?? null, format: 'currency' as const },
            { label: 'Utilization', value: financials?.utilizationPercent ?? null, format: 'percent' as const },
          ],
          table: {
            columns: [
              { key: 'sector', header: 'Sector' },
              { key: 'sanctioned', header: 'Sanctioned', align: 'right' as const, format: 'currency' as const },
              { key: 'spent', header: 'Spent', align: 'right' as const, format: 'currency' as const },
              { key: 'utilization', header: 'Utilization %', align: 'right' as const, format: 'percent' as const },
            ],
            rows: bySector.map((s): ReportRow => ({ ...s })),
            emptyMessage: 'No sector-wise financial data available yet.',
          },
        };
      case 'DEMAND':
        return {
          title: 'Development Demand Report',
          metrics: [
            { label: 'Demand Clusters', value: demandClusters.length, format: 'number' as const },
            { label: 'Total Requests', value: demandClusters.reduce((sum, d) => sum + d.requestCount, 0), format: 'number' as const },
          ],
          table: {
            columns: [
              { key: 'location', header: 'Location' },
              { key: 'sector', header: 'Sector' },
              { key: 'requestCount', header: 'Requests', align: 'right' as const, format: 'number' as const },
              { key: 'intensity', header: 'Priority' },
              { key: 'primaryIssue', header: 'Primary Issue' },
            ],
            rows: demandClusters.map((d): ReportRow => ({
              id: d.id,
              location: d.location,
              sector: d.sector,
              requestCount: d.requestCount,
              intensity: d.intensity,
              primaryIssue: d.primaryIssue,
            })),
            emptyMessage: 'No citizen demand clusters recorded yet.',
          },
        };
      case 'SECTOR': {
        const countBySector = new Map((constituency?.bySectorCount ?? []).map((s) => [s.sector, s.count]));
        return {
          title: 'Sector Performance Summary',
          metrics: [
            { label: 'Sectors Covered', value: bySector.length, format: 'number' as const },
          ],
          table: {
            columns: [
              { key: 'sector', header: 'Sector' },
              { key: 'projects', header: 'Projects', align: 'right' as const, format: 'number' as const },
              { key: 'sanctioned', header: 'Sanctioned', align: 'right' as const, format: 'currency' as const },
              { key: 'spent', header: 'Spent', align: 'right' as const, format: 'currency' as const },
              { key: 'utilization', header: 'Utilization %', align: 'right' as const, format: 'percent' as const },
            ],
            rows: bySector.map((s): ReportRow => ({ ...s, projects: countBySector.get(s.sector) ?? 0 })),
            emptyMessage: 'No sector-wise data available yet.',
          },
        };
      }
      case 'PROGRESS':
      default:
        return {
          title: 'Constituency Progress Report',
          metrics: [
            { label: 'Total Projects', value: constituency?.totalProjects ?? null, format: 'number' as const },
            { label: 'Completed', value: constituency?.completedProjects ?? null, format: 'number' as const },
            { label: 'In Progress', value: constituency?.inProgressProjects ?? null, format: 'number' as const },
            { label: 'Needs Attention', value: constituency?.attentionNeeded ?? null, format: 'number' as const },
          ],
          table: {
            columns: [
              { key: 'name', header: 'Project' },
              { key: 'sector', header: 'Sector' },
              { key: 'district', header: 'District' },
              { key: 'status', header: 'Status' },
              { key: 'sanctionedAmount', header: 'Sanctioned', align: 'right' as const, format: 'currency' as const },
              { key: 'progressPercent', header: 'Progress %', align: 'right' as const, format: 'percent' as const },
            ],
            rows: projects.map((p): ReportRow => ({ ...p })),
            emptyMessage: 'No projects recorded for your constituency yet.',
          },
        };
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const report = buildReport();
      const filenameBase = `MP-${selectedType}-Report-${new Date().toISOString().slice(0, 10)}`;

      if (selectedFormat === 'PDF') {
        const { generateTableReportPdf } = await import('@/lib/pdf');
        const filename = await generateTableReportPdf({
          title: report.title,
          metrics: report.metrics,
          table: report.table,
        });
        setGeneratedFile(filename);
      } else if (selectedFormat === 'CSV') {
        downloadCsv(`${filenameBase}.csv`, report.table.columns, report.table.rows);
        setGeneratedFile(`${filenameBase}.csv`);
      } else {
        downloadJson(`${filenameBase}.json`, { title: report.title, metrics: report.metrics, rows: report.table.rows });
        setGeneratedFile(`${filenameBase}.json`);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentReportType = REPORT_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <FileText className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Reports Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate constituency project reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Select Report Type</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      selectedType === type.id
                        ? 'border-vojas-500 bg-vojas-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', type.bgColor)}>
                        <type.icon className={cn('h-5 w-5', type.color)} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{type.label}</h3>
                        <p className="text-xs text-slate-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Report Options */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Report Options</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Sector Filter (for sector- and demand-specific reports) */}
              {(selectedType === 'SECTOR' || selectedType === 'DEMAND') && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    Sector
                  </label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                  >
                    <option value="">All Sectors</option>
                    {Object.entries(SECTOR_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Export Format</label>
                <div className="flex gap-3">
                  {(['PDF', 'CSV', 'JSON'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={cn(
                        'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                        selectedFormat === format
                          ? 'border-vojas-500 bg-vojas-50 text-vojas-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  leftIcon={isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                >
                  {isGenerating ? 'Generating Report...' : 'Generate Report'}
                </Button>
              </div>

              {/* Confirmation — the file has already been saved to the
                  browser's downloads by this point, there is nothing left
                  to click; a second "Download" button would do nothing. */}
              {generatedFile && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-800">Report downloaded</p>
                      <p className="text-xs text-emerald-600">{generatedFile}</p>
                    </div>
                  </div>
                </div>
              )}
              {generateError && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">Could not generate report</p>
                  <p className="text-xs text-red-600 mt-0.5">{generateError}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Report Type Preview */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Report Preview</h3>
            </CardHeader>
            <CardBody>
              {currentReportType && (
                <div className="text-center">
                  <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4', currentReportType.bgColor)}>
                    <currentReportType.icon className={cn('h-8 w-8', currentReportType.color)} />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">{currentReportType.label}</h4>
                  <p className="text-sm text-slate-500 mb-4">{currentReportType.description}</p>
                  <div className="text-left p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                    <p className="font-medium mb-2">Report will include:</p>
                    <ul className="space-y-1">
                      {selectedType === 'PROGRESS' && (
                        <>
                          <li>• All project statuses</li>
                          <li>• Progress percentages</li>
                          <li>• Sanctioned amounts by project</li>
                          <li>• Sector &amp; district breakdown</li>
                        </>
                      )}
                      {selectedType === 'FINANCIAL' && (
                        <>
                          <li>• Budget allocations</li>
                          <li>• Expenditure details</li>
                          <li>• Utilization rates</li>
                          <li>• Sector-wise breakdown</li>
                        </>
                      )}
                      {selectedType === 'DEMAND' && (
                        <>
                          <li>• Citizen demand clusters by location</li>
                          <li>• Request counts per cluster</li>
                          <li>• Priority intensity</li>
                        </>
                      )}
                      {selectedType === 'SECTOR' && (
                        <>
                          <li>• Project counts by sector</li>
                          <li>• Sanctioned &amp; spent amounts</li>
                          <li>• Utilization rates</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Reports are generated and downloaded directly in the browser —
              nothing is stored server-side, so there is no report history
              to list here. */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">About These Reports</h3>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reports are generated on demand from your constituency&apos;s
                live data and downloaded directly to your device. Nothing is
                stored on the server, so previously generated reports are not
                listed here — regenerate a report at any time to get current
                figures.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Real, client-side CSV/JSON export — no backend endpoint needed for
// data the browser already has, and no fabricated reportId/downloadUrl. ──

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCsv(
  filename: string,
  columns: Array<{ key: string; header: string }>,
  rows: Array<Record<string, unknown>>
) {
  const lines = [
    columns.map((c) => csvEscape(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(',')),
  ];
  triggerDownload(filename, lines.join('\n'), 'text/csv;charset=utf-8;');
}

function downloadJson(filename: string, data: unknown) {
  triggerDownload(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8;');
}
