import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Crown, Shield, TrendingUp, AlertTriangle, CheckCircle2, Users, ChevronRight,
  IndianRupee, BarChart3, FileText, Eye, Building2, MapPin, ArrowUpRight,
  Calendar, Sparkles, AlertOctagon, ScrollText, type LucideIcon,
} from "lucide-react";
import { useProjectStats } from "@/hooks/useProjects";
import { useRiskStats, useRiskList } from "@/hooks/useRisk";
import { useAnomalyStats } from "@/hooks/useAnomalies";
import { useReportStats } from "@/hooks/useReports";
import PageHeader from "@/components/ui/PageHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import { fadeUp, staggerContainer, EASE } from "@/components/ui/Animations";
import { LoadingState, ErrorState, Badge } from "@/components/ui";
import LiveTicker from "@/components/dashboard/LiveTicker";
import QuickActions, { type QuickAction } from "@/components/dashboard/QuickActions";
import MyTasks, { type TaskItem } from "@/components/dashboard/MyTasks";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";
import { TrendBar } from "@/components/dashboard/TrendIndicator";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${(amount.toFixed(0))}`;
}

// ── Risk tier styling ─────────────────────────────────────────────────────────

const RISK_DOT: Record<string, string> = {
  LOW:      "bg-emerald-400",
  MEDIUM:   "bg-amber-400",
  HIGH:     "bg-orange-400",
  CRITICAL: "bg-red-400",
};
const RISK_TEXT: Record<string, string> = {
  LOW:      "text-emerald-400",
  MEDIUM:   "text-amber-400",
  HIGH:     "text-orange-400",
  CRITICAL: "text-red-400",
};
const RISK_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, index }: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: LucideIcon;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden group cursor-default"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent}`} />
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          accent.includes("saffron") ? "bg-saffron-500/15 text-saffron-400" :
          accent.includes("red") ? "bg-red-500/15 text-red-400" :
          accent.includes("green") ? "bg-green-500/15 text-green-400" :
          accent.includes("electric") ? "bg-electric-500/15 text-electric-400" :
          "bg-blue-500/15 text-blue-400"
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-3xl font-bold leading-none tabular-nums ${
        accent.includes("saffron") ? "text-saffron-300" :
        accent.includes("red") ? "text-red-300" :
        accent.includes("green") ? "text-green-300" :
        accent.includes("electric") ? "text-electric-300" :
        "text-blue-300"
      }`} style={{ textShadow: "0 0 24px currentColor" }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-500 mt-1.5">{sub}</p>}
    </motion.div>
  );
}

// ── Severity badge for critical projects list ─────────────────────────────────

function SeverityChip({ level }: { level: string }) {
  const v: any = level === "CRITICAL" ? "red" : level === "HIGH" ? "amber" : level === "MEDIUM" ? "blue" : "green";
  return <Badge variant={v} size="xs" dot pulse={level === "CRITICAL"}>{level}</Badge>;
}

// ── Main ────────────────────────────────────────────────────────────────────────

export default function MPDashboard() {
  const navigate = useNavigate();

  const projectStatsQuery = useProjectStats();
  const riskStatsQuery = useRiskStats();
  const anomalyStatsQuery = useAnomalyStats();
  const reportStatsQuery = useReportStats();
  const riskListQuery = useRiskList({ sortBy: "overallScore", sortOrder: "desc", limit: 5 });

  const pStats = projectStatsQuery.data?.stats;
  const rStats = riskStatsQuery.data;
  const aStats = anomalyStatsQuery.data;
  const rpStats = reportStatsQuery.data?.stats;
  const topRisks = riskListQuery.data?.items ?? [];

  const loading = projectStatsQuery.isLoading || riskStatsQuery.isLoading;
  const error = projectStatsQuery.error?.message
    || riskStatsQuery.error?.message
    || anomalyStatsQuery.error?.message
    || reportStatsQuery.error?.message;

  // Derived
  const totalBudget = pStats?.totalBudget ?? 0;
  const totalSpent = pStats?.totalSpent ?? 0;
  const utilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";
  const riskDist = rStats?.distribution ?? { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const totalProjects = rStats?.totalProjects ?? 0;
  const parliamentSession = `Winter Session · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  // Build parliamentary tasks
  const tasks: TaskItem[] = [
    ...(aStats && aStats.critical > 0 ? [{
      id: "crit-anoms", title: `${aStats.critical} critical anomalies`, subtitle: "Need parliamentary review",
      icon: AlertOctagon, href: "/anomalies?severity=CRITICAL",
      meta: "URGENT", accent: "red" as const, urgent: true,
    }] : []),
    ...(rpStats && rpStats.criticalOpen > 0 ? [{
      id: "crit-reports", title: `${rpStats.criticalOpen} critical citizen reports`, subtitle: "Pending assignment",
      icon: FileText, href: "/reports?severity=CRITICAL",
      meta: "REVIEW", accent: "amber" as const, urgent: true,
    }] : []),
    ...(rpStats && rpStats.unassigned > 0 ? [{
      id: "unassigned", title: `${rpStats.unassigned} unassigned reports`, subtitle: "Awaiting officer routing",
      icon: Users, href: "/reports?status=SUBMITTED",
      meta: "QUEUE", accent: "electric" as const,
    }] : []),
    {
      id: "utilization", title: `Budget utilization at ${utilization}%`, subtitle: `${formatINR(totalSpent)} of ${formatINR(totalBudget)}`,
      icon: TrendingUp, href: "/analytics",
      meta: "TREND", accent: "green" as const,
    },
  ];

  // Quick action tiles
  const actions: QuickAction[] = [
    { label: "Risk Dashboard",   description: "Top risk projects by score", icon: Shield,     href: "/risk",      accent: "red"      },
    { label: "Open Anomalies",   description: "AI-detected issues",         icon: AlertTriangle, href: "/anomalies", accent: "amber"   },
    { label: "Citizen Reports",  description: "Public submissions queue",   icon: Users,         href: "/reports",  accent: "electric", badge: rpStats?.total },
    { label: "Projects",         description: "All sanctioned works",       icon: Building2,     href: "/projects", accent: "saffron" },
    { label: "Analytics",        description: "Financial & sector trends",  icon: BarChart3,     href: "/analytics", accent: "green"  },
    { label: "Parliamentary Map", description: "Geographic view",            icon: MapPin,        href: "/map",      accent: "blue"    },
  ];

  if (loading) return <LoadingState message="Loading parliamentary overview..." />;
  if (error) return <ErrorState message={error} onRetry={() => {
    projectStatsQuery.refetch(); riskStatsQuery.refetch(); anomalyStatsQuery.refetch(); reportStatsQuery.refetch();
  }} />;

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Page header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Parliamentary"
          gradientWord="Oversight"
          accent="saffron"
          icon={Crown}
          subtitle={`MPLAD Scheme · Constituency accountability · ${parliamentSession}`}
          breadcrumbs={[{ label: "Home" }]}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="emerald" size="sm" dot pulse>
                LIVE
              </Badge>
              <Badge variant="amber" size="sm">
                <Calendar className="w-3 h-3" /> {parliamentSession}
              </Badge>
            </div>
          }
        />
      </motion.div>

      {/* MP Welcome banner — saffron hero */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl">
        {/* Saffron mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-saffron-900/40 via-navy-950/85 to-navy-950" />
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle at 15% 50%, rgba(251,146,60,0.5) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(120,53,15,0.6) 0%, transparent 40%)",
          }} />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Crown silhouette accent */}
        <Crown className="absolute -right-12 -bottom-12 w-64 h-64 text-saffron-500/10 pointer-events-none" />

        <div className="relative px-6 py-8 md:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="px-2.5 py-1 rounded-full bg-saffron-500/15 border border-saffron-500/30 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-saffron-400" />
                <span className="text-saffron-400 text-[10px] font-bold uppercase tracking-widest">Member of Parliament</span>
              </div>
              <Badge variant="emerald" size="xs" dot pulse>Live</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
              Constituency <span className="bg-gradient-to-r from-saffron-400 to-orange-300 bg-clip-text text-transparent">Accountability</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              A live view of MPLAD scheme performance across your constituency.
              Flags high-risk projects and anomalies requiring parliamentary attention —
              AI-computed risk indicators, not legal findings.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Active Projects</p>
              <p className="text-5xl font-bold text-saffron-300 tabular-nums leading-none" style={{ textShadow: "0 0 32px rgba(251,146,60,0.5)" }}>
                <AnimatedCounter value={totalProjects} duration={1.8} />
              </p>
            </div>
            <div className="flex gap-2">
              {RISK_LEVELS.map(level => (
                <div key={level} className="flex items-center gap-1.5 text-[10px] text-slate-400 px-2 py-1 rounded-md bg-white/5">
                  <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[level]}`} />
                  <span className="font-semibold tabular-nums">{riskDist[level] ?? 0}</span>
                  <span className="text-slate-600">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Live ticker — parliamentary signals */}
      <motion.div variants={fadeUp}><LiveTicker /></motion.div>

      {/* Key Metrics */}
      <motion.div variants={fadeUp} custom={1} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Projects" value={<AnimatedCounter value={totalProjects} />} icon={FileText}
          accent="from-saffron-500 to-saffron-400" index={1} sub="Across all districts" />
        <StatCard label="Total Deployed" value={formatINR(totalSpent)} icon={IndianRupee}
          accent="from-electric-500 to-electric-400" index={2} sub={`of ${formatINR(totalBudget)} budget`} />
        <StatCard label="Utilization" value={`${utilization}%`} icon={TrendingUp}
          accent="from-green-500 to-green-400" index={3} sub="Budget used" />
        <StatCard label="Open Anomalies" value={aStats?.open ?? 0} icon={AlertTriangle}
          accent="from-red-500 to-red-400" index={4} sub={`${aStats?.critical ?? 0} critical`} />
      </motion.div>

      {/* Quick Actions — role-aware navigation tiles */}
      <motion.div variants={fadeUp} custom={2}>
        <QuickActions title="Parliamentary Actions" columns={6} actions={actions} />
      </motion.div>

      {/* Two-column: My Tasks + Budget Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} custom={3} className="lg:col-span-1">
          <MyTasks title="Action Required" items={tasks} viewAllHref="/anomalies" />
        </motion.div>

        {pStats && (
          <motion.div variants={fadeUp} custom={4} className="lg:col-span-2 glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-saffron-500 to-saffron-400 opacity-60" />
            <SectionTitle icon={IndianRupee} title="Budget Summary" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-slate-500 mb-1">Total Budget</p>
                <p className="text-lg font-bold text-white">{formatINR(pStats.totalBudget)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-slate-500 mb-1">Total Spent</p>
                <p className="text-lg font-bold text-saffron-400">{formatINR(pStats.totalSpent)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-slate-500 mb-1">Remaining</p>
                <p className="text-lg font-bold text-electric-400">{formatINR(pStats.totalBudget - pStats.totalSpent)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-slate-500 mb-1">Utilization</p>
                <p className={`text-lg font-bold ${(Number(utilization) > 80) ? "text-green-400" : "text-saffron-400"}`}>
                  {utilization}%
                </p>
              </div>
            </div>
            {/* Budget progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 font-mono">
                <span>Budget utilization</span>
                <span>{formatINR(pStats.totalSpent)} / {formatINR(pStats.totalBudget)}</span>
              </div>
              <div className="h-2.5 bg-navy-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-saffron-600 to-saffron-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Number(utilization), 100)}%` }}
                  transition={{ duration: 1.5, ease: EASE }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-saffron-500" />
                  <span className="text-slate-500">Spent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-navy-800" />
                  <span className="text-slate-500">Remaining</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-2 h-2 text-electric-400" />
                  <span className="text-slate-500">AI-tracked</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Two-column: Risk Distribution + Anomaly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk distribution */}
        {rStats && (
          <motion.div variants={fadeUp} custom={5} className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-400 opacity-60" />
            <SectionTitle icon={Shield} title="Risk Distribution" />
            <div className="mt-4 space-y-3">
              {RISK_LEVELS.map((level) => {
                const count = rStats.distribution[level];
                const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <div className={`w-16 text-xs font-semibold uppercase tracking-wider ${RISK_TEXT[level]}`}>
                      {level}
                    </div>
                    <div className="flex-1">
                      <TrendBar value={pct} max={100} accent={
                        level === "CRITICAL" ? "red" :
                        level === "HIGH"     ? "saffron" :
                        level === "MEDIUM"   ? "saffron" :
                        "green"
                      } />
                    </div>
                    <div className="w-6 text-right">
                      <span className={`text-sm font-bold tabular-nums ${RISK_TEXT[level]}`}>{count}</span>
                    </div>
                    <div className="w-10 text-right text-[10px] text-slate-500 font-mono">
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Avg risk score */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">Average Risk Score</span>
              <span className={`text-lg font-bold tabular-nums ${rStats.avgScore >= 60 ? "text-red-400" : rStats.avgScore >= 40 ? "text-amber-400" : "text-green-400"}`}
                style={{ textShadow: "0 0 16px currentColor" }}>
                {rStats.avgScore.toFixed(1)}
              </span>
            </div>
            <Link to="/risk"
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-red-300 hover:border-red-500/30 transition-all">
              <Shield className="w-3.5 h-3.5" /> Open Risk Dashboard
              <ChevronRight className="w-3 h-3 ml-auto" />
            </Link>
          </motion.div>
        )}

        {/* Anomaly summary */}
        {aStats && (
          <motion.div variants={fadeUp} custom={6} className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-60" />
            <SectionTitle icon={AlertTriangle} title="Anomaly Detection" badge={aStats.total} badgeVariant="amber" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                { label: "Open", value: aStats.open, color: "text-amber-400", bg: "bg-amber-500/15", pulse: false },
                { label: "Critical", value: aStats.critical, color: "text-red-400", bg: "bg-red-500/15", pulse: aStats.critical > 0 },
                { label: "High", value: aStats.high, color: "text-orange-400", bg: "bg-orange-500/15", pulse: false },
                { label: "Total", value: aStats.total, color: "text-slate-400", bg: "bg-slate-500/15", pulse: false },
              ] as const).map((s, i) => (
                <motion.div key={s.label} variants={fadeUp} custom={7 + i}
                  className={`rounded-xl p-3 border ${s.bg} border-white/5 text-center`}>
                  <p className={`text-2xl font-bold tabular-nums ${s.color}`} style={{ textShadow: "0 0 12px currentColor" }}>
                    <AnimatedCounter value={s.value} duration={1.4} />
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
                  {s.pulse && (
                    <span className="relative flex h-2 w-2 mx-auto mt-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            <button onClick={() => navigate("/anomalies")}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-amber-300 hover:border-amber-500/30 transition-all">
              <Eye className="w-3.5 h-3.5" /> View all anomalies
              <ChevronRight className="w-3 h-3 ml-auto" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Top Risk Projects — actionable list for MP */}
      {topRisks.length > 0 && (
        <motion.div variants={fadeUp} custom={8} className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-400 opacity-60" />
          <SectionTitle icon={AlertOctagon} title="Top Risk Projects Requiring Attention" badge={topRisks.length} badgeVariant="red"
            viewAll={{ label: "Open Risk Dashboard", href: "/risk" }} />
          <div className="mt-4 space-y-2">
            {topRisks.map((risk: any, i) => (
              <motion.div key={risk.id} variants={fadeUp} custom={9 + i}
                initial="hidden" animate="visible">
                <Link to={`/projects/${risk.projectId}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/40 border border-white/5 hover:border-red-500/30 hover:bg-red-500/[0.03] transition-all group">
                  <SeverityChip level={risk.riskLevel} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 group-hover:text-white font-medium truncate">{risk.project?.name ?? "Project"}</p>
                    <p className="text-[10px] text-slate-600 truncate">{risk.project?.district}, {risk.project?.state} · Score {risk.overallScore}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-red-300 tabular-nums" style={{ textShadow: "0 0 8px currentColor" }}>
                      {risk.overallScore}
                    </p>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">risk</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Project Status Overview */}
      {pStats && (
        <motion.div variants={fadeUp} custom={14} className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric-500 to-electric-400 opacity-60" />
          <SectionTitle icon={CheckCircle2} title="Project Status Overview" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
            {([
              { label: "Proposed", key: "PROPOSED", color: "text-slate-400", dot: "bg-slate-400" },
              { label: "Approved", key: "APPROVED", color: "text-blue-400", dot: "bg-blue-400" },
              { label: "In Progress", key: "IN_PROGRESS", color: "text-saffron-400", dot: "bg-saffron-400" },
              { label: "Completed", key: "COMPLETED", color: "text-green-400", dot: "bg-green-400" },
              { label: "Verified", key: "VERIFIED", color: "text-emerald-400", dot: "bg-emerald-400" },
              { label: "Cancelled", key: "CANCELLED", color: "text-red-400", dot: "bg-red-400" },
            ] as const).map((s, i) => {
              const count = pStats.byStatus[s.key] ?? 0;
              const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
              return (
                <motion.div key={s.key} variants={fadeUp} custom={15 + i}
                  className="text-center p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/projects?status=${s.key}`)}>
                  <p className={`text-xl font-bold ${s.color}`} style={{ textShadow: "0 0 8px currentColor" }}>{count}</p>
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto my-1 ${s.dot}`} />
                  <p className="text-[9px] text-slate-500 group-hover:text-slate-400 transition-colors">{s.label}</p>
                  <p className="text-[9px] text-slate-600 tabular-nums">{pct.toFixed(0)}%</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Citizen Reports summary */}
      {rpStats && (
        <motion.div variants={fadeUp} custom={20} className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-60" />
          <SectionTitle icon={Users} title="Citizen Reports" badge={rpStats.total} badgeVariant="amber" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {([
              { label: "Total", value: rpStats.total, sub: "submitted", accent: "from-slate-500 to-slate-400", color: "text-slate-300" },
              { label: "Critical Open", value: rpStats.criticalOpen, sub: "need attention", accent: "from-red-500 to-red-400", color: "text-red-300" },
              { label: "Unassigned", value: rpStats.unassigned, sub: "pending review", accent: "from-saffron-500 to-saffron-400", color: "text-saffron-300" },
              { label: "Last 7 Days", value: rpStats.last7Days, sub: "new submissions", accent: "from-green-500 to-green-400", color: "text-green-300" },
            ] as const).map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={21 + i}
                className="rounded-xl p-3 border bg-white/[0.02] border-white/5 text-center">
                <p className={`text-xl font-bold tabular-nums ${s.color}`} style={{ textShadow: "0 0 8px currentColor" }}>{s.value}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
                <p className="text-[9px] text-slate-600">{s.sub}</p>
              </motion.div>
            ))}
          </div>
          <button onClick={() => navigate("/reports")}
            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-electric-300 hover:border-electric-500/30 transition-all">
            <BarChart3 className="w-3.5 h-3.5" />
            Review citizen reports
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
        </motion.div>
      )}

      {/* Trust footer */}
      <motion.div variants={fadeUp} custom={26} className="glass rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <ScrollText className="w-4 h-4 text-saffron-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-300 font-medium mb-0.5">Parliamentary Accountability Portal</p>
          <p className="leading-relaxed">
            Data is updated in real-time from district-level government systems.
            Anomaly scores are AI-computed risk indicators, not legal findings.
            All verification remains with authorized officers under MPLAD guidelines.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
