'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Bell, CheckCircle, ChevronRight, Filter, X,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useRiskFindings,
  useUpdateFindingStatus,
} from '@/hooks/useRisk';
import { formatDate } from '@/lib/utils';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const SEVERITY_BG: Record<string, string> = {
  LOW: 'bg-slate-50 text-slate-500',
  MEDIUM: 'bg-amber-50 text-amber-500',
  HIGH: 'bg-orange-50 text-orange-500',
  CRITICAL: 'bg-red-50 text-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  VERIFICATION_REQUIRED: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-slate-100 text-slate-700',
  ESCALATED: 'bg-red-100 text-red-700',
};

export default function AlertsPage() {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useRiskFindings(undefined, {
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  const updateStatus = useUpdateFindingStatus();

  const findings = data?.findings ?? [];
  const total = data?.total ?? 0;
  const hasFilters = !!(severityFilter || statusFilter !== 'NEW');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading...' : `${total} ${statusFilter?.toLowerCase().replace(/_/g, ' ')} findings`}
        </p>
      </div>

      {/* Status tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { key: 'NEW', label: 'New', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
          { key: 'ACKNOWLEDGED', label: 'Acknowledged', icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
          { key: 'UNDER_REVIEW', label: 'Under Review', icon: ArrowUpRight, color: 'text-purple-500', bg: 'bg-purple-50' },
          { key: 'VERIFICATION_REQUIRED', label: 'Verification', icon: ChevronRight, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map(({ key, label, icon: Icon, color, bg }) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${
              statusFilter === key ? 'ring-2 ring-vojas-400 border-vojas-400' : 'hover:border-vojas-300'
            }`}
            onClick={() => setStatusFilter(key === statusFilter ? 'NEW' : key)}
          >
            <CardBody className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{isLoading ? '—' : total}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
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
            onClick={() => { setSeverityFilter(''); setStatusFilter('NEW'); }}
            leftIcon={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Severity</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200"
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
        </Card>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load alerts'}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-50 rounded animate-pulse w-1/2" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : findings.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-400" />
            <p className="text-sm font-semibold text-slate-600">No alerts found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'All clear — no active alerts'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {findings.map((f) => (
            <Card key={f.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{f.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[f.severity] ?? 'bg-slate-100 text-slate-700'}`}>
                        {f.severity}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[f.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {f.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{f.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {f.project && (
                        <button
                          className="text-vojas-600 hover:underline"
                          onClick={() => router.push(`/projects/${f.projectId}`)}
                        >
                          {f.project.name}
                        </button>
                      )}
                      <span>Risk: {f.riskScore}/100</span>
                      <span>Confidence: {f.confidence}</span>
                      <span>{formatDate(f.detectedAt)}</span>
                    </div>
                    {f.recommendedAction && (
                      <p className="text-xs text-blue-600 mt-1 italic">
                        &rarr; {f.recommendedAction}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {f.status === 'NEW' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          updateStatus.mutate({
                            findingId: f.id,
                            params: { status: 'ACKNOWLEDGED' },
                          })
                        }
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      rightIcon={<ChevronRight className="h-3 w-3" />}
                      onClick={() => router.push(`/projects/${f.projectId}?tab=risk`)}
                    >
                      View
                    </Button>
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
