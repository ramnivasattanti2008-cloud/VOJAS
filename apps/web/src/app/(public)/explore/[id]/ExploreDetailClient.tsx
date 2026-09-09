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
  ShieldCheck,
  UserCheck,
  Database,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { usePublicProject, usePublicProjectTimeline } from '@/hooks/usePublicProjects';
import { usePublicReports } from '@/hooks/useCitizenReports';
import { useSatelliteStatus, useSatelliteObservations, useSatelliteChange, useProgressComparison } from '@/hooks/useSatellite';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InformationClassificationBanner } from '@/components/transparency/InformationClassificationBanner';
import { SourcePanel } from '@/components/transparency/SourcePanel';
import { SectorAccountabilityCard } from '@/components/transparency/SectorAccountabilityCard';
import { ProjectChronologicalTimeline } from '@/components/timeline/ProjectChronologicalTimeline';
import { SatelliteEvidenceSection } from '@/components/satellite/SatelliteEvidenceSection';
import { FinancialLedgerSection } from '@/components/transparency/FinancialLedgerSection';
import { CitizenReportsSection } from '@/components/transparency/CitizenReportsSection';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { PublicProjectDetail } from '@vojas/api-client';

type Tab =
  | 'overview'
  | 'financial'
  | 'timeline'
  | 'satellite'
  | 'accountability'
  | 'reports'
  | 'provenance';

const tabs: { key: Tab; label: string; number: string; icon: typeof FileText }[] = [
  { key: 'overview', label: 'Overview', number: '1', icon: FileText },
  { key: 'financial', label: 'Financial Ledger', number: '2', icon: DollarSign },
  { key: 'timeline', label: 'Project Timeline', number: '3', icon: Activity },
  { key: 'satellite', label: 'Satellite Evidence', number: '4', icon: Satellite },
  { key: 'accountability', label: 'Sector Accountability', number: '5', icon: ShieldCheck },
  { key: 'reports', label: 'Citizen Reports', number: '6', icon: UserCheck },
  { key: 'provenance', label: 'Sources / Provenance', number: '7', icon: Database },
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

export function ExploreDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: project, isLoading: projectLoading, isError } = usePublicProject(id);
  const { data: timelineData } = usePublicProjectTimeline(id);
  const { data: satStatus } = useSatelliteStatus(id);
  const { data: satObsData } = useSatelliteObservations(id);
  const { data: satChangeData } = useSatelliteChange(id);
  const { data: satComparison } = useProgressComparison(id);
  const { data: publicReportsData } = usePublicReports(id ? { projectId: id } : undefined);

  const projectEvents = timelineData?.data ?? [];
  const observations = satObsData?.observations ?? [];
  const analyses = satChangeData?.comparisons ?? [];
  const publicReports = (publicReportsData as any)?.data ?? [];

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-vojas-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-slate-400">Loading project dossier…</p>
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation & Header */}
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
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANT[project.status] ?? 'neutral'}>
                {project.status.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="neutral">{project.sector.replace(/_/g, ' ')}</Badge>
              {(project as any).mp?.name && (
                <Link href={`/mps/${(project as any).mp.id}`}>
                  <Badge variant="primary" className="cursor-pointer hover:bg-vojas-100 transition-colors">
                    🏛️ MP: {(project as any).mp.name}
                  </Badge>
                </Link>
              )}
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {[project.district, project.state].filter(Boolean).join(', ') || 'Location not available'}
              </span>
            </div>
          </div>

          {/* Top Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {project.latitude != null && project.longitude != null && (
              <Link
                href={`/explore/map?focus=${project.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                View on Map
              </Link>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('satellite')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            >
              <Satellite className="h-3.5 w-3.5 text-purple-600" />
              Satellite
            </button>
            <Link
              href={`/report?projectId=${project.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Report Discrepancy
            </Link>
          </div>
        </div>
      </div>

      <InformationClassificationBanner />

      {/* 7 MAJOR SECTIONS TAB NAVIGATION */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-2xs p-1">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Project sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono', activeTab === tab.key ? 'bg-white text-slate-900 font-black' : 'bg-slate-200 text-slate-600')}>
                {tab.number}
              </span>
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. PROJECT OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Dossier Grid (Links into other major sections) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Finance Preview Card */}
            <Card
              className="border-slate-200 hover:border-emerald-300 transition-all cursor-pointer group"
              onClick={() => setActiveTab('financial')}
            >
              <CardBody className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    2. Financial Ledger
                  </span>
                  <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                    {project.approvedAmount > 0 ? `${((project.spentAmount / project.approvedAmount) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900">{formatCurrency(project.approvedAmount)}</div>
                <p className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Spent: {formatCurrency(project.spentAmount)}</span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                    Details →
                  </span>
                </p>
              </CardBody>
            </Card>

            {/* Timeline Preview Card */}
            <Card
              className="border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
              onClick={() => setActiveTab('timeline')}
            >
              <CardBody className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-blue-600" />
                    3. Project Timeline
                  </span>
                  <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">
                    {projectEvents.length + (project.startDate ? 1 : 0) + (project.completedAt ? 1 : 0) + observations.length} Events
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Started: {project.startDate ? formatDate(project.startDate) : 'Date not available in source data.'}
                </div>
                <p className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Target: {project.expectedEndDate ? formatDate(project.expectedEndDate) : 'Date not available in source data.'}</span>
                  <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                    Timeline →
                  </span>
                </p>
              </CardBody>
            </Card>

            {/* Satellite Preview Card */}
            <Card
              className="border-slate-200 hover:border-purple-300 transition-all cursor-pointer group"
              onClick={() => setActiveTab('satellite')}
            >
              <CardBody className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-800">
                  <span className="flex items-center gap-1.5">
                    <Satellite className="h-4 w-4 text-purple-600" />
                    4. Satellite Evidence
                  </span>
                  <span className="text-[10px] bg-purple-100 px-2 py-0.5 rounded-full">
                    {observations.length} Passes
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {observations.length > 0 ? `${observations.length} Valid Passes` : 'NO USABLE OBSERVATION'}
                </div>
                <p className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{project.latitude ? '10m Sentinel-2 Resolution' : 'Missing coordinates'}</span>
                  <span className="text-purple-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                    Imagery →
                  </span>
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Project Details Sheet */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-slate-900">Administrative Record Details</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DetailField label="Sector" value={project.sector.replace(/_/g, ' ')} />
                <DetailField label="State" value={project.state || 'Not available'} />
                <DetailField label="District" value={project.district || 'Not available'} />
                <DetailField label="Constituency" value={project.constituency || 'Not available'} />
                <DetailField
                  label="Recommending MP"
                  value={
                    (project as any).mp
                      ? `${(project as any).mp.name} (${(project as any).mp.house === 'LOK_SABHA' ? 'Lok Sabha' : 'Rajya Sabha'}${
                          (project as any).mp.party ? ' - ' + (project as any).mp.party : ''
                        })`
                      : 'Not recorded in source record'
                  }
                />
                <DetailField label="Contractor" value={project.contractor || 'Not available in source record'} />
                <DetailField label="Source Registry" value={project.source.replace(/_/g, ' ')} />
                <DetailField
                  label="Work Start Date"
                  value={project.startDate ? formatDate(project.startDate) : 'Date not available in source data.'}
                />
                <DetailField
                  label="Target Completion"
                  value={project.expectedEndDate ? formatDate(project.expectedEndDate) : 'Date not available in source data.'}
                />
                <DetailField
                  label="Official Completion Date"
                  value={project.completedAt ? formatDate(project.completedAt) : 'Date not available in source data.'}
                />
              </div>
            </CardBody>
          </Card>

          {project.description && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-bold text-slate-900">Description</h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
              </CardBody>
            </Card>
          )}

          {/* Sector-Specific Framework preview */}
          <SectorAccountabilityCard sector={project.sector} />
        </div>
      )}

      {/* 2. FINANCIAL LEDGER */}
      {activeTab === 'financial' && <FinancialLedgerSection project={project} />}

      {/* 3. PROJECT TIMELINE */}
      {activeTab === 'timeline' && (
        <ProjectChronologicalTimeline
          project={project}
          projectEvents={projectEvents}
          satelliteObservations={observations}
          satelliteStatus={satStatus}
          reportCount={project.reportCount}
          citizenReports={publicReports}
        />
      )}

      {/* 4. SATELLITE EVIDENCE */}
      {activeTab === 'satellite' && (
        <SatelliteEvidenceSection
          projectId={project.id}
          lat={project.latitude ?? null}
          lng={project.longitude ?? null}
          projectName={project.name}
          status={satStatus ?? null}
          observations={observations}
          analyses={analyses}
          comparison={satComparison ?? null}
          approvedAmount={project.approvedAmount}
          spentAmount={project.spentAmount}
          projectStatus={project.status}
          startDate={project.startDate}
          expectedEndDate={project.expectedEndDate}
        />
      )}

      {/* 5. SECTOR ACCOUNTABILITY */}
      {activeTab === 'accountability' && <SectorAccountabilityCard sector={project.sector} />}

      {/* 6. CITIZEN REPORTS */}
      {activeTab === 'reports' && <CitizenReportsSection project={project} publicReports={publicReports} />}

      {/* 7. SOURCES / PROVENANCE */}
      {activeTab === 'provenance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">Source Attributions &amp; Data Provenance</h3>
            </CardHeader>
            <CardBody className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">🏛️ Government Registry Source</span>
                  <p>Ministry of Statistics and Programme Implementation (MoSPI) MPLADS public portal.</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">Source Work ID: {project.sourceWorkId || 'Not specified'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">🛰️ Earth Observation Source</span>
                  <p>European Space Agency (ESA) Copernicus Data Space Ecosystem (CDSE) Sentinel-2 MSI instruments.</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">Resolution: 10m multispectral (B2, B3, B4, B8, B11, B12)</p>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                <p className="font-bold mb-1">Integrity Assurance:</p>
                <p className="text-[11px]">
                  VOJAS mirrors public data records without arbitrary alteration. If a date, expenditure voucher, or satellite observation is not present in official registries, VOJAS explicitly states that the data is not available rather than simulating placeholder data.
                </p>
              </div>
            </CardBody>
          </Card>
          <SourcePanel lastUpdated={project.updatedAt} />
        </div>
      )}

      {/* Persistent Source Panel footer on every tab */}
      {activeTab !== 'provenance' && <SourcePanel lastUpdated={project.updatedAt} className="mt-8" />}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
