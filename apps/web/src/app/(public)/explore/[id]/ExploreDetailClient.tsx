'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Activity,
  DollarSign,
  FileText,
  Satellite,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { usePublicProject, usePublicProjectTimeline, usePublicProjectRisk } from '@/hooks/usePublicProjects';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { SourcePanel } from '@/components/transparency/SourcePanel';
import { PublicMoneyView } from '@/components/transparency/PublicMoneyView';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { PublicProjectDetail } from '@vojas/api-client';

type Tab = 'overview' | 'financial' | 'timeline' | 'risk' | 'satellite';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'financial', label: 'Finance', icon: DollarSign },
  { key: 'timeline', label: 'Evidence & Timeline', icon: Activity },
  { key: 'risk', label: 'Risk', icon: ShieldAlert },
  { key: 'satellite', label: 'Satellite', icon: Satellite },
];

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'> = {
  COMPLETED: 'success',
  VERIFIED: 'success',
  IN_PROGRESS: 'info',
  APPROVED: 'primary',
  SANCTIONED: 'primary',
  CANCELLED: 'danger',
  UNSANCTIONED: 'neutral',
  PROPOSED: 'neutral',
};

const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

export function ExploreDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: project, isLoading, isError } = usePublicProject(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-vojas-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-slate-400">Loading project…</p>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4">
        <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
        <Card>
          <CardBody>
            <div className="text-center py-12 text-slate-500">
              <p className="font-medium">Project not found</p>
              <p className="text-sm text-slate-400 mt-1">
                This project does not exist, or is not available for public viewing.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 -ml-1 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>{project.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="neutral">{project.sector.replace(/_/g, ' ')}</Badge>
              <span className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[project.district, project.state].filter(Boolean).join(', ') || 'Location not available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <InformationClassificationBanner />

      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Project sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-vojas-600 text-vojas-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && <OverviewTab project={project} />}
      {activeTab === 'financial' && <FinancialTab project={project} />}
      {activeTab === 'timeline' && <TimelineTab projectId={id} />}
      {activeTab === 'risk' && <RiskTab projectId={id} active={activeTab === 'risk'} />}
      {activeTab === 'satellite' && <SatelliteTab projectId={id} />}

      <SourcePanel lastUpdated={project.updatedAt} className="mt-8" />
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function OverviewTab({ project }: { project: PublicProjectDetail }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Project Details</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <DetailField label="Sector" value={project.sector.replace(/_/g, ' ')} />
            <DetailField label="State" value={project.state || 'Not available'} />
            <DetailField label="District" value={project.district || 'Not available'} />
            <DetailField label="Constituency" value={project.constituency || 'Not available'} />
            <DetailField label="Contractor" value={project.contractor || 'Not available'} />
            <DetailField label="Data Source" value={project.source.replace(/_/g, ' ')} />
            <DetailField label="Start Date" value={formatDate(project.startDate)} />
            <DetailField label="Expected Completion" value={formatDate(project.expectedEndDate)} />
            <DetailField label="Completed On" value={formatDate(project.completedAt)} />
          </div>
        </CardBody>
      </Card>

      {project.description && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800">Description</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Citizen Reports</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800">{project.reportCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {project.reportCount === 1 ? 'report submitted' : 'reports submitted'} about this project
              </p>
            </div>
            <Link href={`/report?projectId=${project.id}`}>
              <Button variant="secondary" size="sm">Submit a Report</Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
            Reporter identities are protected. Individual report details are not disclosed publicly.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function FinancialTab({ project }: { project: PublicProjectDetail }) {
  return (
    <div className="space-y-5">
      <PublicMoneyView approvedAmount={project.approvedAmount} spentAmount={project.spentAmount} />
      {project.approvedAmount > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Fund Utilization Rate</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {((project.spentAmount / project.approvedAmount) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Unspent Balance</p>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {formatCurrency(project.approvedAmount - project.spentAmount)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function TimelineTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = usePublicProjectTimeline(projectId);
  const events = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-800">Evidence &amp; Timeline</h2>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No recorded events available for this project yet.
          </div>
        ) : (
          <ol className="space-y-4">
            {events.map((e) => (
              <li key={e.id} className="border-l-2 border-slate-200 pl-4 relative">
                <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-vojas-500" />
                <p className="text-sm font-medium text-slate-700">{e.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(e.eventDate)} · {e.eventType.replace(/_/g, ' ')} · Source: {e.source}
                  {e.sourceUrl && (
                    <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-vojas-600 hover:underline">
                      view source
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function RiskTab({ projectId, active }: { projectId: string; active: boolean }) {
  const { data, isLoading } = usePublicProjectRisk(projectId, active);
  const findings = data?.findings ?? [];

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          {data?.disclaimer ?? 'AI-assisted risk findings are signals for human review, not proof of wrongdoing.'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
      ) : findings.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8 text-slate-400 text-sm">No active risk findings for this project.</div>
          </CardBody>
        </Card>
      ) : (
        findings.map((f) => (
          <Card key={f.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-800 text-sm">{f.title}</h3>
                <Badge variant={SEVERITY_VARIANT[f.severity] ?? 'neutral'}>{f.severity}</Badge>
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.description}</p>
              {f.limitations && (
                <p className="text-xs text-slate-400 mt-2">Limitations: {f.limitations}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">
                Detected {formatDate(f.detectedAt)} · Confidence: {f.confidence} · Status: {f.status.replace(/_/g, ' ')}
              </p>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}

function SatelliteTab({ projectId }: { projectId: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Satellite Observations</h2>
          <span className="text-xs text-slate-400 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">AI-INTERPRETED</span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Satellite className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">Satellite source unavailable</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            VOJAS uses Copernicus Sentinel-2 imagery via CDSE for satellite change analysis. This
            source is not currently configured, so no satellite comparison is shown for this
            project. This is stated explicitly rather than estimated.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
