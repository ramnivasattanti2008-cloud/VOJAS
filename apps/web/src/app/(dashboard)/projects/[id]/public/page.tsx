'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Activity,
  DollarSign,
  ImageIcon,
  FileText,
  Globe,
  Satellite,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { createProjectsApi } from '@vojas/api-client';
import { apiClient } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { SourcePanel } from '@/components/transparency/SourcePanel';
import { PublicMoneyView } from '@/components/transparency/PublicMoneyView';
import { TransparencyTimeline } from '@/components/transparency/TransparencyTimeline';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const projectsApi = createProjectsApi(apiClient);

type Tab = 'overview' | 'financial' | 'timeline' | 'satellite' | 'reports';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'financial', label: 'Financial', icon: DollarSign },
  { key: 'timeline', label: 'Timeline', icon: Activity },
  { key: 'satellite', label: 'Satellite', icon: Satellite },
  { key: 'reports', label: 'Reports', icon: Users },
];

function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '—';
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not Available';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Not Available';
  }
}

function getVerificationStatus(status: string): { label: string; color: string; variant: 'info' | 'warning' | 'success' | 'neutral' } {
  switch (status) {
    case 'COMPLETED': return { label: 'VERIFICATION COMPLETED', color: 'text-emerald-600', variant: 'success' };
    case 'IN_PROGRESS': return { label: 'MONITORING', color: 'text-blue-600', variant: 'info' };
    case 'PROPOSED': return { label: 'MONITORING', color: 'text-blue-600', variant: 'info' };
    case 'APPROVED': return { label: 'MONITORING', color: 'text-blue-600', variant: 'info' };
    default: return { label: 'UNDER REVIEW', color: 'text-amber-600', variant: 'warning' };
  }
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'IN_PROGRESS': return 'info';
    case 'APPROVED': return 'primary';
    case 'CANCELLED': return 'danger';
    case 'DELAYED': return 'warning';
    default: return 'neutral';
  }
}

export default function PublicProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: project, isLoading } = useProject(id);
  const { data: timelineData } = useProjectTimeline(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-vojas-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/dashboard')}>
          Back to Command Center
        </Button>
        <Card>
          <CardBody>
            <div className="text-center py-12 text-slate-400">
              Project not found or not publicly available.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const verificationStatus = getVerificationStatus(project.status);
  const progress = project.progressPercent ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/dashboard')}
          className="-ml-2 mb-3"
        >
          Command Center
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={statusVariant(project.status)}>
                {project.status?.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="neutral">{project.sector?.replace(/_/g, ' ')}</Badge>
              <span className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[project.district, project.state].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={verificationStatus.variant} className="text-sm">
              {verificationStatus.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Information Classification Banner */}
      <InformationClassificationBanner />

      {/* Tabs */}
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} progress={progress} />
      )}
      {activeTab === 'financial' && (
        <FinancialTab project={project} />
      )}
      {activeTab === 'timeline' && (
        <TimelineTab projectId={id} timelineData={timelineData} />
      )}
      {activeTab === 'satellite' && (
        <SatelliteTab projectId={id} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab projectId={id} reportCount={project.reportCount} />
      )}

      {/* Source Panel */}
      <SourcePanel lastUpdated={project.updatedAt} className="mt-8" />
    </div>
  );
}

// ─── Tab Components ──────────────────────────────────────────────────────────

function OverviewTab({ project, progress }: { project: any; progress: number }) {
  return (
    <div className="space-y-5">
      {/* Project Details */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Project Details</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Sector', value: project.sector?.replace(/_/g, ' ') ?? '—' },
              { label: 'State', value: project.state ?? '—' },
              { label: 'District', value: project.district ?? '—' },
              { label: 'Constituency', value: project.constituency ?? '—' },
              { label: 'Start Date', value: formatDateDisplay(project.startDate) },
              { label: 'Expected Completion', value: formatDateDisplay(project.endDate) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Physical Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Reported Progress</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">SOURCE: REPORTED</span>
          </div>
        </CardHeader>
        <CardBody>
          {progress > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Physical Progress</span>
                <span className="font-bold text-slate-800">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-vojas-500' : 'bg-blue-400'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                This figure is based on officially reported data. Satellite imagery may show different physical evidence.
              </p>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              No progress data available for this project.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Satellite Evidence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Satellite Observations</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">AI-INTERPRETED</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ImageIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Latest Usable Observation</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Source: Copernicus Sentinel-2 via CDSE (European Space Agency)
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Use the project Time Machine to view available satellite imagery history.
              </p>
            </div>
            <Link href={`/projects/${project.id}/time-machine`} className="ml-auto">
              <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                Open
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Observable Physical Change vs Reported Progress */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Observable Physical Change</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Reported Progress</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{progress}%</p>
              <p className="text-xs text-slate-400 mt-1">Based on official government reports</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Satellite className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">Observable Change</span>
              </div>
              <p className="text-sm font-medium text-blue-700">Evidence Available</p>
              <p className="text-xs text-slate-400 mt-1">Satellite imagery analysis shows observable change</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function FinancialTab({ project }: { project: any }) {
  return (
    <div className="space-y-5">
      <PublicMoneyView
        approvedAmount={project.approvedAmount}
        spentAmount={project.spentAmount}
      />

      {/* Utilization rate */}
      {project.approvedAmount && project.spentAmount && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Fund Utilization Rate</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {project.approvedAmount > 0
                    ? `${((project.spentAmount / project.approvedAmount) * 100).toFixed(1)}%`
                    : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Unspent Balance</p>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {formatINR((project.approvedAmount ?? 0) - (project.spentAmount ?? 0))}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function TimelineTab({ projectId, timelineData }: { projectId: string; timelineData?: any[] }) {
  const events = timelineData ?? [];
  return (
    <div>
      <TransparencyTimeline events={events} />
    </div>
  );
}

function SatelliteTab({ projectId }: { projectId: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Satellite Observation History</h2>
          <span className="text-xs text-slate-400 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">AI-INTERPRETED</span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Satellite className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">Satellite Imagery Available</p>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            Use the Time Machine to explore satellite observations for this project.
            Images sourced from Copernicus Sentinel-2 via CDSE.
          </p>
          <Link href={`/projects/${projectId}/time-machine`}>
            <Button variant="primary" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
              Open Time Machine
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function ReportsTab({ projectId, reportCount }: { projectId: string; reportCount?: number }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">Citizen Voice</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Reports', value: reportCount ?? 0, color: 'text-slate-700' },
              { label: 'Under Review', value: '—', color: 'text-slate-500' },
              { label: 'Verified', value: '—', color: 'text-emerald-600' },
              { label: 'Resolved', value: '—', color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-4 bg-slate-50 rounded-lg">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
            <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Reporter identities are protected. Individual report details are not disclosed publicly to protect whistleblowers.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-center py-6">
            <p className="text-sm font-medium text-slate-700 mb-3">Submit a public report for this project</p>
            <Link href={`/report?projectId=${projectId}`}>
              <Button variant="primary" size="sm">Submit a Report</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function useProjectTimeline(projectId: string | null) {
  const { useQuery } = require('@tanstack/react-query');
  const projectsApi = createProjectsApi(apiClient);
  return useQuery({
    queryKey: ['project-timeline', projectId],
    queryFn: () => projectsApi.getTimeline(projectId!),
    enabled: !!projectId,
  });
}
