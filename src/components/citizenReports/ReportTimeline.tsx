'use client';

import { useState } from 'react';
import { MessageSquare, CheckCircle, Clock, AlertCircle, Filter } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '@vojas/api-client';
import { formatDate, formatDateTime } from '@/lib/utils';

interface Report {
  id: string;
  reportReference: string;
  title: string;
  category: string;
  status: string;
  submittedAt: string;
  privacyLevel: string;
  isAnonymous: boolean;
}

interface ReportTimelineProps {
  reports: Report[];
  projectId: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  SUBMITTED: 'info',
  RECEIVED: 'info',
  TRIAGED: 'info',
  PROJECT_MATCHED: 'info',
  REVIEW_QUEUE: 'warning',
  UNDER_VERIFICATION: 'warning',
  VERIFIED: 'success',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
  ESCALATED: 'danger',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  SUBMITTED: <MessageSquare className="h-4 w-4" />,
  RECEIVED: <MessageSquare className="h-4 w-4" />,
  TRIAGED: <Clock className="h-4 w-4" />,
  PROJECT_MATCHED: <Clock className="h-4 w-4" />,
  REVIEW_QUEUE: <Clock className="h-4 w-4" />,
  UNDER_VERIFICATION: <AlertCircle className="h-4 w-4" />,
  VERIFIED: <CheckCircle className="h-4 w-4" />,
  RESOLVED: <CheckCircle className="h-4 w-4" />,
  DISMISSED: <Clock className="h-4 w-4" />,
  ESCALATED: <AlertCircle className="h-4 w-4" />,
};

export function ReportTimeline({ reports, projectId }: ReportTimelineProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredReports = statusFilter
    ? reports.filter((r) => r.status === statusFilter)
    : reports;

  // Group reports by month/year for timeline display
  const groupedReports = filteredReports.reduce<Record<string, Report[]>>((acc, report) => {
    const date = new Date(report.submittedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(report);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));

  const uniqueStatuses = [...new Set(reports.map((r) => r.status))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-500" />
            Citizen Reports Timeline
          </h3>
          <Button
            variant={showFilters ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
            leftIcon={<Filter className="h-4 w-4" />}
          >
            Filter
          </Button>
        </div>
        {showFilters && (
          <div className="mt-3">
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {REPORT_STATUS_LABELS[status] || status}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>
      <CardBody>
        {filteredReports.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600">
              {statusFilter ? 'No reports match the selected filter.' : 'No citizen reports for this project.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map((month) => {
              const [year, monthNum] = month.split('-');
              const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              });
              const monthReports = groupedReports[month];

              return (
                <div key={month}>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {monthName}
                  </h4>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />

                    <div className="space-y-4">
                      {monthReports
                        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                        .map((report) => (
                          <div key={report.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div
                              className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                STATUS_VARIANT[report.status] === 'success'
                                  ? 'bg-green-100 text-green-600'
                                  : STATUS_VARIANT[report.status] === 'warning'
                                  ? 'bg-amber-100 text-amber-600'
                                  : STATUS_VARIANT[report.status] === 'danger'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              {STATUS_ICONS[report.status] || <MessageSquare className="h-4 w-4" />}
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-slate-900">{report.title}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs text-slate-500 font-mono">
                                      {report.reportReference}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {REPORT_CATEGORY_LABELS[report.category] || report.category}
                                    </span>
                                    {report.isAnonymous ? (
                                      <Badge variant="neutral" className="text-xs">Anonymous</Badge>
                                    ) : (
                                      <span className="text-xs text-slate-500">
                                        {formatDate(report.submittedAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant={STATUS_VARIANT[report.status] ?? 'neutral'}
                                  className="shrink-0"
                                >
                                  {REPORT_STATUS_LABELS[report.status] || report.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
