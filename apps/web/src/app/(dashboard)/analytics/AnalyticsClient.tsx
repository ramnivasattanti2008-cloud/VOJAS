'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { useAnomalyStats } from '@/hooks/useAnomalies';
import { usePublicProjectStates, usePublicProjectSummary } from '@/hooks/usePublicProjects';
import { useSectorSummary } from '@/hooks/useSectors';
import { formatCurrency } from '@/lib/utils';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Building2,
    Download,
    FileText,
    IndianRupee,
    Loader2,
    PieChart as PieIcon,
    TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface SectorGroup {
  sector: string;
  count: number;
  sanctioned: number;
  spent: number;
  utilization: number;
}

interface StateGroup {
  state: string;
  count: number;
  sanctioned: number;
  flagged: number;
}

const SECTOR_LABELS: Record<string, string> = {
  PUBLIC_INFRASTRUCTURE: 'Public Infra',
  WATER_SANITATION: 'Water & Sanitation',
  EDUCATION: 'Education',
  HEALTH: 'Health',
  AGRICULTURE: 'Agriculture',
  ENVIRONMENT: 'Environment',
  TRANSPORT: 'Transport',
  ENERGY: 'Energy',
  HOUSING: 'Housing',
  RURAL_DEVELOPMENT: 'Rural Dev',
  SOCIAL_WELFARE: 'Social Welfare',
  PUBLIC_ADMIN: 'Public Admin',
  FINANCE_PROCUREMENT: 'Finance',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

const SECTOR_COLORS = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#22c55e',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-600 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-slate-900 font-medium w-12 text-right text-xs">{value}</span>
    </div>
  );
}

export function AnalyticsClient() {
  const { data: summary, isLoading: summaryLoading } = usePublicProjectSummary();
  const { data: states = [], isLoading: statesLoading } = usePublicProjectStates();
  const { data: sectorSummary = [], isLoading: sectorsLoading } = useSectorSummary();
  const { data: anomalyStats, isLoading: anomalyLoading } = useAnomalyStats();

  const [pdfBusy, setPdfBusy] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { generateAnalyticsReportPdf } = await import('@/lib/pdf');
      await generateAnalyticsReportPdf({
        summary,
        states,
        sectors: sectorSummary,
        anomalies: anomalyStats,
      });
    } catch (err) {
      console.error('Failed to generate analytics report:', err);
    } finally {
      setPdfBusy(false);
    }
  };

  const isLoading = summaryLoading || statesLoading || sectorsLoading || anomalyLoading;

  // By status from real totals
  const byStatus = useMemo(() => {
    if (!summary) return [];
    const completed = summary.completedProjects ?? 0;
    const inProgress = summary.inProgressProjects ?? 0;
    const delayed = summary.delayedProjects ?? 0;
    const unsanctioned = Math.max(0, summary.totalProjects - completed - inProgress - delayed);
    return [
      ['COMPLETED', completed],
      ['IN_PROGRESS', inProgress],
      ['DELAYED', delayed],
      ['UNSANCTIONED', unsanctioned],
    ].filter(([, count]) => (count as number) > 0);
  }, [summary]);

  // By sector from real sector aggregates
  const bySector = useMemo<SectorGroup[]>(() => {
    if (!Array.isArray(sectorSummary)) return [];
    return sectorSummary
      .map((s: any) => {
        const sanctioned = Number(s.totalSanctioned ?? s.approvedAmount ?? 0);
        const spent = Number(s.totalSpent ?? s.spentAmount ?? 0);
        const count = Number(s.count ?? s.projectCount ?? s.totalProjects ?? 0);
        return {
          sector: s.sector || s.name,
          count,
          sanctioned,
          spent,
          utilization: sanctioned > 0 ? Math.round((spent / sanctioned) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [sectorSummary]);

  // By state from real state aggregates
  const byState = useMemo<StateGroup[]>(() => {
    if (!Array.isArray(states)) return [];
    return states
      .map((st: any) => ({
        state: st.state || st.name,
        count: Number(st.totalProjects ?? st.count ?? 0),
        sanctioned: Number(st.totalSanctioned ?? 0),
        flagged: Number(st.delayedProjects ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [states]);

  // Totals from real summary
  const totalProjects = summary?.totalProjects ?? 0;
  const totalSanctioned = summary?.totalSanctioned ?? 0;
  const totalSpent = summary?.totalSpent ?? 0;
  const utilizationPct = totalSanctioned > 0 ? Math.round((totalSpent / totalSanctioned) * 100) : 0;
  const flaggedCount = summary?.delayedProjects ?? 0;

  const criticalAnomalies = anomalyStats?.bySeverity?.find((s) => s.severity === 'CRITICAL')?._count?._all ?? 0;
  const openAnomalies = anomalyStats?.byStatus?.find((s) => s.status === 'OPEN')?._count?._all ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Platform-wide insights and trends across all {summary?.totalProjects ? summary.totalProjects.toLocaleString() : '60,000+'} MPLADS works
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfBusy || isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-95 disabled:opacity-60"
        >
          {pdfBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{pdfBusy ? 'Generating PDF...' : 'Download PDF Report'}</span>
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Total Projects</span>
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : totalProjects.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">across all states</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Total Sanctioned</span>
              <IndianRupee className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSanctioned)}</p>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-green-600 inline-flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> {utilizationPct}%
              </span>
              {' '}utilized
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Critical Anomalies</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{criticalAnomalies}</p>
            <p className="text-xs text-slate-500 mt-1">
              {openAnomalies} open total
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">High-Risk Projects</span>
              <FileText className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{flaggedCount}</p>
            <p className="text-xs text-slate-500 mt-1">
              {totalProjects > 0 ? Math.round((flaggedCount / totalProjects) * 100) : 0}% of total
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By sector */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">By Sector</h2>
          </div>
          <CardBody className="space-y-2.5 max-h-96 overflow-y-auto">
            {bySector.slice(0, 12).map((s, i) => (
              <BarRow
                key={s.sector}
                label={SECTOR_LABELS[s.sector] ?? s.sector}
                value={s.count}
                max={bySector[0]?.count ?? 1}
                color={SECTOR_COLORS[i % SECTOR_COLORS.length]}
              />
            ))}
          </CardBody>
        </Card>

        {/* By status */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">By Status</h2>
          </div>
          <CardBody className="space-y-2.5">
            {byStatus.map(([status, count]) => {
              const variant = status === 'COMPLETED' ? 'success'
                : status === 'IN_PROGRESS' ? 'info'
                : status === 'CANCELLED' ? 'danger'
                : 'neutral';
              return (
                <div key={status} className="flex items-center justify-between text-sm">
                  <Badge variant={variant}>{status}</Badge>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* By state */}
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Top States by Project Count</h2>
          </div>
          <CardBody className="space-y-2.5">
            {byState.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No data</p>
            ) : (
              byState.map((s, i) => (
                <BarRow
                  key={s.state}
                  label={s.state}
                  value={s.count}
                  max={byState[0].count}
                  color={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                />
              ))
            )}
          </CardBody>
        </Card>

        {/* Sector utilization */}
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Sector-wise Utilization</h2>
          </div>
          <CardBody className="space-y-2.5">
            {bySector
              .filter((s) => s.sanctioned > 0)
              .sort((a, b) => b.sanctioned - a.sanctioned)
              .slice(0, 10)
              .map((s) => (
                <div key={s.sector} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{SECTOR_LABELS[s.sector] ?? s.sector}</span>
                    <span>
                      {formatCurrency(s.spent)} of {formatCurrency(s.sanctioned)} ({s.utilization}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.utilization > 90 ? 'bg-red-500' :
                        s.utilization > 60 ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(s.utilization, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
