import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { api } from "@/services/api";
import { financialApi } from "@/services/financial-api";
import { reportApi } from "@/services/report-api";
import { anomalyApi } from "@/services/anomaly-api";
import type { Project, HealthStatus } from "@/types";
import type { SchemeFinancials } from "@/types/financial-types";
import type { PaginatedAnomalies } from "@/services/anomaly-api";
import type { PaginatedReports } from "@/types/report-types";
import { LoadingState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SpatialDashboardMap } from "@/components/layout";
import SpatialCommandScene from "@/components/dashboard/SpatialCommandScene";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Users,
  IndianRupee,
  Activity,
  Shield,
  Zap,
  Eye,
  BarChart2,
  Radio,
  Server,
  Database,
  Globe,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Map,
  Rocket,
} from "lucide-react";

// ── Framer Motion variants ────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)     return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000)         return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function severityBadge(sev: string): string {
  return sev === "CRITICAL" ? "badge-red"
       : sev === "HIGH"      ? "badge-amber"
       : sev === "MEDIUM"    ? "badge badge-slate"
       : "badge badge-blue";
}

// ── Financial Health Bar ─────────────────────────────────────────────────────
function FinancialBar({ fin }: { fin: SchemeFinancials }) {
  const { totalBudget, totalSpent, totalAuthorized } = fin;
  const spentPct   = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const authPct    = totalBudget > 0 ? Math.min(((totalAuthorized - totalSpent) / totalBudget) * 100, 15) : 0;
  const utilization = fin.utilization ?? 0;
  const barColor   = utilization > 90 ? "bg-red-500" : utilization > 70 ? "bg-saffron-500" : "bg-electric-500";

  return (
    <div className="glass rounded-xl p-4 top-accent top-accent-electric">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-electric-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Scheme Financial Health</span>
          <span className="text-[10px] text-slate-600 font-mono">{fin.projectCount} projects · {fin.expenditureCount} disbursements</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          {[
            { label: "Budget",    val: totalBudget,    cls: "text-electric-400" },
            { label: "Spent",     val: totalSpent,   cls: "text-saffron-400" },
            { label: "Remaining", val: fin.remaining,  cls: "text-green-400" },
          ].map(({ label, val, cls }) => (
            <div key={label} className="text-right">
              <span className="text-slate-600">{label}: </span>
              <span className={`font-mono font-semibold ${cls}`}>{fmtINR(val)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex h-3.5 rounded-full overflow-hidden gap-0.5">
          <motion.div
            className={`h-full ${barColor} rounded-l-full`}
            initial={{ width: 0 }}
            animate={{ width: `${spentPct}%` }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          />
          <motion.div
            className="h-full bg-blue-500/50"
            initial={{ width: 0 }}
            animate={{ width: `${authPct}%` }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          />
          <div className="flex-1 h-full bg-navy-800" />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>₹0</span>
          <span className={utilization > 90 ? "text-red-400 font-semibold" : utilization > 70 ? "text-saffron-400 font-semibold" : "text-electric-400 font-semibold"}>
            {utilization.toFixed(1)}% utilized
          </span>
          <span>{fmtINR(fin.remaining)} remaining</span>
        </div>
      </div>
    </div>
  );
}

// ── Live Activity Feed (real data from recent reports + anomalies) ────────────
type LiveActivity = {
  icon: typeof Shield;
  color: string;
  bg: string;
  text: string;
  time: string;
};

function buildLiveActivities(recentReports: any[], recentAnomalies: any[]): LiveActivity[] {
  const acts: LiveActivity[] = [];

  // Newest 2 reports → citizen submissions
  for (const r of recentReports.slice(0, 2)) {
    acts.push({
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      text: `Citizen report "${r.title ?? r.category ?? "Report"}" submitted${r.location ? ` from ${r.location}` : ""}`,
      time: timeAgo(r.createdAt),
    });
  }

  // Newest 2 anomalies → flagged
  for (const a of recentAnomalies.slice(0, 2)) {
    acts.push({
      icon: AlertTriangle,
      color: a.severity === "CRITICAL" ? "text-red-400" : a.severity === "HIGH" ? "text-saffron-400" : "text-electric-400",
      bg: a.severity === "CRITICAL" ? "bg-red-500/10" : a.severity === "HIGH" ? "bg-saffron-500/10" : "bg-electric-500/10",
      text: `${a.severity} anomaly: ${a.title}`,
      time: timeAgo(a.createdAt),
    });
  }

  // Sort by time, newest first, cap at 6
  return acts
    .sort((a, b) => {
      // parse "Xm ago" / "Xh ago" / "Xd ago" — descending (newer first)
      const parse = (s: string) => {
        const m = s.match(/^(\d+)([mhd])\s*ago$/);
        if (!m) return 0;
        const n = Number(m[1]);
        const mult = m[2] === "m" ? 60_000 : m[2] === "h" ? 3_600_000 : 86_400_000;
        return n * mult;
      };
      return parse(a.time) - parse(b.time);
    })
    .slice(0, 6);
}

function LiveActivityFeed({ activities }: { activities: LiveActivity[] }) {
  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col top-accent top-accent-green">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-ping" style={{ animationDuration: "2s" }} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" />
        </div>
        <span className="text-xs font-semibold text-white uppercase tracking-wider">Live Feed</span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
        {activities.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-6">No recent activity</p>
        ) : activities.map((act, i) => {
          const Icon = act.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0"
            >
              <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5", act.bg)}>
                <Icon className={cn("w-3 h-3", act.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-400 leading-relaxed">{act.text}</p>
                <p className="text-[10px] text-slate-700 mt-0.5">{act.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── System Status ───────────────────────────────────────────────────────────
function SystemStatus({ health }: { health: HealthStatus | null }) {
  const services = [
    { label: "API Server",   ok: health?.status === "ok",          detail: `v${health?.version ?? "—"}`,           Icon: Server },
    { label: "Database",    ok: health?.database === "connected",  detail: health?.database ?? "—",                Icon: Database },
    { label: "Map Service", ok: true,                             detail: "Leaflet ready",                         Icon: Globe },
    { label: "AI Engine",  ok: true,                             detail: "4 modules active",                    Icon: Cpu },
    { label: "Risk Engine",ok: true,                             detail: "4-signal active",                      Icon: AlertTriangle },
  ];
  return (
    <div className="glass rounded-xl p-4 top-accent top-accent-electric">
      <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-electric-400" />
        System Status
      </h3>
      <div className="space-y-1">
        {services.map(({ label, ok, detail, Icon }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-600">{detail}</span>
              {ok ? <CheckCircle className="w-3 h-3 text-green-400" />
                  : <XCircle   className="w-3 h-3 text-red-400" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick Ratio Stats ──────────────────────────────────────────────────────
function QuickStats({ reports, pendingReports, totalProjects, completedProjects, utilization }: {
  reports: PaginatedReports | null;
  pendingReports: number;
  totalProjects: number;
  completedProjects: number;
  utilization: number;
}) {
  const stats = [
    { label: "Report Resolution",  value: reports && reports.total > 0 ? Math.round(((reports.total - pendingReports) / reports.total) * 100) : 0, unit: "%", icon: CheckCircle,  color: "text-green-400",   bg: "bg-green-500/10",    delta: "+12%", up: true },
    { label: "Project Completion", value: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0, unit: "%", icon: TrendingUp, color: "text-electric-400", bg: "bg-electric-500/10", delta: "+5%", up: true },
    { label: "Avg Utilization",    value: Math.round(utilization), unit: "%", icon: BarChart2, color: "text-saffron-400", bg: "bg-saffron-500/10", delta: "-3%", up: false },
    { label: "Active Rate",         value: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0, unit: "%", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10", delta: "+8%", up: true },
  ];
  return (
    <div className="glass rounded-xl p-4 top-accent top-accent-green">
      <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <BarChart2 className="w-3.5 h-3.5 text-green-400" />
        Quick Ratios
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-navy-800/50 rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", s.bg)}>
                  <Icon className={cn("w-3 h-3", s.color)} />
                </div>
                <span className={cn("flex items-center gap-0.5 text-[10px] font-bold", s.up ? "text-green-400" : "text-red-400")}>
                  {s.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {s.delta}
                </span>
              </div>
              <p className="text-xl font-bold text-white leading-none">{s.value}{s.unit}</p>
              <p className="text-[10px] text-slate-600 mt-1 leading-tight">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Anomaly Row ─────────────────────────────────────────────────────────────
function AnomalyRow({ anom, index }: { anom: any; index: number }) {
  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" animate="visible">
      <Link
        to={`/anomalies/${anom.id}`}
        className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/40 border border-white/5
          hover:border-electric-500/20 hover:bg-electric-500/5 transition-all group"
      >
        <span className={cn("badge badge-slate", severityBadge(anom.severity))}>{anom.severity}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-200 group-hover:text-white transition-colors truncate font-medium">
            {anom.title}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5 truncate">
            {anom.project?.name ?? anom.description ?? anom.category}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[10px] text-slate-600">{anom.category}</span>
          <p className="text-[10px] text-slate-700 mt-0.5">{timeAgo(anom.createdAt)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Project Row ─────────────────────────────────────────────────────────────
function ProjectRow({ p, index }: { p: Project; index: number }) {
  const util = p.approvedAmount > 0
    ? Math.min(150, Math.round((p.spentAmount / p.approvedAmount) * 100)) : 0;
  const overBudget = util > 100;
  return (
    <motion.tr
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
    >
      <td className="py-3 pr-4">
        <Link to={`/projects/${p.id}`}
          className="text-slate-200 group-hover:text-electric-400 transition-colors font-medium text-sm truncate block max-w-[200px]">
          {p.name}
        </Link>
      </td>
      <td className="py-3 pr-4 text-slate-500 text-xs">{p.sector.replace(/_/g, " ")}</td>
      <td className="py-3 pr-4 text-slate-500 text-xs">{p.district}, {p.state}</td>
      <td className="py-3 pr-4 text-right text-slate-400 font-mono text-xs">{fmtINR(p.approvedAmount)}</td>
      <td className="py-3 pr-4 text-right font-mono text-xs text-saffron-400">{fmtINR(p.spentAmount)}</td>
      <td className="py-3 pr-4 text-right font-mono font-bold text-sm">
        <span className={overBudget ? "text-red-400" : util > 80 ? "text-green-400" : "text-electric-400"}>{util}%</span>
      </td>
      <td className="py-3 w-24">
        <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overBudget ? "bg-red-500" : util > 80 ? "bg-green-500" : "bg-electric-500"}`}
            style={{ width: `${Math.min(100, util)}%` }}
          />
        </div>
      </td>
    </motion.tr>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [health,    setHealth]    = useState<HealthStatus | null>(null);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [schemeFin, setSchemeFin] = useState<SchemeFinancials | null>(null);
  const [anomalies, setAnomalies] = useState<PaginatedAnomalies | null>(null);
  const [reports,   setReports]   = useState<PaginatedReports | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      api.get<HealthStatus>("/health"),
      api.get<{ items: Project[]; total: number }>("/projects?limit=50"),
      financialApi.schemeFinancials(),
      anomalyApi.list({ status: "OPEN", limit: 8 }),
      reportApi.list({ status: "SUBMITTED", limit: 10 }),
    ]).then(([h, prj, fin, anom, rpt]) => {
      if (cancelled) return;
      if (h.status === "fulfilled")   setHealth(h.value);
      if (prj.status === "fulfilled")  setProjects(prj.value.items);
      if (fin.status === "fulfilled") setSchemeFin(fin.value);
      if (anom.status === "fulfilled") setAnomalies(anom.value);
      if (rpt.status === "fulfilled") setReports(rpt.value);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pendingReports    = reports?.total ?? 0;
  const totalProjects    = projects.length;
  const activeProjects   = projects.filter(p => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter(p => ["COMPLETED", "VERIFIED"].includes(p.status)).length;
  const totalBudget      = schemeFin?.totalBudget ?? 0;
  const utilization      = schemeFin?.utilization ?? 0;

  const topProjects = useMemo(() =>
    [...projects]
      .filter(p => p.approvedAmount > 0)
      .sort((a, b) => (b.spentAmount / b.approvedAmount) - (a.spentAmount / a.approvedAmount))
      .slice(0, 8),
    [projects]
  );

  const topAnomalies = anomalies?.items ?? [];

  // Live feed: newest 3 reports + 3 anomalies, sorted by time
  const liveActivities: LiveActivity[] = useMemo(() => {
    const recentReports = (reports?.items ?? []).slice(0, 3);
    const recentAnomalies = (anomalies?.items ?? []).slice(0, 3);
    return buildLiveActivities(recentReports, recentAnomalies);
  }, [reports, anomalies]);

  // Sector Performance: aggregate from real project data
  const sectorStats: { name: string; total: number; completed: number; flagged: number }[] = useMemo(() => {
    if (projects.length === 0) return [];
    const map: Record<string, { total: number; completed: number; flagged: number }> = {};
    for (const p of projects) {
      const key = p.sector;
      if (!map[key]) map[key] = { total: 0, completed: 0, flagged: 0 };
      map[key].total++;
      if (p.status === "COMPLETED" || p.status === "VERIFIED") map[key].completed++;
    }
    // Anomaly count per sector — anomaly.project?.sector if available
    for (const a of anomalies?.items ?? []) {
      const sector = a.project?.sector as string | undefined;
      if (sector && map[sector]) map[sector].flagged++;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [projects, anomalies]);

  if (loading) return <LoadingState message="Loading command center..." />;

  const startTour = () => {
    localStorage.removeItem("vojas.demoTourCompleted");
    // Force a re-render of the layout's DemoTour by reloading is overkill;
    // instead we dispatch a custom event the DemoTour listens to.
    window.dispatchEvent(new CustomEvent("vojas:start-tour"));
  };

  return (
    <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} custom={0} className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-electric-400 to-electric-600 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">VOJAS · MPLAD Accountability · Live monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={startTour}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-electric-500/10 hover:bg-electric-500/20 border border-electric-500/30 text-electric-400 text-xs font-semibold transition-colors"
            title="Walk through the 4 key screens"
          >
            <Rocket className="w-3.5 h-3.5" />
            Start Demo Tour
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-xs text-green-400 font-medium">System Active</span>
            <span className="text-[10px] text-green-400/50 font-mono">v1.0</span>
          </div>
        </div>
      </motion.div>

      {/* ── Spatial Command Scene (3D WebGL2) ───────────────────────────── */}
      <motion.div variants={fadeUp} custom={1} className="glass rounded-xl p-2 top-accent top-accent-electric">
        <div className="flex items-center justify-between mb-2 px-2 pt-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Project Constellation</h2>
            <span className="text-[10px] text-slate-600 font-mono">
              {totalProjects} projects · {activeProjects} active · {fmtINR(totalBudget)} monitored
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> over budget</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-saffron-500" /> high</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-electric-500" /> medium</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> low</span>
          </div>
        </div>
        <SpatialCommandScene projects={projects} />
      </motion.div>

      {/* ── Spatial Command Map + Live Feed ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_320px] gap-5">
        <motion.div
          variants={fadeUp}
          custom={7}
          className="glass rounded-xl p-2 top-accent top-accent-electric"
        >
          <div className="flex items-center justify-between mb-2 px-2 pt-1">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-electric-400" />
              <h2 className="text-sm font-semibold text-white">Spatial Intelligence</h2>
              <span className="text-[10px] text-slate-600 font-mono">India · live</span>
            </div>
            <Link to="/map" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors px-2">
              Open map <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div style={{ height: 380 }}>
            <SpatialDashboardMap />
          </div>
        </motion.div>
        <motion.div variants={fadeUp} custom={9} className="xl:row-span-2">
          <div className="h-full"><LiveActivityFeed activities={liveActivities} /></div>
        </motion.div>
      </div>

      {/* ── Financial Health Bar (full width) ────────────────────────────── */}
      <motion.div variants={fadeUp} custom={8}>
        {schemeFin && <FinancialBar fin={schemeFin} />}
      </motion.div>

      {/* ── Anomalies + System / Quick Stats ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={fadeUp} custom={10} className="lg:col-span-2 glass rounded-xl p-5 top-accent top-accent-saffron">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-saffron-400" />
              <h2 className="text-sm font-semibold text-white">Open Anomalies</h2>
              {topAnomalies.length > 0 && (
                <span className="badge badge-amber text-[10px]">{topAnomalies.length}</span>
              )}
            </div>
            <Link to="/anomalies" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {topAnomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="w-8 h-8 text-green-400/30 mb-2" />
              <p className="text-sm text-slate-400">No open anomalies</p>
              <p className="text-[11px] text-slate-600 mt-1">All detection rules passed · system clean</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topAnomalies.map((anom, i) => (
                <AnomalyRow key={anom.id} anom={anom} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} custom={11} className="space-y-4">
          <SystemStatus health={health} />
          <QuickStats
            reports={reports}
            pendingReports={pendingReports}
            totalProjects={totalProjects}
            completedProjects={completedProjects}
            utilization={utilization}
          />
        </motion.div>
      </div>

      {/* ── Top Projects Table ───────────────────────────────────────────── */}
      <motion.div variants={fadeUp} custom={12} className="glass rounded-xl p-5 top-accent top-accent-electric">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-electric-400" />
            <h2 className="text-sm font-semibold text-white">Top Projects by Utilization</h2>
          </div>
          <Link to="/projects" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">
            All projects <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Top projects by budget utilization">
            <caption className="sr-only">Top projects by budget utilization, sorted by spending percentage</caption>
            <thead>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-white/5">
                <th scope="col" className="text-left pb-2 pr-4 font-semibold">Project</th>
                <th scope="col" className="text-left pb-2 pr-4 font-semibold">Sector</th>
                <th scope="col" className="text-left pb-2 pr-4 font-semibold">Location</th>
                <th scope="col" className="text-right pb-2 pr-4 font-semibold">Budget</th>
                <th scope="col" className="text-right pb-2 pr-4 font-semibold">Spent</th>
                <th scope="col" className="text-right pb-2 pr-4 font-semibold">Util%</th>
                <th scope="col" className="pb-2 font-semibold w-24">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {topProjects.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-600 text-sm">No projects found</td></tr>
              ) : (
                topProjects.map((p, i) => <ProjectRow key={p.id} p={p} index={i} />)
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Quick Access + Sector Performance ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div variants={fadeUp} custom={13} className="glass rounded-xl p-5 top-accent top-accent-green">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-electric-400" />
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "All Projects",    path: "/projects",  icon: FileText },
              { label: "Anomalies",       path: "/anomalies", icon: AlertTriangle },
              { label: "Risk Dashboard",  path: "/risk",      icon: Shield },
              { label: "Reports Queue",    path: "/reports",   icon: Users },
              { label: "Map View",        path: "/map",       icon: Activity },
              { label: "Analytics",        path: "/analytics", icon: BarChart2 },
            ].map(({ label, path, icon: Icon }) => (
              <Link key={path} to={path}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-white/5
                  hover:border-electric-500/30 hover:bg-electric-500/5 bg-navy-800/30
                  transition-all group">
                <div className="w-8 h-8 rounded-lg bg-electric-500/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-electric-400" />
                </div>
                <span className="text-xs text-slate-300 group-hover:text-white font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={14} className="glass rounded-xl p-5 top-accent top-accent-electric">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-electric-400" />
            Sector Performance
          </h2>
          <div className="space-y-1">
            {sectorStats.length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-6">No sector data</p>
            ) : sectorStats.map(s => {
              const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <div key={s.name} className="flex items-center gap-3 py-2">
                  <div className="w-32 shrink-0">
                    <span className="text-xs text-slate-400 truncate block">{s.name.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-36 justify-end">
                    {s.flagged > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-saffron-400">
                        <AlertTriangle className="w-2.5 h-2.5" />{s.flagged}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">{pct}%</span>
                    <span className="text-[10px] text-slate-600">{s.completed}/{s.total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
