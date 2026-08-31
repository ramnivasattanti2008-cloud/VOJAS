import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  IndianRupee,
  Shield,
  RefreshCw,
  Activity,
  ArrowRight,
  PieChart,
} from "lucide-react";
import { useAnalyticsSummary } from "@/hooks/useAnalytics";
import type {
  ProjectStatusCount,
  ProjectBySector,
  ReportCategoryCount,
  AnomalySeverityCount,
  RiskDistribution,
  TopRiskProject,
} from "@/services/analytics-api";
import { LoadingState, ErrorState } from "@/components/ui";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";
import { DonutChart, type DonutItem } from "@/components/charts/DonutChart";
import { LineChart, type LineSeries } from "@/components/charts/LineChart";

// ── Color palettes ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PROPOSED:    "#94a3b8",
  APPROVED:    "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED:   "#10b981",
  VERIFIED:    "#8b5cf6",
  CANCELLED:   "#ef4444",
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      "#94a3b8",
  MEDIUM:   "#f59e0b",
  HIGH:     "#f97316",
  CRITICAL: "#ef4444",
};

const RISK_COLORS: Record<string, string> = {
  LOW:      "#10b981",
  MEDIUM:   "#3b82f6",
  HIGH:     "#f59e0b",
  CRITICAL: "#ef4444",
};

const REPORT_STATUS_COLORS: Record<string, string> = {
  SUBMITTED:        "#3b82f6",
  UNDER_REVIEW:     "#8b5cf6",
  ACTION_TAKEN:     "#10b981",
  DISMISSED:        "#94a3b8",
  DUPLICATE:        "#64748b",
};

const REPORT_CATEGORY_COLORS: Record<string, string> = {
  QUALITY:    "#3b82f6",
  DELAY:      "#f59e0b",
  FUNDING:    "#ef4444",
  CORRUPTION: "#dc2626",
  SCOPE:      "#8b5cf6",
  OTHER:      "#64748b",
};

const SECTOR_COLORS: string[] = [
  "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#a855f7",
];

// ── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Chart card wrapper ──────────────────────────────────────────────────────

function ChartCard({ title, sub, children, action }: {
  title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-navy-900/40 border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const analyticsQuery = useAnalyticsSummary();
  const data = analyticsQuery.data ?? null;
  const loading = analyticsQuery.isLoading;
  const error = analyticsQuery.error?.message ?? null;

  // Keep useEffect/useCallback imports valid for any future local use
  useEffect(() => {}, []);
  useCallback(() => {}, []);

  if (loading) return <LoadingState message="Loading analytics..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  // Derived data
  const statusBars: BarChartItem[] = data.projects.byStatus.map((s: ProjectStatusCount) => ({
    label: s.status.replace("_", " "),
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  const sectorDonut: DonutItem[] = data.projects.bySector
    .slice(0, 8)
    .map((s: ProjectBySector, i: number) => ({
      label: s.sector.replace(/_/g, " "),
      value: s.count,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }));

  const sectorBudgetBars: BarChartItem[] = data.projects.bySector
    .slice(0, 6)
    .map((s: ProjectBySector, i: number) => ({
      label: s.sector.replace(/_/g, " "),
      value: s.totalBudget,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }));

  const reportStatusDonut: DonutItem[] = data.reports.byStatus.map((s) => ({
    label: s.status.replace(/_/g, " "),
    value: s.count,
    color: REPORT_STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  const reportCategoryBars: BarChartItem[] = data.reports.byCategory.map((c: ReportCategoryCount) => ({
    label: c.category,
    value: c.count,
    color: REPORT_CATEGORY_COLORS[c.category] ?? "#64748b",
  }));

  const anomalySeverityDonut: DonutItem[] = data.anomalies.bySeverity.map((a: AnomalySeverityCount) => ({
    label: a.severity,
    value: a.count,
    color: SEVERITY_COLORS[a.severity] ?? "#94a3b8",
  }));

  const anomalyCategoryBars: BarChartItem[] = data.anomalies.byCategory.map((a) => ({
    label: a.category.replace(/_/g, " "),
    value: a.count,
    color: a.category === "BUDGET_OVERRUN" ? "#ef4444" :
           a.category === "STALLED"       ? "#f59e0b" :
           a.category === "DUPLICATE"     ? "#8b5cf6" : "#3b82f6",
  }));

  const riskDonut: DonutItem[] = data.risk.distribution.map((r: RiskDistribution) => ({
    label: r.level,
    value: r.count,
    color: RISK_COLORS[r.level] ?? "#94a3b8",
  }));

  // Project creation over time (line)
  const monthlyCreation: LineSeries[] = [{
    name: "Projects",
    data: data.projects.monthlyCreation.map((m) => ({
      period: m.month,
      value: m.count,
    })),
    color: "#3b82f6",
  }];

  // Expenditure over time
  const expenditureOverTime: LineSeries[] = [{
    name: "Expenditure",
    data: data.financial.byMonth.map((m) => ({
      period: m.month,
      value: m.amount,
    })),
    color: "#f59e0b",
  }];

  return (
    <div className="max-w-7xl mx-auto pb-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-electric-400" />
            Analytics & Insights
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-platform metrics across projects, reports, anomalies, and risk
          </p>
        </div>
        <button
          onClick={() => analyticsQuery.refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-colors"
          title="Refresh analytics"
          aria-label="Refresh analytics data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Section 1 — Project KPIs */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Project Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Total Projects" value={data.projects.total} icon={FileText} accent="bg-electric-500/20 text-electric-400"
            sub={`Avg budget ₹${(data.projects.avgBudget / 1_000_000).toFixed(1)}L`} />
          <StatTile label="Avg Utilization" value={`${(((data.projects.avgSpent / Math.max(data.projects.avgBudget, 1)) * 100) || 0).toFixed(0)}%`} icon={TrendingUp} accent="bg-saffron-500/20 text-saffron-400"
            sub="Across all projects" />
          <StatTile label="Total Reports" value={data.reports.total} icon={AlertTriangle} accent="bg-blue-500/20 text-blue-400"
            sub={data.reports.avgResolutionDays !== null ? `Avg resolution ${data.reports.avgResolutionDays.toFixed(1)}d` : "No closed reports"} />
          <StatTile label="Open Anomalies" value={data.anomalies.open} icon={Shield} accent="bg-red-500/20 text-red-400"
            sub={`${data.anomalies.total} total flagged`} />
        </div>
      </section>

      {/* Section 2 — Project charts */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5" />
          Project Distribution
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Status Distribution" sub="By lifecycle status">
            {statusBars.length > 0 ? (
              <BarChart data={statusBars} color="#3b82f6" formatValue={(v) => v.toString()} />
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="Sector Spread" sub="Projects by sector">
            {sectorDonut.length > 0 ? (
              <div className="flex justify-center">
                <DonutChart
                  data={sectorDonut}
                  size={140}
                  centerText={data.projects.total.toString()}
                  centerSubtext="projects"
                  formatValue={(v) => v.toString()}
                />
              </div>
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="Top Sectors by Budget" sub="Allocated ₹">
            {sectorBudgetBars.length > 0 ? (
              <BarChart
                data={sectorBudgetBars}
                color="#10b981"
                formatValue={(v) => `₹${(v / 1_000_000).toFixed(0)}L`}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </div>
      </section>

      {/* Section 3 — Project creation timeline */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Timeline
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Project Creation Trend" sub="New projects registered per month">
            {monthlyCreation[0].data.length > 0 ? (
              <LineChart series={monthlyCreation} height={180} formatValue={(v) => v.toString()} />
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="Expenditure Trend" sub="Total ₹ per month">
            {expenditureOverTime[0].data.length > 0 ? (
              <LineChart
                series={expenditureOverTime}
                height={180}
                formatValue={(v) => `₹${(v / 1_000_000).toFixed(1)}L`}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </div>
      </section>

      {/* Section 4 — Citizen reports */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Citizen Reports
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Report Status" sub="By review state">
            {reportStatusDonut.length > 0 ? (
              <div className="flex justify-center">
                <DonutChart
                  data={reportStatusDonut}
                  size={140}
                  centerText={data.reports.total.toString()}
                  centerSubtext="reports"
                  formatValue={(v) => v.toString()}
                />
              </div>
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="Report Categories" sub="What citizens flag most">
            {reportCategoryBars.length > 0 ? (
              <BarChart
                data={reportCategoryBars}
                color="#8b5cf6"
                formatValue={(v) => v.toString()}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </div>
      </section>

      {/* Section 5 — Anomalies */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Anomalies
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="By Severity" sub="Detection rules firing">
            {anomalySeverityDonut.length > 0 ? (
              <div className="flex justify-center">
                <DonutChart
                  data={anomalySeverityDonut}
                  size={140}
                  centerText={data.anomalies.total.toString()}
                  centerSubtext="total"
                  formatValue={(v) => v.toString()}
                />
              </div>
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="By Category" sub="Rule types triggered">
            {anomalyCategoryBars.length > 0 ? (
              <BarChart
                data={anomalyCategoryBars}
                color="#ef4444"
                formatValue={(v) => v.toString()}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </div>
      </section>

      {/* Section 6 — Financial breakdown */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <IndianRupee className="w-3.5 h-3.5" />
          Financials
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatTile
            label="Total Budget"
            value={`₹${(data.financial.totalBudget / 1_000_000).toFixed(2)}L`}
            icon={IndianRupee}
            accent="bg-electric-500/20 text-electric-400"
            sub="Allocated across all projects"
          />
          <StatTile
            label="Total Spent"
            value={`₹${(data.financial.totalSpent / 1_000_000).toFixed(2)}L`}
            icon={IndianRupee}
            accent="bg-green-500/20 text-green-400"
            sub={`Utilization ${data.financial.utilization.toFixed(1)}%`}
          />
          <StatTile
            label="Authorized + Pending"
            value={`₹${((data.financial.totalAuthorized + data.financial.totalPending) / 1_000_000).toFixed(2)}L`}
            icon={IndianRupee}
            accent="bg-saffron-500/20 text-saffron-400"
            sub={`${data.financial.totalAuthorized > 0 ? "Authorized" : ""}${data.financial.totalPending > 0 ? " · Pending" : ""}`}
          />
        </div>

        {data.financial.byCategory.length > 0 && (
          <div className="mt-4">
            <ChartCard title="Expenditure by Category" sub="Where money flows">
              <BarChart
                data={data.financial.byCategory.map((c) => ({
                  label: c.category,
                  value: c.total,
                  color: c.category === "MATERIAL"   ? "#06b6d4"
                       : c.category === "LABOR"      ? "#f59e0b"
                       : c.category === "EQUIPMENT"  ? "#8b5cf6"
                       : c.category === "CONSULTANCY" ? "#3b82f6"
                       : c.category === "ADMINISTRATIVE" ? "#64748b"
                       : c.category === "CONTINGENCY" ? "#ec4899" : "#10b981",
                }))}
                color="#3b82f6"
                formatValue={(v) => `₹${(v / 1_000_000).toFixed(1)}L`}
              />
            </ChartCard>
          </div>
        )}
      </section>

      {/* Section 7 — Risk distribution + top risk projects */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Risk Scoring
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Risk Distribution" sub="Projects by risk tier">
            {riskDonut.length > 0 ? (
              <div className="flex justify-center">
                <DonutChart
                  data={riskDonut}
                  size={140}
                  centerText={data.risk.avgScore.toFixed(0)}
                  centerSubtext="avg score"
                  formatValue={(v) => v.toString()}
                />
              </div>
            ) : <EmptyChart />}
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard
              title="Top Risk Projects"
              sub={`Top ${Math.min(5, data.risk.topProjects.length)} by score`}
              action={
                <Link to="/risk" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.risk.topProjects.length > 0 ? (
                <div className="space-y-2">
                  {data.risk.topProjects.slice(0, 5).map((p: TopRiskProject) => (
                    <Link key={p.projectId} to={`/projects/${p.projectId}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-electric-500/30 hover:bg-white/[0.04] transition-all group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-electric-300 transition-colors">
                          {p.projectName}
                        </p>
                        <p className="text-[10px] text-slate-500">{p.district}, {p.state}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{p.overallScore}</p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-500">score</p>
                        </div>
                        <div
                          className="px-2 py-1 rounded text-[10px] font-bold border"
                          style={{
                            color: RISK_COLORS[p.riskLevel] ?? "#94a3b8",
                            borderColor: (RISK_COLORS[p.riskLevel] ?? "#94a3b8") + "60",
                            backgroundColor: (RISK_COLORS[p.riskLevel] ?? "#94a3b8") + "15",
                          }}
                        >
                          {p.riskLevel}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="py-8 text-center text-slate-600 text-xs italic">
      No data available
    </div>
  );
}
