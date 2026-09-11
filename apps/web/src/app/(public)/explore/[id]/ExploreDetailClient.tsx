'use client';

import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { PublicMoneyView } from '@/components/transparency/PublicMoneyView';
import { SourcePanel } from '@/components/transparency/SourcePanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import {
    usePublicProject,
    usePublicProjectEvidence,
    usePublicProjectReports,
    usePublicProjectRisk,
    usePublicProjectTimeline,
} from '@/hooks/usePublicProjects';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PublicProjectDetail } from '@vojas/api-client';
import {
    Activity,
    ArrowLeft,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Loader2,
    MapPin,
    MessageSquare,
    Satellite,
    ShieldAlert,
    Sparkles,
    UserCheck,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

const SatelliteTab = dynamic(
  () => import('@/components/satellite/SatelliteTab').then((m) => m.SatelliteTab),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-vojas-500" /> Loading Satellite Telemetry…
      </div>
    ),
    ssr: false,
  }
);

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

  const isDone = project.status === 'COMPLETED' || project.status === 'VERIFIED';
  const progressPercent =
    project.approvedAmount > 0
      ? Math.min(100, Math.round((project.spentAmount / project.approvedAmount) * 100))
      : isDone
      ? 100
      : 0;

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
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              {isDone ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  STATUS: DONE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  STATUS: NOT DONE
                </span>
              )}
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                {progressPercent}% Complete
              </span>
              {project.projectRisk && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs',
                    project.projectRisk.riskLevel === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : project.projectRisk.riskLevel === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : project.projectRisk.riskLevel === 'MEDIUM'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI RISK: {project.projectRisk.riskScore}/100 ({project.projectRisk.riskLevel})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>{project.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="neutral">{project.sector.replace(/_/g, ' ')}</Badge>
              <span className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[project.district, project.state].filter(Boolean).join(', ') || 'Location not available'}
              </span>
              {project.latitude != null && project.longitude != null && (
                <Link
                  href={`/explore/map?focus=${project.id}`}
                  className="text-sm font-medium text-vojas-600 hover:underline"
                >
                  View on Map →
                </Link>
              )}
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
      {activeTab === 'timeline' && <TimelineTab projectId={id} active={activeTab === 'timeline'} />}
      {activeTab === 'risk' && <RiskTab projectId={id} project={project} active={activeTab === 'risk'} />}
      {activeTab === 'satellite' && (
        <SatelliteTab
          projectId={id}
          lat={project.latitude ?? 12.9716}
          lng={project.longitude ?? 77.5946}
          projectName={project.name}
        />
      )}

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

function SignalMeter({ label, score }: { label: string; score: number }) {
  const isHigh = score >= 50;
  const isMed = score >= 25 && score < 50;
  return (
    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200 shadow-2xs space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium truncate">{label}</span>
        <span
          className={cn(
            'font-mono font-bold text-xs',
            isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-emerald-700'
          )}
        >
          {score}/100
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

function AiRiskAuditCard({ project }: { project: PublicProjectDetail }) {
  const risk = project.projectRisk;
  if (!risk) return null;

  const isCritical = risk.riskLevel === 'CRITICAL';
  const isHigh = risk.riskLevel === 'HIGH';
  const isMed = risk.riskLevel === 'MEDIUM';

  return (
    <Card
      className={cn(
        'border-2 shadow-xs transition-all overflow-hidden',
        isCritical
          ? 'border-rose-300 bg-rose-50/30'
          : isHigh
          ? 'border-amber-300 bg-amber-50/30'
          : isMed
          ? 'border-sky-300 bg-sky-50/30'
          : 'border-emerald-300 bg-emerald-50/30'
      )}
    >
      <CardHeader className="pb-3 border-b border-slate-200/60 bg-white/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs',
                isCritical
                  ? 'bg-rose-600'
                  : isHigh
                  ? 'bg-amber-600'
                  : isMed
                  ? 'bg-sky-600'
                  : 'bg-emerald-600'
              )}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                VOJAS AI Multi-Signal Risk Audit
              </h2>
              <p className="text-xs text-slate-500">
                Statutory anomaly engine &amp; cross-source verification · Confidence:{' '}
                <span className="font-semibold text-slate-700">{risk.confidence}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-white font-mono font-bold text-sm shadow-xs flex items-center gap-2',
                isCritical
                  ? 'bg-rose-600'
                  : isHigh
                  ? 'bg-amber-600'
                  : isMed
                  ? 'bg-sky-700'
                  : 'bg-emerald-600'
              )}
            >
              <span className="text-base">{risk.riskScore}</span>
              <span className="text-xs opacity-75">/ 100</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-black/20 uppercase tracking-wider font-semibold">
                {risk.riskLevel}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 pt-4">
        {risk.primaryDriver && (
          <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200 shadow-2xs space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Primary AI Audit Findings &amp; Rationale
            </p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {risk.primaryDriver}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Multi-Signal Sub-Score Breakdown (0 = Safe, 100 = Max Disparity)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            <SignalMeter label="Financial Utilization" score={risk.financialScore ?? 0} />
            <SignalMeter label="Milestone & Progress" score={risk.progressScore ?? 0} />
            <SignalMeter label="Satellite Observation" score={risk.satelliteScore ?? 0} />
            <SignalMeter label="Contractor Disparity" score={risk.contractorScore ?? 0} />
            <SignalMeter label="Geographic Integrity" score={risk.geographicScore ?? 0} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function OverviewTab({ project }: { project: PublicProjectDetail }) {
  return (
    <div className="space-y-5">
      <AiRiskAuditCard project={project} />

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

      {project.mp && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-vojas-600" />
                Member of Parliament (MP)
              </h2>
              {project.mp.party && (
                <Badge variant="primary">{project.mp.party}</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailField label="Representative" value={project.mp.name} />
              <DetailField label="Constituency" value={project.mp.constituency} />
              <DetailField label="House" value={project.mp.house === 'LOK_SABHA' ? 'Lok Sabha' : 'Rajya Sabha'} />
              <DetailField label="Tenure" value={project.mp.term || '17th Lok Sabha'} />
            </div>
          </CardBody>
        </Card>
      )}

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

      <CitizenReportsSection project={project} />
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

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  DOCUMENT: 'Document',
  SATELLITE_OBSERVATION: 'Satellite observation',
  SATELLITE_ANALYSIS: 'Satellite change analysis',
  INSPECTION: 'Field inspection',
  CITIZEN_MEDIA: 'Citizen-submitted media',
  CONTRACTOR_SUBMISSION: 'Contractor submission',
  AI_FINDING: 'AI-assisted finding',
  PROJECT_EVENT: 'Project event',
};

function TimelineTab({ projectId, active }: { projectId: string; active: boolean }) {
  const { data, isLoading } = usePublicProjectTimeline(projectId);
  const events = data?.data ?? [];
  const { data: evidenceFeed, isLoading: evidenceLoading } = usePublicProjectEvidence(projectId, active);
  const evidenceItems = evidenceFeed?.items ?? [];

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Unified Evidence Feed</h2>
        </CardHeader>
        <CardBody>
          {evidenceLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : evidenceItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No public evidence recorded for this project yet.
            </div>
          ) : (
            <ol className="space-y-4">
              {evidenceItems.map((item) => (
                <li key={item.id} className="border-l-2 border-slate-200 pl-4 relative">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-vojas-500" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700">{item.title}</p>
                    <Badge variant="neutral">{EVIDENCE_TYPE_LABEL[item.evidenceType] ?? item.evidenceType}</Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(item.capturedAt)}
                    {item.confidence && ` · Confidence: ${item.confidence}`}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-vojas-600 hover:underline">
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
    </div>
  );
}

function RiskTab({
  projectId,
  project,
  active,
}: {
  projectId: string;
  project: PublicProjectDetail;
  active: boolean;
}) {
  const { data, isLoading } = usePublicProjectRisk(projectId, active);
  const findings = data?.findings ?? [];

  return (
    <div className="space-y-4">
      <AiRiskAuditCard project={project} />

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

function CitizenReportsSection({ project }: { project: PublicProjectDetail }) {
  const { data, isLoading } = usePublicProjectReports(project.id);
  const reports = data?.reports ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-vojas-600" />
            Citizen Oversight &amp; Reports
          </h2>
          <Link href={`/report?projectId=${project.id}`}>
            <Button variant="primary" size="sm">Submit a Report</Button>
          </Link>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div>
            <p className="text-2xl font-bold text-slate-900">{project.reportCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {project.reportCount === 1 ? 'verified citizen submission' : 'verified citizen submissions'}
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs text-right">
            Geotagged citizen evidence directly updates project anomaly detection and statutory audits.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-vojas-500" />
            Loading project citizen reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <p className="font-medium text-slate-600">No public discrepancy reports logged yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Citizens and community inspectors can submit on-site photographs and progress notes above.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Submitted Discrepancies ({reports.length})
            </h3>
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-vojas-700 bg-vojas-50 px-2 py-0.5 rounded border border-vojas-200">
                      {r.reportReference}
                    </span>
                    <Badge variant="neutral">{r.category.replace(/_/g, ' ')}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Logged {formatDate(r.submittedAt)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-800">{r.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                {r.locationDesc && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    Observed location: {r.locationDesc}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          Whistleblower identities are cryptographically protected. Personally identifiable contact details are kept strictly confidential.
        </p>
      </CardBody>
    </Card>
  );
}
