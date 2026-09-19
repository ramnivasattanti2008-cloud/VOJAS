'use client';

/**
 * MP Citizen Signals — M14
 * View real citizen reports linked to constituency projects.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, X,
  MapPin, ExternalLink
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMPCitizenSignals } from '@/hooks/useMP';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ProjectSector } from '@vojas/shared';

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

interface SignalTypeConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface SignalStatusConfig {
  id: string;
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

// Every row here is a real citizen Report (see GET /mp/me/signals) — there
// is no CLAIM/FEEDBACK source in the schema, so only the one real type is
// offered rather than implying categories that never populate.
const SIGNAL_TYPES: SignalTypeConfig[] = [
  { id: 'REPORT', label: 'Report', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
];

// Covers every real ReportStatus enum value, not just a simplified subset —
// an unmapped status would otherwise silently render as "Submitted".
const SIGNAL_STATUSES: SignalStatusConfig[] = [
  { id: 'SUBMITTED', label: 'Submitted', variant: 'neutral' },
  { id: 'RECEIVED', label: 'Received', variant: 'neutral' },
  { id: 'ASSIGNED', label: 'Assigned', variant: 'info' },
  { id: 'TRIAGED', label: 'Triaged', variant: 'info' },
  { id: 'PROJECT_MATCHED', label: 'Project Matched', variant: 'info' },
  { id: 'REVIEW_QUEUE', label: 'Review Queue', variant: 'info' },
  { id: 'UNDER_VERIFICATION', label: 'Under Verification', variant: 'info' },
  { id: 'VERIFIED', label: 'Verified', variant: 'success' },
  { id: 'ESCALATED', label: 'Escalated', variant: 'danger' },
  { id: 'RESOLVED', label: 'Resolved', variant: 'success' },
  { id: 'DISMISSED', label: 'Dismissed', variant: 'neutral' },
];

export default function MPSignalsPage() {
  const { data, isLoading } = useMPCitizenSignals({ limit: 100 });

  const [filterStatus, setFilterStatus] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const signals = useMemo(() => data?.data ?? [], [data]);

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterSector && s.sector !== filterSector) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          (s.location ?? '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [signals, filterStatus, filterSector, searchQuery]);

  // Total/Pending come from the API's exact counts (not limited to this
  // page's fetch size); the rest are real but scoped to the fetched batch.
  const stats = useMemo(() => ({
    total: data?.total ?? 0,
    pending: data?.pendingCount ?? 0,
    escalated: signals.filter((s) => s.status === 'ESCALATED').length,
    resolved: signals.filter((s) => s.status === 'RESOLVED').length,
  }), [data, signals]);

  const clearFilters = () => {
    setFilterStatus('');
    setFilterSector('');
    setSearchQuery('');
  };

  const hasFilters = !!(filterStatus || filterSector || searchQuery);

  const getSignalTypeConfig = (type: string): SignalTypeConfig => {
    return SIGNAL_TYPES.find((t) => t.id === type) ?? SIGNAL_TYPES[0];
  };

  const getSignalStatusConfig = (status: string): SignalStatusConfig => {
    return SIGNAL_STATUSES.find((s) => s.id === status) ?? SIGNAL_STATUSES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Activity className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Citizen Signals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reports, claims, and feedback from constituency residents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-slate-600" />
              <span className="text-xs text-slate-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-slate-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-slate-500">Escalated</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.escalated}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-slate-500">Resolved</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="search"
                placeholder="Search signals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="">All Status</option>
              {SIGNAL_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="">All Sectors</option>
              {Object.entries(SECTOR_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X className="h-3 w-3" />}>
                Clear
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Signal Feed
              <span className="text-sm font-normal text-slate-500 ml-2">
                {filteredSignals.length} signals
              </span>
            </h2>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredSignals.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{signals.length === 0 ? 'No citizen reports linked to your projects yet' : 'No signals match your filters'}</p>
              </div>
            ) : (
              filteredSignals.map((signal) => {
                const typeConfig = getSignalTypeConfig(signal.type);
                const statusConfig = getSignalStatusConfig(signal.status);
                const TypeIcon = typeConfig.icon;

                return (
                  <div key={signal.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeConfig.bgColor)}>
                        <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">{signal.title}</h3>
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{signal.description}</p>
                          </div>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <Badge variant="neutral">{typeConfig.label}</Badge>
                          {signal.location && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="h-3 w-3" />
                              {signal.location}
                            </span>
                          )}
                          {signal.sector && (
                            <Badge variant="neutral">{SECTOR_LABELS[signal.sector as ProjectSector] ?? signal.sector}</Badge>
                          )}
                          <span className="text-slate-400">
                            {new Date(signal.submittedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {signal.projectName && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <Link href={`/projects/${signal.projectId}`} className="text-vojas-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {signal.projectName}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
