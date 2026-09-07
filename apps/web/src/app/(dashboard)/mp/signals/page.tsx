'use client';

/**
 * MP Citizen Signals — M14
 * View and manage citizen reports, claims, and feedback.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, X,
  MapPin, MessageSquare, ExternalLink, Eye, CheckCheck
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMPCitizenSignals } from '@/hooks/useMP';
import { useAuth } from '@/hooks/useAuth';
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

interface Signal {
  id: string;
  type: 'REPORT' | 'CLAIM' | 'FEEDBACK';
  title: string;
  description: string;
  location: string;
  sector: string;
  status: string;
  submittedAt: string;
  projectId?: string;
  projectName?: string;
}

const SIGNAL_TYPES: SignalTypeConfig[] = [
  { id: 'REPORT', label: 'Report', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
  { id: 'CLAIM', label: 'Claim', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'FEEDBACK', label: 'Feedback', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
];

const SIGNAL_STATUSES: SignalStatusConfig[] = [
  { id: 'SUBMITTED', label: 'Submitted', variant: 'neutral' },
  { id: 'REVIEWING', label: 'Under Review', variant: 'info' },
  { id: 'VERIFIED', label: 'Verified', variant: 'success' },
  { id: 'ESCALATED', label: 'Escalated', variant: 'danger' },
  { id: 'RESOLVED', label: 'Resolved', variant: 'success' },
];

const mockSignals: Signal[] = [
  { id: '1', type: 'REPORT', title: 'Road condition deteriorating', description: 'The road near Sector 5 has developed multiple potholes and is dangerous for commuters. Several accidents have been reported in the past month.', location: 'Sector 5, Main Road', sector: 'TRANSPORT', status: 'SUBMITTED', submittedAt: '2026-09-06T10:30:00Z', projectId: 'p1', projectName: 'NH-48 Road Widening' },
  { id: '2', type: 'CLAIM', title: 'Project not started as per schedule', description: 'The announced water supply project for Block B has not started even though 6 months have passed since the foundation stone ceremony.', location: 'Block B, Rural Area', sector: 'WATER_SANITATION', status: 'REVIEWING', submittedAt: '2026-09-05T14:15:00Z', projectId: 'p2', projectName: 'Rural Water Supply Scheme' },
  { id: '3', type: 'FEEDBACK', title: 'Construction quality concerns', description: 'The newly built school building shows signs of poor construction. Walls have cracks and the paint is already peeling off.', location: 'Township Primary School', sector: 'EDUCATION', status: 'VERIFIED', submittedAt: '2026-09-04T09:00:00Z', projectId: 'p3', projectName: 'School Infrastructure Upgrade' },
  { id: '4', type: 'REPORT', title: 'Healthcare facility understaffed', description: 'The primary health center in our area is severely understaffed. Only one doctor is available for the entire population of 10,000+ residents.', location: 'PHC, District HQ', sector: 'HEALTH', status: 'ESCALATED', submittedAt: '2026-09-03T16:45:00Z', projectId: 'p4', projectName: 'PHC Strengthening' },
  { id: '5', type: 'CLAIM', title: 'Delay in fund release', description: 'Despite government approval, the funds for our village drainage project have not been released for 3 months now.', location: 'Gram Panchayat D', sector: 'PUBLIC_ADMIN', status: 'SUBMITTED', submittedAt: '2026-09-02T11:20:00Z' },
  { id: '6', type: 'FEEDBACK', title: 'Solar panel installation completed', description: 'The solar street light installation project has been completed successfully. All 50 lights are working and the village is satisfied.', location: 'Village A', sector: 'ENERGY', status: 'RESOLVED', submittedAt: '2026-08-28T08:30:00Z', projectId: 'p6', projectName: 'Solar Street Lighting' },
  { id: '7', type: 'REPORT', title: 'Bridge safety concerns', description: 'The old bridge connecting two villages has developed structural cracks. Heavy vehicles should be restricted immediately.', location: 'Village Connector Bridge', sector: 'TRANSPORT', status: 'REVIEWING', submittedAt: '2026-08-25T13:00:00Z', projectId: 'p7', projectName: 'Bridge Repair Work' },
  { id: '8', type: 'CLAIM', title: 'Land dispute affecting project', description: 'The affordable housing project is stuck due to an ongoing land dispute. Neither the district administration nor the developer has provided any clarity.', location: 'Affordable Housing Site', sector: 'HOUSING', status: 'ESCALATED', submittedAt: '2026-08-20T10:15:00Z', projectId: 'p8', projectName: 'PM Awas Yojana' },
];

export default function MPSignalsPage() {
  const { user } = useAuth();
  const mpId = (user as { mpId?: string } | null)?.mpId ?? 'current-mp';
  useMPCitizenSignals(mpId, { limit: 50 });

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const signals = mockSignals;

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (filterType && s.type !== filterType) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterSector && s.sector !== filterSector) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.location.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [signals, filterType, filterStatus, filterSector, searchQuery]);

  const stats = useMemo(() => ({
    total: signals.length,
    reports: signals.filter((s) => s.type === 'REPORT').length,
    claims: signals.filter((s) => s.type === 'CLAIM').length,
    feedback: signals.filter((s) => s.type === 'FEEDBACK').length,
    pending: signals.filter((s) => s.status === 'SUBMITTED').length,
    escalated: signals.filter((s) => s.status === 'ESCALATED').length,
  }), [signals]);

  const clearFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterSector('');
    setSearchQuery('');
  };

  const hasFilters = !!(filterType || filterStatus || filterSector || searchQuery);

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
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-slate-500">Reports</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.reports}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-slate-500">Claims</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.claims}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-slate-500">Feedback</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.feedback}</p>
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vojas-500"
            >
              <option value="">All Types</option>
              {SIGNAL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

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
            {filteredSignals.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No signals match your filters</p>
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
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {signal.location}
                          </span>
                          <Badge variant="neutral">{SECTOR_LABELS[signal.sector as ProjectSector] ?? signal.sector}</Badge>
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

                      <div className="flex flex-col gap-2 shrink-0">
                        {signal.status === 'SUBMITTED' && (
                          <Button variant="secondary" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {signal.status === 'REVIEWING' && (
                          <Button variant="secondary" size="sm">
                            <CheckCheck className="h-3 w-3" />
                          </Button>
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
