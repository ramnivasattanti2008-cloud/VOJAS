'use client';

import { useState } from 'react';
import { Search, AlertTriangle, ShieldAlert, ShieldCheck, Filter, X } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAnomalies, useAnomalyStats } from '@/hooks/useAnomalies';
import { formatDate } from '@/lib/utils';

const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  OPEN: 'danger',
  ACKNOWLEDGED: 'warning',
  UNDER_INVESTIGATION: 'warning',
  RESOLVED: 'success',
  ESCALATED: 'info',
  DISMISSED: 'neutral',
};

export default function AnomaliesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useAnomalies({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    limit: 50,
  });
  const { data: stats } = useAnomalyStats();

  const anomalies = data?.data ?? [];
  const total = data?.total ?? 0;

  const openCount = stats?.byStatus?.find((s) => s.status === 'OPEN')?._count?._all ?? 0;
  const criticalCount = stats?.bySeverity?.find((s) => s.severity === 'CRITICAL')?._count?._all ?? 0;
  const escalatedCount = stats?.byStatus?.find((s) => s.status === 'ESCALATED')?._count?._all ?? 0;

  const hasFilters = !!(statusFilter || severityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Anomalies</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading...' : `${total} anomalies found`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{openCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Open</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{criticalCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Critical</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{escalatedCount}</p>
              <p className="text-sm text-slate-500 mt-0.5">Escalated</p>
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
            placeholder="Search anomalies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
            aria-label="Search anomalies"
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
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ESCALATED">Escalated</option>
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
          {error instanceof Error ? error.message : 'Failed to load anomalies'}
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
      ) : anomalies.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <ShieldCheck className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No anomalies found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'All systems clean'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {anomalies
            .filter((a) =>
              search
                ? a.title.toLowerCase().includes(search.toLowerCase()) ||
                  a.description.toLowerCase().includes(search.toLowerCase())
                : true
            )
            .map((a) => (
              <Card key={a.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{a.title}</h3>
                        <Badge variant={SEVERITY_VARIANT[a.severity] ?? 'neutral'}>{a.severity}</Badge>
                        <Badge variant={STATUS_VARIANT[a.status] ?? 'neutral'}>{a.status.replace(/_/g, ' ')}</Badge>
                        {a.lawEscalation && <Badge variant="info">Law Enf.</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{a.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="font-mono">{a.category.replace(/_/g, ' ')}</span>
                        {a.project && <span>→ {a.project.name}</span>}
                        <span>{formatDate(a.createdAt)}</span>
                        {a.riskScore != null && <span className="font-medium">Risk: {a.riskScore}</span>}
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
