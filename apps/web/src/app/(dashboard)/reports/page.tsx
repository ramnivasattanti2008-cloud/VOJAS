'use client';

import { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, Search, Filter, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useReports } from '@/hooks/useReports';
import { formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  ASSIGNED: 'warning',
  INVESTIGATING: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useReports({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    limit: 50,
  });

  const reports = data?.data ?? [];
  const total = data?.total ?? 0;

  const submittedCount = reports.filter((r) => r.status === 'SUBMITTED').length;
  const investigatingCount = reports.filter(
    (r) => r.status === 'ASSIGNED' || r.status === 'INVESTIGATING' || r.status === 'UNDER_REVIEW'
  ).length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  const hasFilters = !!(statusFilter || severityFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Citizen Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading...' : `${total} reports found`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{submittedCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Submitted</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{investigatingCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">In Progress</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{resolvedCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Resolved</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search reports"
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setSeverityFilter('');
            }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Severity</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </CardBody>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load reports'}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-2/3" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No reports found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'No reports submitted yet'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports
            .filter((r) =>
              search
                ? r.title.toLowerCase().includes(search.toLowerCase()) ||
                  r.description.toLowerCase().includes(search.toLowerCase())
                : true
            )
            .map((r) => (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{r.title}</h3>
                        <Badge variant={SEVERITY_VARIANT[r.severity] ?? 'neutral'}>{r.severity}</Badge>
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>
                          {r.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono">{r.category.replace(/_/g, ' ')}</span>
                        {r.project && <span>→ {r.project.name}</span>}
                        {r.assignedTo && <span>Assigned: {r.assignedTo.name}</span>}
                        {r.locationDesc && <span>📍 {r.locationDesc}</span>}
                        <span>{formatDate(r.createdAt)}</span>
                        {r.isAnonymous && <Badge variant="neutral">Anonymous</Badge>}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
