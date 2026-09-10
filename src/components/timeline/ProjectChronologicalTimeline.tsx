'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Satellite,
  DollarSign,
  FileCheck,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Layers,
  Cloud,
  CheckCircle2,
  Clock,
  MapPin,
  Info,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency } from '@/lib/utils';
import type { PublicProjectDetail, PublicProjectEvent, SatelliteObservation, SatelliteStatus } from '@vojas/api-client';

export interface TimelineItem {
  id: string;
  category: 'OFFICIAL_RECORD' | 'FINANCIAL' | 'SATELLITE_EVIDENCE' | 'CITIZEN_REPORT' | 'STATUS_CHANGE';
  title: string;
  description: string;
  date: string | null;
  timestamp: number;
  source?: string | null;
  sourceUrl?: string | null;
  dataset?: string | null;
  confidence?: string | null;
  satelliteData?: SatelliteObservation;
  isNotice?: boolean;
}

interface ProjectChronologicalTimelineProps {
  project: PublicProjectDetail;
  projectEvents?: PublicProjectEvent[];
  satelliteObservations?: SatelliteObservation[];
  satelliteStatus?: SatelliteStatus | null;
  reportCount?: number;
  citizenReports?: any[];
}

function formatTimelineDate(dateStr: string | null): string {
  if (!dateStr) return 'Date not available in source data.';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date not available in source data.';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return 'Date not available in source data.';
  }
}

export function ProjectChronologicalTimeline({
  project,
  projectEvents = [],
  satelliteObservations = [],
  satelliteStatus,
  reportCount = 0,
  citizenReports = [],
}: ProjectChronologicalTimelineProps) {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'OFFICIAL' | 'FINANCE' | 'SATELLITE'>('ALL');

  // Build unified chronological timeline using ONLY real data
  const rawItems = useMemo(() => {
    const list: TimelineItem[] = [];

    // 1. ProjectEvents from API
    for (const pe of projectEvents) {
      const ts = pe.eventDate ? new Date(pe.eventDate).getTime() : 0;
      list.push({
        id: `pe-${pe.id}`,
        category: 'OFFICIAL_RECORD',
        title: pe.eventType.replace(/_/g, ' '),
        description: pe.description,
        date: pe.eventDate || null,
        timestamp: ts,
        source: pe.source || 'MPLADS_PORTAL',
        sourceUrl: pe.sourceUrl || null,
        dataset: pe.dataset || null,
        confidence: pe.confidence || null,
      });
    }

    // 2. Official Work Commencement
    if (project.startDate) {
      const ts = new Date(project.startDate).getTime();
      const exists = list.some((i) => i.date === project.startDate && i.title.includes('START'));
      if (!exists) {
        list.push({
          id: `proj-start-${project.id}`,
          category: 'OFFICIAL_RECORD',
          title: 'Work Commenced',
          description: `Official recorded work start date for ${project.name}.`,
          date: project.startDate,
          timestamp: ts,
          source: project.source || 'MPLADS_PORTAL',
        });
      }
    }

    // 3. Official Expected Completion
    if (project.expectedEndDate) {
      const ts = new Date(project.expectedEndDate).getTime();
      list.push({
        id: `proj-expected-${project.id}`,
        category: 'OFFICIAL_RECORD',
        title: 'Target Completion Milestone',
        description: 'Targeted project completion date recorded in sanction order.',
        date: project.expectedEndDate,
        timestamp: ts,
        source: project.source || 'MPLADS_PORTAL',
      });
    }

    // 4. Official Completion
    if (project.completedAt) {
      const ts = new Date(project.completedAt).getTime();
      list.push({
        id: `proj-completed-${project.id}`,
        category: 'STATUS_CHANGE',
        title: 'Official Completion Certified',
        description: 'Project marked as fully completed in official agency records.',
        date: project.completedAt,
        timestamp: ts,
        source: project.source || 'MPLADS_PORTAL',
      });
    } else if (project.status === 'COMPLETED') {
      list.push({
        id: `proj-completed-nodate-${project.id}`,
        category: 'STATUS_CHANGE',
        title: 'Official Completion Recorded',
        description: 'Project status set to COMPLETED in system, but exact completion date is not available in source data.',
        date: null,
        timestamp: 0,
        source: project.source || 'MPLADS_PORTAL',
      });
    }

    // 5. Financial Sanction Event
    if (project.approvedAmount > 0) {
      const sanctionDate = project.createdAt || project.startDate || null;
      const ts = sanctionDate ? new Date(sanctionDate).getTime() : 0;
      list.push({
        id: `proj-sanction-${project.id}`,
        category: 'FINANCIAL',
        title: `Sanctioned: ${formatCurrency(project.approvedAmount)}`,
        description: `Administrative financial approval granted for ${formatCurrency(project.approvedAmount)}. Implementing agency: ${project.district || 'District Administration'}, ${project.state}.`,
        date: sanctionDate,
        timestamp: ts,
        source: project.source || 'MPLADS_PORTAL',
      });
    }

    // 6. Financial Expenditure Event
    if (project.spentAmount > 0) {
      const ts = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
      list.push({
        id: `proj-expenditure-${project.id}`,
        category: 'FINANCIAL',
        title: `Reported Expenditure: ${formatCurrency(project.spentAmount)}`,
        description: `Recorded fund utilization of ${formatCurrency(project.spentAmount)} (${((project.spentAmount / project.approvedAmount) * 100).toFixed(1)}% of sanction). Unspent balance: ${formatCurrency(project.approvedAmount - project.spentAmount)}.`,
        date: project.updatedAt || null,
        timestamp: ts,
        source: project.source || 'MPLADS_PORTAL',
      });
    }

    // 7. Satellite Observations
    for (const obs of satelliteObservations) {
      const ts = new Date(obs.observationDate).getTime();
      list.push({
        id: `sat-${obs.id}`,
        category: 'SATELLITE_EVIDENCE',
        title: `🛰️ ${obs.satellite || 'Sentinel-2'} Satellite Observation`,
        description: `Multispectral earth observation pass by ${obs.satellite} (${obs.sensor || 'MSI'}). Spatial resolution: ${obs.resolution}m. Cloud cover: ${obs.cloudCover.toFixed(1)}%.`,
        date: obs.observationDate,
        timestamp: ts,
        source: obs.provider === 'cdse' ? 'Copernicus Data Space Ecosystem (CDSE)' : obs.provider,
        sourceUrl: obs.sourceUrl,
        satelliteData: obs,
      });
    }

    // 8. If zero satellite observations exist, add truthful status entry
    if (satelliteObservations.length === 0) {
      list.push({
        id: `sat-notice-${project.id}`,
        category: 'SATELLITE_EVIDENCE',
        title: '🛰️ Satellite Surveillance Status: NO USABLE OBSERVATION',
        description: satelliteStatus?.message || 'No ingested Sentinel-2 observation passes available for this project area.',
        date: project.updatedAt || null,
        timestamp: project.updatedAt ? new Date(project.updatedAt).getTime() : 0,
        source: 'Sentinel-2 / CDSE Provider',
        isNotice: true,
      });
    }

    // 9. Citizen Reports
    if (citizenReports && citizenReports.length > 0) {
      for (const rep of citizenReports) {
        const ts = rep.createdAt ? new Date(rep.createdAt).getTime() : 0;
        list.push({
          id: `rep-${rep.id}`,
          category: 'CITIZEN_REPORT',
          title: `👥 Citizen Ground Report (${rep.category?.replace(/_/g, ' ') || 'Community Report'})`,
          description: rep.title || rep.description || 'On-site community inspection report submitted.',
          date: rep.createdAt || null,
          timestamp: ts,
          source: 'VOJAS Citizen Intelligence',
          dataset: 'Citizen Submissions',
          confidence: rep.status,
        });
      }
    } else if (reportCount > 0) {
      list.push({
        id: `rep-summary-${project.id}`,
        category: 'CITIZEN_REPORT',
        title: `👥 Citizen Intelligence: ${reportCount} ${reportCount === 1 ? 'Report' : 'Reports'} Filed`,
        description: `${reportCount} citizen ${reportCount === 1 ? 'report has' : 'reports have'} been submitted regarding on-the-ground project conditions. Individual whistleblower identities remain confidential.`,
        date: project.updatedAt || null,
        timestamp: project.updatedAt ? new Date(project.updatedAt).getTime() : 0,
        source: 'VOJAS Citizen Intelligence',
      });
    }

    return list;
  }, [project, projectEvents, satelliteObservations, satelliteStatus, reportCount, citizenReports]);

  // Filter & sort
  const timelineItems = useMemo(() => {
    let filtered = rawItems;
    if (selectedFilter === 'OFFICIAL') {
      filtered = filtered.filter((i) => i.category === 'OFFICIAL_RECORD' || i.category === 'STATUS_CHANGE');
    } else if (selectedFilter === 'FINANCE') {
      filtered = filtered.filter((i) => i.category === 'FINANCIAL');
    } else if (selectedFilter === 'SATELLITE') {
      filtered = filtered.filter((i) => i.category === 'SATELLITE_EVIDENCE');
    }

    return [...filtered].sort((a, b) => {
      if (!a.date && b.date) return 1;
      if (a.date && !b.date) return -1;
      return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });
  }, [rawItems, selectedFilter, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Correlation Guide Callout */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm border border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Project Timeline &amp; Physical Evidence Correlation
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              This chronological timeline correlates <strong className="text-white">officially recorded administrative milestones</strong> with <strong className="text-white">physical satellite earth observations</strong> and <strong className="text-white">financial ledger entries</strong>.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                🏛️ Official Record
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                💰 Financial Ledger
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30">
                🛰️ Satellite Observation
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                👥 Citizen Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 italic">
              <strong>Accountability Disclaimer:</strong> Satellite observations verify optical surface changes (earthworks, macro structures). They do not claim to prove financial corruption, fraud, or internal component quality.
            </p>
          </div>
        </div>
      </div>

      {/* Controls & Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium mr-1 text-[11px] uppercase tracking-wider">Filter:</span>
          {(['ALL', 'OFFICIAL', 'FINANCE', 'SATELLITE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all',
                selectedFilter === filter
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {filter === 'ALL' && 'All Events'}
              {filter === 'OFFICIAL' && 'Official Records'}
              {filter === 'FINANCE' && 'Financial'}
              {filter === 'SATELLITE' && 'Satellite'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* Chronological Stream */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
        {timelineItems.map((item) => (
          <TimelineItemCard key={item.id} item={item} project={project} />
        ))}
      </div>

      {/* Empty State */}
      {timelineItems.length === 0 && (
        <Card>
          <CardBody className="py-12 text-center">
            <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No events matched the selected filter.</p>
            <p className="text-xs text-slate-400 mt-1">Select &apos;All Events&apos; to view the complete recorded history.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function TimelineItemCard({ item, project }: { item: TimelineItem; project: PublicProjectDetail }) {
  const isSatellite = item.category === 'SATELLITE_EVIDENCE';
  const isFinancial = item.category === 'FINANCIAL';
  const isCitizen = item.category === 'CITIZEN_REPORT';

  const badgeConfig = {
    OFFICIAL_RECORD: { label: 'Official Record', icon: FileCheck, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    FINANCIAL: { label: 'Financial Ledger', icon: DollarSign, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    SATELLITE_EVIDENCE: { label: 'Satellite Observation', icon: Satellite, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    CITIZEN_REPORT: { label: 'Citizen Intelligence', icon: UserCheck, color: 'bg-amber-100 text-amber-800 border-amber-200' },
    STATUS_CHANGE: { label: 'Status Change', icon: CheckCircle2, color: 'bg-slate-100 text-slate-800 border-slate-300' },
  }[item.category];

  const formattedDate = formatTimelineDate(item.date);
  const hasDate = !!item.date;

  return (
    <div className="relative group">
      {/* Node icon on vertical line */}
      <div
        className={cn(
          'absolute -left-[31px] sm:-left-[39px] top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shadow-xs text-xs font-bold transition-all',
          isSatellite
            ? 'bg-purple-600 border-purple-200 text-white'
            : isFinancial
            ? 'bg-emerald-600 border-emerald-200 text-white'
            : isCitizen
            ? 'bg-amber-600 border-amber-200 text-white'
            : 'bg-blue-600 border-blue-200 text-white'
        )}
      >
        <badgeConfig.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>

      {/* Main Event Box */}
      <Card
        className={cn(
          'border transition-all hover:shadow-md',
          isSatellite && !item.isNotice
            ? 'border-purple-200 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30'
            : item.isNotice
            ? 'border-amber-200 bg-amber-50/40'
            : isFinancial
            ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/20'
            : 'border-slate-200 bg-white'
        )}
      >
        <CardBody className="p-4 sm:p-5 space-y-3">
          {/* Header with Date & Category */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-extrabold tracking-wider px-2.5 py-1 rounded-md border',
                  hasDate ? 'bg-slate-900 text-white border-slate-900' : 'bg-rose-50 text-rose-700 border-rose-200 italic'
                )}
              >
                {formattedDate}
              </span>
              <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', badgeConfig.color)}>
                {badgeConfig.label}
              </span>
            </div>

            {item.source && (
              <span className="text-[11px] text-slate-500 font-medium">
                Source: <strong className="text-slate-700">{item.source}</strong>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <h4 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{item.description}</p>
          </div>

          {/* SATELLITE OBSERVATION CARD */}
          {item.satelliteData && (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-3 mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Satellite / Sensor</span>
                  <span className="font-bold text-purple-950">{item.satelliteData.satellite} ({item.satelliteData.sensor})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Coordinates</span>
                  <span className="font-mono font-medium text-slate-800">
                    {project.latitude?.toFixed(4)}° N, {project.longitude?.toFixed(4)}° E
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cloud Cover</span>
                  <span className="font-bold text-slate-800">{item.satelliteData.cloudCover.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Analysis Status</span>
                  <Badge variant={item.satelliteData.quality === 'USABLE' ? 'success' : 'warning'} size="sm">
                    {item.satelliteData.quality}
                  </Badge>
                </div>
              </div>

              {item.satelliteData.thumbnailUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-purple-200 bg-black aspect-video max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.satelliteData.thumbnailUrl}
                    alt={`Sentinel-2 pass on ${formattedDate}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white font-mono">
                    Acquired: {formattedDate}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600">
                    Multispectral scene: <code className="font-mono text-purple-800">{item.satelliteData.sceneId || 'Sentinel-2 L2A'}</code>
                  </span>
                  <span className="text-[11px] text-purple-700 font-semibold">10m Ground Resolution</span>
                </div>
              )}
            </div>
          )}

          {/* SATELLITE NOTICE */}
          {item.isNotice && (
            <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-300 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                No Usable Satellite Passes Ingested Yet
              </div>
              <p className="leading-relaxed text-[11px]">
                Target project location is recorded at <code className="font-mono font-bold">{project.latitude?.toFixed(4)}° N, {project.longitude?.toFixed(4)}° E</code> ({project.district}, {project.state}).
                Real-time Sentinel-2 tile acquisition requires live CDSE API credentials. In the meantime, the interactive map displays high-resolution satellite basemap imagery at the exact coordinates.
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
