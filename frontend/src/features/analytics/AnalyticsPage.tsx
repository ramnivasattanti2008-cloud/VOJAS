import { motion } from "framer-motion";
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
  Loader2,
  Users,
  Building2,
  LineChart as LineChartIcon,
} from "lucide-react";

const SUB_ANALYTICS: { title: string; desc: string; path: string; icon: React.ElementType; accent: string }[] = [
  { title: "MP Analytics", desc: "MPLADS Member of Parliament performance, utilization & longitudinal trends", path: "/analytics/mp", icon: Users, accent: "saffron" },
  { title: "Vendor Analytics", desc: "Vendor concentration, cross-constituency risk & payment benchmark", path: "/analytics/vendor", icon: Building2, accent: "electric" },
  { title: "Longitudinal Trends", desc: "MPLADS utilization across 15th–18th Lok Sabha", path: "/analytics/longitudinal", icon: LineChartIcon, accent: "saffron" },
];
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
import PageHeader from "@/components/ui/PageHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import { fadeUp, staggerContainer, EASE } from "@/components/ui/Animations";
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

function StatTile({ label, value, sub, icon: Icon, accent, glow }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; glow?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden group cursor-default"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.replace("from-", "bg-").replace(" to-", "-")}`}
          style={{ background: `${accent.includes("electric") ? "rgba(6,182,212,0.15)" : accent.includes("saffron") ? "rgba(251,146,60,0.15)" : accent.includes("red") ? "rgba(239,68,68,0.15)" : accent.includes("green") ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)"}` }}>
          <Icon className={`w-4 h-4 ${accent.includes("electric") ? "text-electric-400" : accent.includes("saffron") ? "text-saffron-400" : accent.includes("red") ? "text-red-400" : accent.includes("green") ? "text-green-400" : "text-blue-400"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent.includes("electric") ? "text-electric-300" : accent.includes("saffron") ? "text-saffron-300" : accent.includes("red") ? "text-red-300" : accent.includes("green") ? "text-green-300" : "text-white"}`}
        style={{ textShadow: glow ? `0 0 20px ${glow}` : "none" }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── Chart card wrapper ──────────────────────────────────────────────────────

function ChartCard({ title, sub, children, action, index }: {
  title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode; index?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric-500 to-electric-400 opacity-60" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function EmptyChart() {
  return (
    <div className="py-10 text-center text-slate-600 text-xs italic">
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
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Analytics &"
          gradientWord="Insights"
          accent="electric"
          icon={BarChart3}
          subtitle="Cross-platform metrics across projects, reports, anomalies, and risk"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Analytics" },
          ]}
          actions={
            <button
              onClick={() => analyticsQuery.refetch()}
              className="flex items-center gap-2 px-4 py-2 glass rounded-lg text-slate-300 hover:text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          }
        />
      </motion.div>

      {/* Sub-analytics hub */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {SUB_ANALYTICS.map((s) => {
          const Icon = s.icon;
          const accentBar = s.accent === "saffron"
            ? "from-saffron-500 to-saffron-400"
            : "from-electric-500 to-electric-400";
          return (
            <motion.div key={s.path} variants={fadeUp}>
              <Link
                to={s.path}
                className="block glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden group hover:ring-white/20 transition-all"
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentBar} opacity-60`} />
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className={s.accent === "saffron" ? "w-4 h-4 text-saffron-400" : "w-4 h-4 text-electric-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {s.title}
                      </p>
                      <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Section 1 — Project KPIs */}
      <section>
        <motion.div variants={fadeUp} custom={0}>
          <SectionTitle
            icon={Activity}
            title="Project Overview"
            badge={data.projects.total}
            badgeVariant="electric"
          />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3"
        >
          <StatTile label="Total Projects" value={data.projects.total} icon={FileText}
            accent="from-electric-500 to-electric-400" glow="#06b6d4"
            sub={`Avg budget ₹${(data.projects.avgBudget / 1_000_000).toFixed(1)}L`} />
          <StatTile label="Avg Utilization" value={`${(((data.projects.avgSpent / Math.max(data.projects.avgBudget, 1)) * 100) || 0).toFixed(0)}%`} icon={TrendingUp}
            accent="from-saffron-500 to-saffron-400" glow="#fb923c"
            sub="Across all projects" />
          <StatTile label="Total Reports" value={data.reports.total} icon={AlertTriangle}
            accent="from-blue-500 to-blue-400" glow="#3b82f6"
            sub={data.reports.avgResolutionDays !== null ? `Avg resolution ${data.reports.avgResolutionDays.toFixed(1)}d` : "No closed reports"} />
          <StatTile label="Open Anomalies" value={data.anomalies.open} icon={Shield}
            accent="from-red-500 to-red-400" glow="#ef4444"
            sub={`${data.anomalies.total} total flagged`} />
        </motion.div>
      </section>

      {/* Section 2 — Project charts */}
      <section>
        <motion.div variants={fadeUp} custom={2}>
          <SectionTitle icon={PieChart} title="Project Distribution" />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3"
        >
          <ChartCard title="Status Distribution" sub="By lifecycle status" index={3}>
            {statusBars.length > 0 ? (
              <BarChart data={statusBars} color="#3b82f6" formatValue={(v) => v.toString()} />
            ) : <EmptyChart />}
          </ChartCard>
          <ChartCard title="Sector Spread" sub="Projects by sector" index={4}>
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
          <ChartCard title="Top Sectors by Budget" sub="Allocated ₹" index={5}>
            {sectorBudgetBars.length > 0 ? (
              <BarChart
                data={sectorBudgetBars}
                color="#10b981"
                formatValue={(v) => `₹${(v / 1_000_000).toFixed(0)}L`}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </motion.div>
      </section>

      {/* Section 3 — Timeline */}
      <section>
        <motion.div variants={fadeUp} custom={6}>
          <SectionTitle icon={TrendingUp} title="Timeline" />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3"
        >
          <ChartCard title="Project Creation Trend" sub="New projects per month" index={7}>
            {monthlyCreation[0].data.length > 0 ? (
              <LineChart series={monthlyCreation} height={180} formatValue={(v) => v.toString()} />
            ) : <EmptyChart />}
          </ChartCard>
          <ChartCard title="Expenditure Trend" sub="Total ₹ per month" index={8}>
            {expenditureOverTime[0].data.length > 0 ? (
              <LineChart
                series={expenditureOverTime}
                height={180}
                formatValue={(v) => `₹${(v / 1_000_000).toFixed(1)}L`}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </motion.div>
      </section>

      {/* Section 4 — Citizen Reports */}
      <section>
        <motion.div variants={fadeUp} custom={9}>
          <SectionTitle icon={AlertTriangle} title="Citizen Reports" badge={data.reports.total} badgeVariant="blue" />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3"
        >
          <ChartCard title="Report Status" sub="By review state" index={10}>
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
          <ChartCard title="Report Categories" sub="What citizens flag most" index={11}>
            {reportCategoryBars.length > 0 ? (
              <BarChart
                data={reportCategoryBars}
                color="#8b5cf6"
                formatValue={(v) => v.toString()}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </motion.div>
      </section>

      {/* Section 5 — Anomalies */}
      <section>
        <motion.div variants={fadeUp} custom={12}>
          <SectionTitle icon={Shield} title="Anomalies" badge={data.anomalies.total} badgeVariant="red" />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3"
        >
          <ChartCard title="By Severity" sub="Detection rules firing" index={13}>
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
          <ChartCard title="By Category" sub="Rule types triggered" index={14}>
            {anomalyCategoryBars.length > 0 ? (
              <BarChart
                data={anomalyCategoryBars}
                color="#ef4444"
                formatValue={(v) => v.toString()}
              />
            ) : <EmptyChart />}
          </ChartCard>
        </motion.div>
      </section>

      {/* Section 6 — Financials */}
      <section>
        <motion.div variants={fadeUp} custom={15}>
          <SectionTitle icon={IndianRupee} title="Financials" />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3"
        >
          <StatTile
            label="Total Budget"
            value={`₹${(data.financial.totalBudget / 1_000_000).toFixed(2)}L`}
            icon={IndianRupee}
            accent="from-electric-500 to-electric-400" glow="#06b6d4"
            sub="Allocated across all projects"
          />
          <StatTile
            label="Total Spent"
            value={`₹${(data.financial.totalSpent / 1_000_000).toFixed(2)}L`}
            icon={IndianRupee}
            accent="from-green-500 to-green-400" glow="#10b981"
            sub={`Utilization ${data.financial.utilization.toFixed(1)}%`}
          />
          <StatTile
            label="Authorized + Pending"
            value={`₹${((data.financial.totalAuthorized + data.financial.totalPending) / 1_000_000).toFixed(2)}L`}
            icon={IndianRupee}
            accent="from-saffron-500 to-saffron-400" glow="#fb923c"
            sub={`${data.financial.totalAuthorized > 0 ? "Authorized" : ""}${data.financial.totalPending > 0 ? " · Pending" : ""}`}
          />
        </motion.div>

        {data.financial.byCategory.length > 0 && (
          <motion.div variants={fadeUp} custom={16} className="mt-4">
            <ChartCard title="Expenditure by Category" sub="Where money flows" index={16}>
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
          </motion.div>
        )}
      </section>

      {/* Section 7 — Risk */}
      <section>
        <motion.div variants={fadeUp} custom={17}>
          <SectionTitle icon={Shield} title="Risk Scoring" />
        </motion.div>
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3"
        >
          <ChartCard title="Risk Distribution" sub="Projects by risk tier" index={18}>
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

          <motion.div variants={fadeUp} custom={19} className="lg:col-span-2">
            <ChartCard
              title="Top Risk Projects"
              sub={`Top ${Math.min(5, data.risk.topProjects.length)} by score`}
              index={19}
              action={
                <Link to="/risk" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {data.risk.topProjects.length > 0 ? (
                <div className="space-y-2">
                  {data.risk.topProjects.slice(0, 5).map((p: TopRiskProject, idx: number) => (
                    <motion.div
                      key={p.projectId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.4, ease: EASE }}
                    >
                      <Link to={`/projects/${p.projectId}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-electric-500/30 hover:bg-electric-500/5 transition-all group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200 truncate group-hover:text-electric-300 transition-colors">
                            {p.projectName}
                          </p>
                          <p className="text-[10px] text-slate-500">{p.district}, {p.state}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={`text-lg font-bold tabular-nums ${p.riskLevel === "CRITICAL" ? "text-red-400" : p.riskLevel === "HIGH" ? "text-orange-400" : p.riskLevel === "MEDIUM" ? "text-amber-400" : "text-emerald-400"}`}
                              style={{ textShadow: "0 0 12px currentColor" }}>
                              {p.overallScore}
                            </p>
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
                    </motion.div>
                  ))}
                </div>
              ) : <EmptyChart />}
            </ChartCard>
          </motion.div>
        </motion.div>
      </section>
    </motion.div>
  );
}
