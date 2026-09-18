'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { useSectorOverview } from '@/hooks/useSectors';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi } from '@vojas/api-client';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Building2,
    CheckCircle2,
    Coins,
    Download,
    Droplets,
    GraduationCap,
    HeartHandshake,
    HeartPulse,
    Home,
    Landmark,
    Loader2,
    MapPin,
    PieChart as PieIcon,
    Scale,
    Scroll,
    Shield,
    Sprout,
    Trees,
    Truck,
    Wallet,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const projectsApi = createProjectsApi(apiClient);

// ── Clean Lucide icon mapping to replace raw emojis ───────────────────────────
const SECTOR_ICON_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    border: string;
    text: string;
    barColor: string;
  }
> = {
  PUBLIC_INFRASTRUCTURE: {
    icon: Building2,
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-600',
    barColor: 'bg-indigo-500',
  },
  SOCIAL_WELFARE: {
    icon: HeartHandshake,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-600',
    barColor: 'bg-amber-500',
  },
  EDUCATION: {
    icon: GraduationCap,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-600',
    barColor: 'bg-emerald-500',
  },
  TRANSPORT: {
    icon: Truck,
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'text-sky-600',
    barColor: 'bg-sky-500',
  },
  WATER_SANITATION: {
    icon: Droplets,
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    text: 'text-cyan-600',
    barColor: 'bg-cyan-500',
  },
  HEALTH: {
    icon: HeartPulse,
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    text: 'text-rose-600',
    barColor: 'bg-rose-500',
  },
  AGRICULTURE: {
    icon: Sprout,
    bg: 'bg-lime-50',
    border: 'border-lime-100',
    text: 'text-lime-700',
    barColor: 'bg-lime-600',
  },
  ENVIRONMENT: {
    icon: Trees,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    barColor: 'bg-emerald-600',
  },
  ENERGY: {
    icon: Zap,
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
    text: 'text-yellow-600',
    barColor: 'bg-yellow-500',
  },
  HOUSING: {
    icon: Home,
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    text: 'text-violet-600',
    barColor: 'bg-violet-500',
  },
  RURAL_DEVELOPMENT: {
    icon: MapPin,
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    text: 'text-orange-600',
    barColor: 'bg-orange-500',
  },
  PUBLIC_ADMIN: {
    icon: Landmark,
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
    barColor: 'bg-slate-600',
  },
  FINANCE_PROCUREMENT: {
    icon: Coins,
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    text: 'text-teal-600',
    barColor: 'bg-teal-500',
  },
  JUSTICE: {
    icon: Scale,
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-600',
    barColor: 'bg-purple-500',
  },
  LEGISLATIVE: {
    icon: Scroll,
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-100',
    text: 'text-fuchsia-600',
    barColor: 'bg-fuchsia-500',
  },
  PUBLIC_SAFETY: {
    icon: Shield,
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-600',
    barColor: 'bg-red-500',
  },
};

const DEFAULT_CONFIG = {
  icon: Building2,
  bg: 'bg-slate-50',
  border: 'border-slate-200',
  text: 'text-slate-600',
  barColor: 'bg-slate-500',
};

function formatCompactINR(val: number): string {
  const CRORE = 10_000_000;
  if (val >= CRORE) {
    return `₹${(val / CRORE).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
  }
  return formatCurrency(val);
}

export function AnalyticsClient() {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts'>('overview');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['public-analytics-summary'],
    queryFn: () => projectsApi.public.getSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: overview, isLoading: overviewLoading } = useSectorOverview();

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['public-analytics-states'],
    queryFn: () => projectsApi.public.getStateSummaries(),
    staleTime: 5 * 60 * 1000,
  });

  const sectorsWithProjects = useMemo(() => {
    return (overview?.projectStats ?? [])
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [overview]);

  const topStates = useMemo(() => {
    if (!Array.isArray(states)) return [];
    return [...states].sort((a, b) => (b.totalProjects ?? 0) - (a.totalProjects ?? 0)).slice(0, 8);
  }, [states]);

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { generateAnalyticsReportPdf } = await import('@/lib/pdf');
      await generateAnalyticsReportPdf({
        summary,
        states,
        sectors: overview?.projectStats,
      });
    } catch (err) {
      console.error('Failed to generate analytics PDF report:', err);
    } finally {
      setPdfBusy(false);
    }
  };

  const totalWorks = summary?.totalProjects ?? 0;
  const completedWorks = summary?.completedProjects ?? 0;
  const inProgressWorks = summary?.inProgressProjects ?? 0;
  const delayedWorks = summary?.delayedProjects ?? 0;
  const sanctionedWorks = Math.max(0, totalWorks - completedWorks - inProgressWorks - delayedWorks);
  const completionRate = totalWorks > 0 ? ((completedWorks / totalWorks) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-vojas-50 text-vojas-700 border border-vojas-200/60 px-2 py-0.5 rounded-full">
              Civic Intelligence Platform
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Database Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Analytics & Sector Performance
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Real-time project counts, status distribution, and sector allocations across all 16 MPLAD
            sectors, sourced directly from the official database with zero estimation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy || summaryLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {pdfBusy ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>{pdfBusy ? 'Generating PDF...' : 'Download Report (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ──────────────────────────────────────────────── */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardBody className="p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="h-6 w-20 bg-slate-200 rounded" />
                <div className="h-3 w-14 bg-slate-100 rounded" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="hover:border-slate-300 transition-all shadow-2xs">
            <CardBody className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 border border-indigo-100/60 mb-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {summary.totalProjects.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Total Projects</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-slate-400">
                Across 16 sectors
              </span>
            </CardBody>
          </Card>

          <Card className="hover:border-emerald-300 transition-all shadow-2xs">
            <CardBody className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 border border-emerald-100/60 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {summary.completedProjects.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Completed</p>
              <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                {completionRate}% rate
              </span>
            </CardBody>
          </Card>

          <Card className="hover:border-sky-300 transition-all shadow-2xs">
            <CardBody className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-50 border border-sky-100/60 mb-2">
                <Activity className="h-4 w-4 text-sky-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {summary.inProgressProjects.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">In Progress</p>
              <span className="inline-block mt-2 text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/50">
                Active execution
              </span>
            </CardBody>
          </Card>

          <Card className="hover:border-amber-300 transition-all shadow-2xs">
            <CardBody className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-100/60 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {summary.delayedProjects.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Delayed Works</p>
              <span className="inline-block mt-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                Flagged for review
              </span>
            </CardBody>
          </Card>

          <Card className="col-span-2 sm:col-span-4 lg:col-span-1 hover:border-slate-300 transition-all shadow-2xs">
            <CardBody className="p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-50 border border-teal-100/60 mb-2">
                <Wallet className="h-4 w-4 text-teal-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-900 truncate">
                {formatCompactINR(summary.totalSanctioned)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Total Sanctioned</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-slate-500">
                Spent: {formatCompactINR(summary.totalSpent)}
              </span>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* ── Graphical Representation Section ────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-vojas-600" />
            <h2 className="text-base font-semibold text-slate-900">Graphical Representation</h2>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Real data from {totalWorks.toLocaleString('en-IN')} works
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Lifecycle Status Distribution */}
          <Card className="p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-vojas-600" /> Status Distribution
              </span>
              <span className="text-xs font-semibold text-slate-700">100% Portfolio</span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Visual Segmented Bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${Math.max(2, (completedWorks / totalWorks) * 100)}%` }}
                  className="bg-emerald-500 transition-all"
                  title={`Completed: ${completedWorks}`}
                />
                <div
                  style={{ width: `${Math.max(1.5, (inProgressWorks / totalWorks) * 100)}%` }}
                  className="bg-sky-500 transition-all"
                  title={`In Progress: ${inProgressWorks}`}
                />
                <div
                  style={{ width: `${Math.max(0.5, (delayedWorks / totalWorks) * 100)}%` }}
                  className="bg-amber-500 transition-all"
                  title={`Delayed: ${delayedWorks}`}
                />
                <div
                  style={{ width: `${(sanctionedWorks / totalWorks) * 100}%` }}
                  className="bg-slate-300 transition-all"
                  title={`Sanctioned: ${sanctionedWorks}`}
                />
              </div>

              {/* Status Legend & Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-slate-700">Completed Works</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{completedWorks.toLocaleString()}</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      ({((completedWorks / (totalWorks || 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 border border-sky-100/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span className="font-medium text-slate-700">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{inProgressWorks.toLocaleString()}</span>
                    <span className="font-mono text-sky-600 font-semibold">
                      ({((inProgressWorks / (totalWorks || 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-medium text-slate-700">Delayed Works</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{delayedWorks.toLocaleString()}</span>
                    <span className="font-mono text-amber-600 font-semibold">
                      ({((delayedWorks / (totalWorks || 1)) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="font-medium text-slate-600">Sanctioned / In Pipeline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{sanctionedWorks.toLocaleString()}</span>
                    <span className="font-mono text-slate-500">
                      ({((sanctionedWorks / (totalWorks || 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Sector Workload Comparison */}
          <Card className="p-5 shadow-2xs lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-vojas-600" /> Top Sectors by Project Volume
              </span>
              <span className="text-xs text-slate-500">Works Count & Completion Ratio</span>
            </div>

            <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {sectorsWithProjects.slice(0, 6).map((s) => {
                const conf = SECTOR_ICON_CONFIG[s.sector] ?? DEFAULT_CONFIG;
                const Icon = conf.icon;
                const maxTotal = sectorsWithProjects[0]?.total || 1;
                const pct = Math.max(3, (s.total / maxTotal) * 100);
                const compRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

                return (
                  <div key={s.sector} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Icon className={`w-3.5 h-3.5 ${conf.text}`} />
                        <span>{s.sector.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono text-[11px]">
                          {s.completed} done ({compRate}%)
                        </span>
                        <span className="font-bold text-slate-900 w-16 text-right font-mono">
                          {s.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with completion slice */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`${conf.barColor} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Card 3: Top States Allocation */}
        {topStates.length > 0 && (
          <Card className="p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-vojas-600" /> Geographic Footprint (Top Jurisdictions)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {states.length} States & UTs Monitored
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topStates.map((st) => (
                <div
                  key={st.state}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <p className="text-xs font-bold text-slate-800 truncate">{st.state}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                    {st.totalProjects.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span className="text-emerald-600 font-semibold">{st.completedProjects} done</span>
                    <span>{formatCompactINR(st.totalSanctioned)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Sector Catalog ("By Sector") ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sector Performance Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any sector card to inspect individual project works, expenditures, and anomaly audits.
            </p>
          </div>
          <Badge variant="neutral">{sectorsWithProjects.length} Active Sectors</Badge>
        </div>

        {overviewLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-vojas-600" />
            <span className="ml-2 text-sm text-slate-500">Loading sector analytics...</span>
          </div>
        ) : sectorsWithProjects.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-slate-400 text-center py-8">
                No sector records available currently.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorsWithProjects.map((s) => {
              const cfg = overview?.sectors.find((c) => c.code === s.sector);
              const conf = SECTOR_ICON_CONFIG[s.sector] ?? DEFAULT_CONFIG;
              const Icon = conf.icon;
              const completionPercent = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

              return (
                <Link key={s.sector} href={`/insights/${s.sector}`} className="group block">
                  <Card className="h-full border border-slate-200/80 group-hover:border-vojas-500 group-hover:shadow-md transition-all rounded-xl overflow-hidden">
                    <CardBody className="p-4 flex flex-col justify-between h-full">
                      <div>
                        {/* Header: Icon + Name + Count */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center ${conf.bg} border ${conf.border} shrink-0 group-hover:scale-105 transition-transform`}
                            >
                              <Icon className={`w-4 h-4 ${conf.text}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-vojas-600 transition-colors">
                                {cfg?.shortName ?? s.sector.replace(/_/g, ' ')}
                              </h3>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {s.total.toLocaleString()} total works
                              </p>
                            </div>
                          </div>
                          <Badge variant="neutral" className="font-mono text-xs">
                            {s.total}
                          </Badge>
                        </div>

                        {/* Progress Tracker */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Progress</span>
                            <span className="font-semibold font-mono text-slate-700">
                              {completionPercent}% completed
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
                              className="bg-emerald-500 rounded-full transition-all"
                            />
                          </div>
                        </div>

                        {/* Sub-counters */}
                        <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="bg-slate-50/70 p-2 rounded-lg">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Completed</p>
                            <p className="font-bold text-emerald-600 font-mono text-sm mt-0.5">
                              {s.completed.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-slate-50/70 p-2 rounded-lg">
                            <p className="text-[10px] uppercase font-bold text-slate-400">In Progress</p>
                            <p className="font-bold text-sky-600 font-mono text-sm mt-0.5">
                              {s.inProgress.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer link cue */}
                      <div className="mt-4 pt-2 flex items-center justify-between text-[11px] font-medium text-vojas-600 group-hover:text-vojas-700">
                        <span>Explore Sector Details</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
