/**
 * AnalyticsPage — VOJAS 2.0 Cross-Platform Analytics
 *
 * IBM Carbon–inspired light theme. White cards, gray borders, semantic colors.
 * No glassmorphism, no glow, no gradients, no decorative animations.
 * All data from real hooks (no fabricated numbers).
 *
 * Layout: Hub → KPI strip → 2×3 distribution grid → 2×1 timeline → Reports → Anomalies → Financials → Risk
 */

import { Link } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  IndianRupee,
  Shield,
  RefreshCw,
  ArrowRight,
  Loader2,
  Users,
  Building2,
  LineChart as LineChartIcon,
  type LucideIcon,
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
import { cn } from "@/lib/utils";

const SUB_ANALYTICS: { title: string; desc: string; path: string; icon: LucideIcon; accent: "blue" | "amber" }[] = [
  { title: "MP Analytics", desc: "MPLADS Member of Parliament performance, utilization & longitudinal trends", path: "/analytics/mp", icon: Users, accent: "amber" },
  { title: "Vendor Analytics", desc: "Vendor concentration, cross-constituency risk & payment benchmark", path: "/analytics/vendor", icon: Building2, accent: "blue" },
  { title: "Longitudinal Trends", desc: "MPLADS utilization across 15th–18th Lok Sabha", path: "/analytics/longitudinal", icon: LineChartIcon, accent: "amber" },
];

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

// ── Section header (IBM Carbon pattern) ──────────────────────────────────────

function SectionHeader({
  title,
  description,
  badge,
  action,
}: {
  title: string;
  description?: string;
  badge?: number | string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900 leading-tight flex items-center gap-2">
          {title}
          {badge !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-100">
              {badge}
            </span>
          )}
        </h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action && (
        <Link
          to={action.href}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
        >
          {action.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── KPI card (Carbon pattern) ────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  Icon,
  accent = "blue",
}: {
  label: string;
  value: number | string;
  sub?: string;
  Icon: LucideIcon;
  accent?: "blue" | "red" | "amber" | "green" | "slate";
}) {
  const iconBg: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    slate: "bg-gray-100 text-gray-600",
  };
  const bar: Record<string, string> = {
    blue:  "bg-blue-500",
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    slate: "bg-gray-400",
  };
  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-full">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar[accent])} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", iconBg[accent])}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      <p className="text-sm text-gray-700 font-medium mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Chart card wrapper (Carbon pattern) ──────────────────────────────────────

function ChartCard({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="py-10 text-center text-gray-500 text-xs italic">
      No data available
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const analyticsQuery = useAnalyticsSummary();
  const data = analyticsQuery.data ?? null;
  const loading = analyticsQuery.isLoading;
  const error = analyticsQuery.error?.message ?? null;

  if (loading) return <LoadingState message="Loading analytics..." />;
  if (error) return <ErrorState message={error} onRetry={() => analyticsQuery.refetch()} />;
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

  const monthlyCreation: LineSeries[] = [{
    name: "Projects",
    data: data.projects.monthlyCreation.map((m) => ({
      period: m.month,
      value: m.count,
    })),
    color: "#3b82f6",
  }];

  const expenditureOverTime: LineSeries[] = [{
    name: "Expenditure",
    data: data.financial.byMonth.map((m) => ({
      period: m.month,
      value: m.amount,
    })),
    color: "#f59e0b",
  }];

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header (Carbon style — compact) */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gray-700" aria-hidden />
            Analytics & Insights
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Cross-platform metrics across projects, reports, anomalies, and risk
          </p>
        </div>
        <button
          onClick={() => analyticsQuery.refetch()}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Sub-analytics hub — 3 column nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SUB_ANALYTICS.map((s) => {
          const Icon = s.icon;
          const bar = s.accent === "amber" ? "bg-amber-500" : "bg-blue-500";
          const iconBg = s.accent === "amber" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600";
          return (
            <Link
              key={s.path}
              to={s.path}
              className="relative block bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar)} aria-hidden />
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded flex items-center justify-center shrink-0", iconBg)}>
                  <Icon className="w-4 h-4" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {s.title}
                    </p>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Section 1 — Project KPIs */}
      <div>
        <SectionHeader
          title="Project Overview"
          description="Aggregate project portfolio health"
          badge={data.projects.total}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Projects"
            value={data.projects.total}
            Icon={FileText}
            accent="blue"
            sub={`Avg budget ₹${(data.projects.avgBudget / 1_000_000).toFixed(1)}L`}
          />
          <KpiCard
            label="Avg Utilization"
            value={`${(((data.projects.avgSpent / Math.max(data.projects.avgBudget, 1)) * 100) || 0).toFixed(0)}%`}
            Icon={TrendingUp}
            accent="amber"
            sub="Across all projects"
          />
          <KpiCard
            label="Total Reports"
            value={data.reports.total}
            Icon={AlertTriangle}
            accent="slate"
            sub={data.reports.avgResolutionDays !== null ? `Avg resolution ${data.reports.avgResolutionDays.toFixed(1)}d` : "No closed reports"}
          />
          <KpiCard
            label="Open Anomalies"
            value={data.anomalies.open}
            Icon={Shield}
            accent="red"
            sub={`${data.anomalies.total} total flagged`}
          />
        </div>
      </div>

      {/* Section 2 — Project distribution */}
      <div>
        <SectionHeader
          title="Project Distribution"
          description="Status, sector and budget allocation"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
      </div>

      {/* Section 3 — Timeline */}
      <div>
        <SectionHeader
          title="Timeline"
          description="Monthly trends in project creation and expenditure"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Project Creation Trend" sub="New projects per month">
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
      </div>

      {/* Section 4 — Citizen Reports */}
      <div>
        <SectionHeader
          title="Citizen Reports"
          description="Status and category breakdown of citizen submissions"
          badge={data.reports.total}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
      </div>

      {/* Section 5 — Anomalies */}
      <div>
        <SectionHeader
          title="Anomalies"
          description="Detection engine output by severity and category"
          badge={data.anomalies.total}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
      </div>

      {/* Section 6 — Financials */}
      <div>
        <SectionHeader
          title="Financials"
          description="Budget, spending and category-level breakdown"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Total Budget"
            value={`₹${(data.financial.totalBudget / 1_000_000).toFixed(2)}L`}
            Icon={IndianRupee}
            accent="blue"
            sub="Allocated across all projects"
          />
          <KpiCard
            label="Total Spent"
            value={`₹${(data.financial.totalSpent / 1_000_000).toFixed(2)}L`}
            Icon={IndianRupee}
            accent="green"
            sub={`Utilization ${data.financial.utilization.toFixed(1)}%`}
          />
          <KpiCard
            label="Authorized + Pending"
            value={`₹${((data.financial.totalAuthorized + data.financial.totalPending) / 1_000_000).toFixed(2)}L`}
            Icon={IndianRupee}
            accent="amber"
            sub={`${data.financial.totalAuthorized > 0 ? "Authorized" : ""}${data.financial.totalPending > 0 ? " · Pending" : ""}`}
          />
        </div>

        {data.financial.byCategory.length > 0 && (
          <div className="mt-3">
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
      </div>

      {/* Section 7 — Risk scoring */}
      <div>
        <SectionHeader
          title="Risk Scoring"
          description="Project risk distribution and top risk projects"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
                <Link
                  to="/risk"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.risk.topProjects.length > 0 ? (
                <div className="space-y-2">
                  {data.risk.topProjects.slice(0, 5).map((p: TopRiskProject) => {
                    const riskColor = RISK_COLORS[p.riskLevel] ?? "#94a3b8";
                    const riskText: Record<string, string> = {
                      LOW:      "text-green-700",
                      MEDIUM:   "text-blue-700",
                      HIGH:     "text-amber-700",
                      CRITICAL: "text-red-700",
                    };
                    const riskBg: Record<string, string> = {
                      LOW:      "bg-green-50 border-green-200",
                      MEDIUM:   "bg-blue-50 border-blue-200",
                      HIGH:     "bg-amber-50 border-amber-200",
                      CRITICAL: "bg-red-50 border-red-200",
                    };
                    return (
                      <Link
                        key={p.projectId}
                        to={`/projects/${p.projectId}`}
                        className="flex items-center justify-between p-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
                            {p.projectName}
                          </p>
                          <p className="text-[10px] text-gray-500">{p.district}, {p.state}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={cn("text-lg font-semibold tabular-nums", riskText[p.riskLevel] ?? "text-gray-700")}>
                              {p.overallScore}
                            </p>
                            <p className="text-[9px] uppercase tracking-wider text-gray-500">score</p>
                          </div>
                          <div
                            className={cn("px-2 py-1 rounded text-[10px] font-semibold border", riskBg[p.riskLevel] ?? "bg-gray-50 border-gray-200")}
                            style={{ color: riskColor }}
                          >
                            {p.riskLevel}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
