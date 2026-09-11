'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { ArrowLeft, MapPin, AlertCircle, FileText, Activity, DollarSign, Layers, ShieldAlert, Sparkles, ArrowRight, BarChart2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { useProject } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils';

// Lazy-load heavy tab components to reduce initial bundle size
const SatelliteTab = nextDynamic(
  () => import('@/components/satellite/SatelliteTab').then((m) => m.SatelliteTab),
  { loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" />, ssr: false }
);
const ChangeAnalysisTab = nextDynamic(
  () => import('@/components/changeAnalysis/ChangeAnalysisTab').then((m) => m.ChangeAnalysisTab),
  { loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" />, ssr: false }
);
const ProjectDocumentsTab = nextDynamic(
  () => import('@/components/project/DocumentsTab').then((m) => m.ProjectDocumentsTab),
  { loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" />, ssr: false }
);
const FinancialTab = nextDynamic(
  () => import('@/components/project/FinancialTab').then((m) => m.FinancialTab),
  { loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-xl" />, ssr: false }
);

const projectsApi = createProjectsApi(apiClient);

type Tab = 'overview' | 'timeline' | 'financial' | 'documents' | 'satellite' | 'change' | 'risk';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'timeline', label: 'Timeline', icon: Activity },
  { key: 'financial', label: 'Financial', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: Layers },
  { key: 'satellite', label: 'Satellite', icon: MapPin },
  { key: 'change', label: 'Change Analysis', icon: BarChart2 },
  { key: 'risk', label: 'Intelligence', icon: ShieldAlert },
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { user } = useAuth();

  const { data: project, isLoading, error } = useProject(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Loading project...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/projects')}>
          Back to projects
        </Button>
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Project not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/projects')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="-ml-2 mb-2"
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          {project.description && (
            <p className="text-slate-500 text-sm mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{project.status}</Badge>
          <Link href={`/projects/${id}/time-machine`}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4" />}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Time Machine
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Project detail tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === t.key
                    ? 'border-vojas-600 text-vojas-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
                aria-current={activeTab === t.key ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels */}
      <div role="tabpanel" aria-label={`${activeTab} tab`}>
        {activeTab === 'overview' && <OverviewTab project={project} />}
        {activeTab === 'timeline' && <TimelineTab id={id} />}
        {activeTab === 'financial' && <FinancialTab projectId={id} />}
        {activeTab === 'documents' && <ProjectDocumentsTab projectId={id} />}
        {activeTab === 'satellite' && (
          <SatelliteTab
            projectId={id}
            lat={project.latitude ?? 0}
            lng={project.longitude ?? 0}
            projectName={project.name}
          />
        )}
        {activeTab === 'change' && (
          <ChangeAnalysisTab
            projectId={id}
            projectName={project.name}
            lat={project.latitude}
            lng={project.longitude}
            userRole={user?.role}
          />
        )}
        {activeTab === 'risk' && <IntelligenceTab projectId={id} />}
      </div>
    </div>
  );
}

function OverviewTab({ project }: { project: any }) {
  const hasCoords = project.latitude != null && project.longitude != null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Project Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Sector" value={project.sector} />
            <Field label="Status" value={project.status} />
            <Field label="State" value={project.state ?? '—'} />
            <Field label="District" value={project.district ?? '—'} />
            <Field label="Block" value={project.block ?? '—'} />
            <Field label="Constituency" value={project.constituency ?? '—'} />
            <Field label="Start Date" value={formatDate(project.startDate)} />
            <Field label="End Date" value={formatDate(project.endDate)} />
            <Field label="MP ID" value={project.mpId ?? '—'} />
            <Field label="Vendor ID" value={project.vendorId ?? '—'} />
            {hasCoords && (
              <>
                <Field label="Latitude" value={`${project.latitude.toFixed(5)}°`} />
                <Field label="Longitude" value={`${project.longitude.toFixed(5)}°`} />
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Location</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {hasCoords ? (
            <>
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                <iframe
                  title="Project location"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: 160 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${project.longitude - 0.01},${project.latitude - 0.01},${project.longitude + 0.01},${project.latitude + 0.01}&layer=mapnik&marker=${project.latitude},${project.longitude}`}
                />
              </div>
              <div className="text-xs font-mono text-slate-500 text-center">
                {project.latitude.toFixed(5)}°N, {project.longitude.toFixed(5)}°E
              </div>
            </>
          ) : (
            <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs">No coordinates</p>
              </div>
            </div>
          )}
          {project.district && project.state && (
            <p className="text-sm text-slate-600">
              {project.district}, {project.state}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function TimelineTab({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['projects', id, 'timeline'],
    queryFn: () => projectsApi.getTimeline(id),
  });

  if (isLoading) return <div className="text-slate-400 text-sm">Loading timeline...</div>;

  const events = data ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Project Timeline</h2>
      </CardHeader>
      {events.length === 0 ? (
        <CardBody>
          <p className="text-sm text-slate-400">No timeline events recorded yet.</p>
        </CardBody>
      ) : (
        <div className="divide-y divide-slate-100">
          {events.map((event) => (
            <div key={event.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-vojas-500 mt-2 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{event.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {event.eventType} · {formatDateTime(event.occurredAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FinancialTabSummary({ project }: { project: any }) {
  const items = [
    { label: 'Sanctioned Amount', value: project.sanctionedAmount },
    { label: 'Released Amount', value: project.releasedAmount },
    { label: 'Utilized Amount', value: project.utilizedAmount },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardBody>
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(item.value)}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

const SIGNAL_STATUS_STYLE: Record<string, { dot: string; badge: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  LOW: { dot: 'bg-green-500', badge: 'success' },
  MEDIUM: { dot: 'bg-amber-500', badge: 'warning' },
  HIGH: { dot: 'bg-red-500', badge: 'danger' },
  UNAVAILABLE: { dot: 'bg-slate-300', badge: 'neutral' },
};

const OVERALL_STATUS_LABEL: Record<string, string> = {
  LOW: 'No significant concerns',
  MEDIUM: 'Some signals require attention',
  HIGH: 'Multiple signals require investigation',
  UNAVAILABLE: 'Insufficient data',
};

function IntelligenceTab({ projectId }: { projectId: string }) {
  const { data: intel, isLoading, error } = useQuery({
    queryKey: ['projects', projectId, 'intelligence'],
    queryFn: () => projectsApi.getIntelligence(projectId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading intelligence...
      </div>
    );
  }

  if (error || !intel) {
    return (
      <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        {error instanceof Error ? error.message : 'Unable to load project intelligence.'}
      </div>
    );
  }

  const overall = SIGNAL_STATUS_STYLE[intel.overallStatus] ?? SIGNAL_STATUS_STYLE.UNAVAILABLE;

  return (
    <div className="space-y-6">
      {/* Overall status */}
      <Card>
        <CardBody className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={cn('w-3 h-3 rounded-full', overall.dot)} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {OVERALL_STATUS_LABEL[intel.overallStatus] ?? intel.overallStatus}
              </p>
              {intel.risk && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Risk score {intel.risk.score}/100 ({intel.risk.level}) · {intel.risk.confidence} confidence
                  {intel.risk.primaryDriver ? ` · primary driver: ${intel.risk.primaryDriver}` : ''}
                </p>
              )}
            </div>
          </div>
          {intel.openInvestigation && (
            <Badge variant="warning">
              Open investigation: {intel.openInvestigation.status.replace(/_/g, ' ')}
            </Badge>
          )}
        </CardBody>
      </Card>

      {/* Signal cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Signal Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {intel.signalCards.map((card) => {
            const style = SIGNAL_STATUS_STYLE[card.status] ?? SIGNAL_STATUS_STYLE.UNAVAILABLE;
            return (
              <Card key={card.key}>
                <CardBody>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500">{card.label}</p>
                    <Badge variant={style.badge}>{card.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{card.summary}</p>
                  {card.freshness.status !== 'UNAVAILABLE' && card.freshness.ageDays !== null && (
                    <p className="text-xs text-slate-400 mt-2">
                      {card.freshness.ageDays === 0 ? 'Current' : `${card.freshness.ageDays} day(s) old`}
                      {card.freshness.status === 'STALE' && ' · stale'}
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Why flagged */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Why This Matters</h3>
        </CardHeader>
        <CardBody className="space-y-1">
          {intel.whyFlagged.map((line, i) => (
            <p key={i} className={cn('text-sm', line === '' ? 'h-2' : 'text-slate-600')}>
              {line}
            </p>
          ))}
        </CardBody>
      </Card>

      {/* Cross-signal findings */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Cross-Signal Findings {intel.crossSignalFindings.length > 0 && `(${intel.crossSignalFindings.length})`}
        </h3>
        {intel.crossSignalFindings.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-slate-400 text-sm">
              No active cross-signal findings for this project.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {intel.crossSignalFindings.map((f) => (
              <Card key={f.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-slate-800 text-sm">{f.title}</h4>
                    <Badge variant={f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'danger' : f.severity === 'MEDIUM' ? 'warning' : 'info'}>
                      {f.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.description}</p>
                  {f.recommendedAction && (
                    <p className="text-xs text-vojas-700 mt-2 font-medium">Next: {f.recommendedAction}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {f.contributingSignalCount} contributing signal(s) · {f.confidence} confidence · {formatDate(f.detectedAt)}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recommended actions */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Recommended Next Actions</h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {intel.recommendedActions.map((a, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-vojas-500 shrink-0 mt-1" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Evidence summary */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">
            Evidence ({intel.evidenceSummary.total})
          </h3>
        </CardHeader>
        <CardBody>
          {intel.evidenceSummary.total === 0 ? (
            <p className="text-sm text-slate-400">No evidence recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(intel.evidenceSummary.byType).map(([type, count]) => (
                <Badge key={type} variant="neutral">
                  {type.replace(/_/g, ' ')}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {intel.activeAnomalies.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Active Anomalies ({intel.activeAnomalies.length})</h3>
          </CardHeader>
          <CardBody className="space-y-2">
            {intel.activeAnomalies.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-slate-600">{a.description}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function PlaceholderTab({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardBody className="py-16 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-4">
          <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</p>
      </CardBody>
    </Card>
  );
}
