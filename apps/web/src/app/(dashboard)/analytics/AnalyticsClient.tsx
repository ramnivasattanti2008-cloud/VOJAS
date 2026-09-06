'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, Activity, IndianRupee, AlertTriangle, FileText, Building2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useProjects } from '@/hooks/useProjects';
import { useAnomalyStats } from '@/hooks/useAnomalies';
import { formatCurrency } from '@/lib/utils';
import { ProjectStatus } from '@vojas/shared';

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
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 500 });
  const { data: anomalyStats } = useAnomalyStats();

  const projects = projectsData?.data ?? [];

  // By status
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p) => {
      map[p.status] = (map[p.status] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  // By sector
  const bySector = useMemo<SectorGroup[]>(() => {
    const map: Record<string, SectorGroup> = {};
    projects.forEach((p) => {
      const key = p.sector as string;
      if (!map[key]) {
        map[key] = { sector: key, count: 0, sanctioned: 0, spent: 0, utilization: 0 };
      }
      map[key].count += 1;
      map[key].sanctioned += p.sanctionedAmount ?? 0;
      map[key].spent += p.spentAmount ?? 0;
    });
    return Object.values(map)
      .map((s) => ({
        ...s,
        utilization: s.sanctioned > 0 ? Math.round((s.spent / s.sanctioned) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [projects]);

  // By state
  const byState = useMemo<StateGroup[]>(() => {
    const map: Record<string, StateGroup> = {};
    projects.forEach((p) => {
      const key = p.state ?? 'Unknown';
      if (!map[key]) {
        map[key] = { state: key, count: 0, sanctioned: 0, flagged: 0 };
      }
      map[key].count += 1;
      map[key].sanctioned += p.sanctionedAmount ?? 0;
      if (p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL') {
        map[key].flagged += 1;
      }
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [projects]);

  // Totals
  const totalSanctioned = projects.reduce((s, p) => s + (p.sanctionedAmount ?? 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.spentAmount ?? 0), 0);
  const utilizationPct = totalSanctioned > 0 ? Math.round((totalSpent / totalSanctioned) * 100) : 0;
  const flaggedCount = projects.filter((p) => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL').length;

  const criticalAnomalies = anomalyStats?.bySeverity?.find((s) => s.severity === 'CRITICAL')?._count?._all ?? 0;
  const openAnomalies = anomalyStats?.byStatus?.find((s) => s.status === 'OPEN')?._count?._all ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Platform-wide insights and trends
        </p>
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
              {projectsLoading ? '—' : projects.length}
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
              {projects.length > 0 ? Math.round((flaggedCount / projects.length) * 100) : 0}% of total
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
