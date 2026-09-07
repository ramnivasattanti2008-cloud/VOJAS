'use client';

/**
 * MP Reports Center — M14
 * Generate constituency project reports.
 */

import { useState } from 'react';
import {
  FileText, Download, BarChart3, PieChart, TrendingUp,
  Users, Calendar, Building2, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
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
    description: 'Citizen demands and service gaps analysis',
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

// Recent reports (mock data)
const recentReports = [
  {
    id: '1',
    title: 'Q3 2026 Progress Report',
    type: 'PROGRESS',
    generatedAt: '2026-09-01T10:30:00Z',
    format: 'PDF',
    status: 'READY',
  },
  {
    id: '2',
    title: 'August Financial Summary',
    type: 'FINANCIAL',
    generatedAt: '2026-08-31T14:15:00Z',
    format: 'PDF',
    status: 'READY',
  },
  {
    id: '3',
    title: 'Rural Development Sector Analysis',
    type: 'SECTOR',
    generatedAt: '2026-08-25T09:00:00Z',
    format: 'CSV',
    status: 'READY',
  },
];

export default function MPReportsPage() {
  const { user } = useAuth();
  const mpId = (user as any)?.mpId ?? 'current-mp';

  const [selectedType, setSelectedType] = useState<string>('PROGRESS');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '2026-01-01',
    endDate: '2026-09-30',
  });
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGeneratedReport('report-' + Date.now() + '.pdf');
    setIsGenerating(false);
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
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">From</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange((r) => ({ ...r, startDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">To</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange((r) => ({ ...r, endDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sector Filter (for sector-specific reports) */}
              {selectedType === 'SECTOR' && (
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

              {/* Generated Report Download */}
              {generatedReport && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-800">Report Ready!</p>
                      <p className="text-xs text-emerald-600">{generatedReport}</p>
                    </div>
                    <Button size="sm" variant="secondary">
                      Download
                    </Button>
                  </div>
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
                          <li>• Timeline information</li>
                          <li>• Risk indicators</li>
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
                          <li>• Citizen demands</li>
                          <li>• Demand clusters</li>
                          <li>• Service gaps</li>
                          <li>• Geographic distribution</li>
                        </>
                      )}
                      {selectedType === 'SECTOR' && (
                        <>
                          <li>• Sector performance</li>
                          <li>• Project counts</li>
                          <li>• Financial summaries</li>
                          <li>• Trend analysis</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Recent Reports</h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {recentReports.map((report) => {
                  const typeInfo = REPORT_TYPES.find((t) => t.id === report.type);
                  return (
                    <div key={report.id} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded flex items-center justify-center', typeInfo?.bgColor)}>
                          <FileText className={cn('h-4 w-4', typeInfo?.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{report.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(report.generatedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">{report.format}</Badge>
                          <Button size="sm" variant="ghost">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
