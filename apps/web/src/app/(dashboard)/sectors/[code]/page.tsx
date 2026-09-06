'use client';

/**
 * Sector Detail Page — M13 16-Sector Intelligence
 * /sectors/[code] — dynamic sector detail view
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Layers, BarChart3, AlertTriangle, Map as MapIcon, Satellite, FileText, Database, Brain, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SectorDashboard } from '@/components/sector/SectorDashboard';
import {
  useSectorConfig, useSectorProjects, useSectorAlerts,
  useSectorReports, useSectorAnalytics, useSectorSummary
} from '@/hooks/useSectors';
import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { cn } from '@/lib/utils';

const SECTOR_LABELS: Record<string, string> = {
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
  PUBLIC_ADMIN: 'Public Administration',
  FINANCE_PROCUREMENT: 'Finance & Procurement',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

type TabId = 'dashboard' | 'projects' | 'alerts' | 'reports' | 'analytics';

function Tab({ id, label, icon: Icon, active, onClick }: {
  id: TabId; label: string; icon: any; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
        active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function SectorDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code as any;
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const { data: sector, isLoading: sectorLoading } = useSectorConfig(code);
  const { data: projects, isLoading: projectsLoading } = useSectorProjects(code, { limit: 10 });
  const { data: alerts, isLoading: alertsLoading } = useSectorAlerts(code);
  const { data: reports, isLoading: reportsLoading } = useSectorReports(code, { limit: 10 });
  const { data: analytics, isLoading: analyticsLoading } = useSectorAnalytics(code);
  const { data: summary } = useSectorSummary();

  const stats = summary?.find((s: any) => s.sector === code);

  if (!sectorLoading && !sector) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/sectors')}>
          Back to Sectors
        </Button>
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-slate-400">Sector not found: {code}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: MapIcon, count: projects?.length },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: alerts?.length },
    { id: 'reports', label: 'Reports', icon: FileText, count: reports?.length },
    { id: 'analytics', label: 'Analytics', icon: Brain },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/sectors')}
          className="-ml-2 mb-3"
        >
          All Sectors
        </Button>

        {sectorLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
        ) : sector ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{sector.icon}</span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {SECTOR_LABELS[code] ?? sector.name}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">{sector.description}</p>
              </div>
            </div>
            <Link href={`/map-view?sector=${code}`}>
              <Button variant="secondary" size="sm" leftIcon={<MapIcon className="h-4 w-4" />}>
                Open Map
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      {/* Information Classification */}
      <InformationClassificationBanner />

      {/* Section Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Sector sections">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && sector && (
        <SectorDashboard
          sector={sector}
          stats={stats}
          alerts={alerts}
          recentReports={reports}
          isLoading={sectorLoading}
          lastUpdated={sector ? new Date().toISOString() : undefined}
        />
      )}

      {activeTab === 'projects' && (
        <ProjectsTab projects={projects} isLoading={projectsLoading} sectorCode={code} />
      )}

      {activeTab === 'alerts' && (
        <AlertsTab alerts={alerts} isLoading={alertsLoading} />
      )}

      {activeTab === 'reports' && (
        <ReportsTab reports={reports} isLoading={reportsLoading} />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab analytics={analytics} isLoading={analyticsLoading} sector={sector} />
      )}
    </div>
  );
}

// ── Projects Tab ────────────────────────────────────────────────────────────────

function ProjectsTab({ projects, isLoading, sectorCode }: { projects?: any[]; isLoading: boolean; sectorCode: string }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody className="p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <MapIcon className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No projects in this sector yet.</p>
          <Link href={`/projects?tab=sector&sector=${sectorCode}`}>
            <Button variant="ghost" size="sm" className="mt-2">Browse All Projects</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project: any) => (
        <Card key={project.id}>
          <CardBody className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link href={`/projects/${project.id}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate block">
                  {project.name}
                </Link>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="neutral" className="text-xs">{project.state ?? '—'}</Badge>
                  <Badge variant="neutral" className="text-xs">{project.district ?? '—'}</Badge>
                  <Badge variant="neutral" className="text-xs">{project.status?.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                {project.approvedAmount && (
                  <p className="text-sm font-medium text-slate-700">
                    ₹{(project.approvedAmount / 1_00_00_000).toFixed(2)} Cr
                  </p>
                )}
                <ChevronRight className="h-4 w-4 text-slate-300 mt-1 ml-auto" />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────────────────────

function AlertsTab({ alerts, isLoading }: { alerts?: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <Card><CardBody className="p-6 animate-pulse"><div className="h-4 bg-slate-200 rounded w-1/2" /></CardBody></Card>;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No active alerts for this sector.</p>
        </CardBody>
      </Card>
    );
  }

  const severityColor: Record<string, string> = {
    LOW: 'text-green-600 bg-green-50',
    MEDIUM: 'text-amber-600 bg-amber-50',
    HIGH: 'text-red-600 bg-red-50',
    CRITICAL: 'text-red-800 bg-red-100',
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert: any) => (
        <Card key={alert.id}>
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-700">{alert.title ?? alert.type ?? 'Alert'}</p>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', severityColor[alert.severity] ?? 'bg-slate-100 text-slate-500')}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{alert.description ?? alert.message}</p>
                {alert.project && (
                  <Link href={`/projects/${alert.project.id}`} className="text-xs text-indigo-600 hover:underline mt-1 block">
                    → {alert.project.name}
                  </Link>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab({ reports, isLoading }: { reports?: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <Card><CardBody className="p-6 animate-pulse"><div className="h-4 bg-slate-200 rounded w-1/2" /></CardBody></Card>;
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <FileText className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No citizen reports for this sector yet.</p>
          <Link href="/report">
            <Button variant="ghost" size="sm" className="mt-2">Submit a Report</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report: any) => (
        <Card key={report.id}>
          <CardBody className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {report.reportReference ?? report.title ?? report.category ?? 'Report'}
                  </p>
                  <Badge variant="neutral" className="text-xs shrink-0">
                    {report.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{report.description ?? report.subject}</p>
                {report.project && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {report.project.name} — {report.project.state}
                  </p>
                )}
              </div>
              <Link href={`/reports/${report.id}`}>
                <Button variant="ghost" size="sm">View</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ analytics, isLoading, sector }: { analytics?: any; isLoading: boolean; sector?: any }) {
  if (isLoading) {
    return <Card><CardBody className="p-6 animate-pulse"><div className="h-4 bg-slate-200 rounded w-1/3 mb-2" /><div className="h-4 bg-slate-100 rounded w-1/2" /></CardBody></Card>;
  }

  if (!analytics) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Analytics not available for this sector.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Projects', value: analytics.projectCount?.toLocaleString() ?? '—', color: 'text-indigo-600' },
          { label: 'Reports', value: analytics.reportCount?.toLocaleString() ?? '—', color: 'text-blue-600' },
          { label: 'Anomalies', value: analytics.anomalyCount?.toLocaleString() ?? '—', color: 'text-red-600' },
          { label: 'Utilization', value: (analytics.financial?.utilizationRate != null ? analytics.financial.utilizationRate.toFixed(1) + '%' : '—'), color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardBody className="p-4 text-center">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      {analytics.statusBreakdown && Object.keys(analytics.statusBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">Status Breakdown</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{status.replace(/_/g, ' ')}</span>
                  <Badge variant="neutral">{String(count)}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Indicators */}
      {analytics.indicators && analytics.indicators.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">Configured Indicators</h3>
          </CardHeader>
          <CardBody className="p-0 px-4">
            {analytics.indicators.map((ind: any) => (
              <div key={ind.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{ind.name}</p>
                  <p className="text-xs text-slate-400">{ind.source} · {ind.frequency}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="neutral" className="text-xs">{ind.type}</Badge>
                  <Badge variant={ind.dataAvailability === 'AVAILABLE' ? 'success' : 'warning'} className="text-xs ml-1">
                    {ind.dataAvailability?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Data Quality */}
      {analytics.dataQualityDimensions && analytics.dataQualityDimensions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">Data Quality Dimensions</h3>
          </CardHeader>
          <CardBody className="p-0 px-4">
            {analytics.dataQualityDimensions.map((dim: any) => (
              <div key={dim.name} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{dim.name}</p>
                  <p className="text-xs text-slate-400">{dim.description}</p>
                </div>
                <div className="shrink-0 ml-3">
                  {dim.applicable ? (
                    <Badge variant={dim.dataAvailability === 'AVAILABLE' ? 'success' : 'warning'} className="text-xs">
                      {dim.dataAvailability?.replace(/_/g, ' ')}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-xs">N/A</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
