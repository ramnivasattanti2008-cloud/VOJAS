import { useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import type { Project, HealthStatus } from "@/types";
import type { SchemeFinancials } from "@/types/financial-types";
import { LoadingState } from "@/components/ui";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import HeroBanner from "@/components/dashboard/HeroBanner";
import LiveTicker from "@/components/dashboard/LiveTicker";
import RibbonGauge from "@/components/dashboard/RibbonGauge";
import QuickActions, { type QuickAction } from "@/components/dashboard/QuickActions";
import MyTasks, { type TaskItem } from "@/components/dashboard/MyTasks";
import { useHealth } from "@/hooks/useSystem";
import { useProjects } from "@/hooks/useProjects";
import { useSchemeFinancials } from "@/hooks/useFinancial";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useReports } from "@/hooks/useReports";
import { useAnomalyStats } from "@/hooks/useAnomalies";
import { cn } from "@/lib/utils";
import { SpatialDashboardMap } from "@/components/layout";
import {
  AlertTriangle, CheckCircle, XCircle,
  FileText, Users, IndianRupee, Activity, Shield, Zap,
  BarChart2, Radio, Server, Database, Globe, Cpu,
  ChevronRight, Map, Rocket, Inbox, BellRing,
} from "lucide-react";

// Lazy-load 3D globe — keeps dashboard bundle lean
const GlobeHero = lazy(() => import("@/components/3d/GlobeHero"));

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
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

// ── Live Activity ──────────────────────────────────────────────────────────────

type LiveActivity = { icon: typeof Shield; color: string; bg: string; text: string; time: string; };

function buildLiveActivities(recentReports: any[], recentAnomalies: any[]): LiveActivity[] {
  const acts: LiveActivity[] = [];
  for (const r of recentReports.slice(0, 3)) {
    acts.push({ icon: Users, color: "text-blue-400", bg: "bg-blue-500/10",
      text: `Citizen report "${r.title ?? r.category ?? "Report"}" submitted${r.locationDesc ? ` from ${r.locationDesc}` : ""}`,
      time: timeAgo(r.createdAt) });
  }
  for (const a of recentAnomalies.slice(0, 3)) {
    acts.push({ icon: AlertTriangle,
      color: a.severity === "CRITICAL" ? "text-red-400" : a.severity === "HIGH" ? "text-saffron-400" : "text-electric-400",
      bg: a.severity === "CRITICAL" ? "bg-red-500/10" : a.severity === "HIGH" ? "bg-saffron-500/10" : "bg-electric-500/10",
      text: `${a.severity} anomaly: ${a.title}`,
      time: timeAgo(a.createdAt) });
  }
  return acts.sort((a, b) => {
    const parse = (s: string) => { const m = s.match(/^(\d+)([mhd])\s*ago$/); if (!m) return 0; const n = Number(m[1]); return n * (m[2] === "m" ? 60_000 : m[2] === "h" ? 3_600_000 : 86_400_000); };
    return parse(a.time) - parse(b.time);
  }).slice(0, 8);
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
          <div className="flex flex-col items-center justify-center py-8">
            <Inbox className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-[11px] text-slate-600 text-center">No recent activity</p>
          </div>
        ) : activities.map((act, i) => {
          const Icon = act.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
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

// ── System Status ─────────────────────────────────────────────────────────────

function SystemStatus({ health }: { health: HealthStatus | null }) {
  const services = [
    { label: "API Server",    ok: health?.status === "ok",     detail: `v${health?.version ?? "—"}`,  Icon: Server },
    { label: "Database",      ok: health?.database === "connected", detail: health?.database ?? "—", Icon: Database },
    { label: "Map Service",  ok: true,                        detail: "Leaflet ready",                Icon: Globe },
    { label: "AI Engine",    ok: true,                        detail: "4 modules active",              Icon: Cpu },
    { label: "Risk Engine",  ok: true,                        detail: "4-signal active",              Icon: AlertTriangle },
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
              {ok ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Anomaly Row ────────────────────────────────────────────────────────────────

function AnomalyRow({ anom, index }: { anom: any; index: number }) {
  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" animate="visible">
      <Link to={`/anomalies/${anom.id}`}
        className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/40 border border-white/5 hover:border-electric-500/20 hover:bg-electric-500/5 transition-all group">
        <span className={cn("badge badge-slate", severityBadge(anom.severity))}>{anom.severity}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-200 group-hover:text-white transition-colors truncate font-medium">{anom.title}</p>
          <p className="text-[10px] text-slate-600 mt-0.5 truncate">{anom.project?.name ?? anom.description ?? anom.category}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[10px] text-slate-600">{anom.category}</span>
          <p className="text-[10px] text-slate-700 mt-0.5">{timeAgo(anom.createdAt)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Project Row ────────────────────────────────────────────────────────────────

function ProjectRow({ p, index }: { p: Project; index: number }) {
  const util = p.approvedAmount > 0 ? Math.min(150, Math.round((p.spentAmount / p.approvedAmount) * 100)) : 0;
  const overBudget = util > 100;
  return (
    <motion.tr variants={fadeUp} custom={index} initial="hidden" animate="visible"
      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
      <td className="py-3 pr-4">
        <Link to={`/projects/${p.id}`} className="text-slate-200 group-hover:text-electric-400 transition-colors font-medium text-sm truncate block max-w-[200px]">{p.name}</Link>
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
          <div className={cn("h-full rounded-full transition-all", overBudget ? "bg-red-500" : util > 80 ? "bg-green-500" : "bg-electric-500")}
            style={{ width: `${Math.min(100, util)}%` }} />
        </div>
      </td>
    </motion.tr>
  );
}

// ── Financial Bar ──────────────────────────────────────────────────────────────

function FinancialBar({ fin }: { fin: SchemeFinancials }) {
  const { totalBudget, totalSpent } = fin;
  const spentPct    = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const utilization = fin.utilization ?? 0;
  const barColor    = utilization > 90 ? "bg-red-500" : utilization > 70 ? "bg-saffron-500" : "bg-electric-500";
  return (
    <div className="glass rounded-xl p-4 top-accent top-accent-electric">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-electric-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Scheme Financial Health</span>
          <span className="text-[10px] text-slate-600 font-mono">{fin.projectCount} projects · {fin.expenditureCount} disbursements</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] flex-wrap">
          {[{ label: "Budget", val: totalBudget, cls: "text-electric-400" },
            { label: "Spent", val: totalSpent, cls: "text-saffron-400" },
            { label: "Remaining", val: fin.remaining, cls: "text-green-400" },
          ].map(({ label, val, cls }) => (
            <div key={label} className="text-right">
              <span className="text-slate-600">{label}: </span>
              <span className={cn("font-mono font-semibold", cls)}>{fmtINR(val)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 bg-navy-800 rounded-full overflow-hidden">
          <motion.div className={cn("h-full rounded-full", barColor)}
            initial={{ width: 0 }} animate={{ width: `${spentPct}%` }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 font-mono">
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

// ── Officer Dashboard ──────────────────────────────────────────────────────────

export default function OfficerDashboard() {
  const healthQuery      = useHealth();
  const projectsQuery   = useProjects({ limit: 50 });
  const finQuery        = useSchemeFinancials();
  const anomaliesQuery  = useAnomalies({ status: "OPEN", limit: 8 });
  const reportsQuery    = useReports({ status: "SUBMITTED", limit: 10 });
  const anomalyStatsQuery = useAnomalyStats();

  const health         = healthQuery.data ?? null;
  const projects       = projectsQuery.data?.items ?? [];
  const schemeFin      = finQuery.data ?? null;
  const anomalies      = anomaliesQuery.data ?? null;
  const reports        = reportsQuery.data;
  const anomalyStats   = anomalyStatsQuery.data;

  const loading =
    healthQuery.isLoading || projectsQuery.isLoading ||
    finQuery.isLoading || anomaliesQuery.isLoading || reportsQuery.isLoading;

  const pendingReports     = reports?.total ?? 0;
  const totalProjects     = projects.length;
  const activeProjects    = projects.filter(p => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter(p => ["COMPLETED", "VERIFIED"].includes(p.status)).length;
  const totalBudget       = schemeFin?.totalBudget ?? 0;
  const utilization        = schemeFin?.utilization ?? 0;

  const topProjects = useMemo(() =>
    [...projects].filter(p => p.approvedAmount > 0)
      .sort((a, b) => (b.spentAmount / b.approvedAmount) - (a.spentAmount / a.approvedAmount))
      .slice(0, 8), [projects]);

  const topAnomalies = anomalies?.items ?? [];

  const liveActivities = useMemo(() => {
    const recentReports   = (reports?.items ?? []).slice(0, 3);
    const recentAnomalies = (anomalies?.items ?? []).slice(0, 3);
    return buildLiveActivities(recentReports, recentAnomalies);
  }, [reports, anomalies]);

  // Build personal task queue
  const tasks: TaskItem[] = useMemo(() => {
    const t: TaskItem[] = [];
    if (reports && reports.total > 0) {
      t.push({
        id: "pending-reports",
        title: `${reports.total} pending reports`,
        subtitle: "Awaiting review and assignment",
        icon: Users,
        href: "/reports?status=SUBMITTED",
        meta: "REVIEW",
        accent: "electric",
      });
    }
    if (anomalies && anomalies.total > 0) {
      t.push({
        id: "open-anomalies",
        title: `${anomalies.total} open anomalies`,
        subtitle: "AI-detected issues need review",
        icon: AlertTriangle,
        href: "/anomalies?status=OPEN",
        meta: "QUEUE",
        accent: anomalyStats && anomalyStats.critical > 0 ? "red" : "saffron",
        urgent: !!(anomalyStats && anomalyStats.critical > 0),
      });
    }
    if (activeProjects > 0) {
      t.push({
        id: "active-projects",
        title: `${activeProjects} active projects`,
        subtitle: "Ongoing implementation monitoring",
        icon: Activity,
        href: "/projects?status=IN_PROGRESS",
        meta: "TRACK",
        accent: "green",
      });
    }
    if (completedProjects > 0) {
      t.push({
        id: "verify-projects",
        title: `${completedProjects} completed`,
        subtitle: "Pending field verification",
        icon: CheckCircle,
        href: "/projects?status=COMPLETED",
        meta: "VERIFY",
        accent: "blue",
      });
    }
    return t;
  }, [reports, anomalies, activeProjects, completedProjects, anomalyStats]);

  // Quick actions
  const actions: QuickAction[] = [
    { label: "All Projects",    description: `${totalProjects} works`,       icon: FileText,       href: "/projects",  accent: "electric", badge: totalProjects || undefined },
    { label: "Anomalies",        description: "AI detection queue",          icon: AlertTriangle, href: "/anomalies", accent: "red",      badge: anomalyStats?.open || undefined },
    { label: "Reports",          description: "Citizen submissions",         icon: Users,          href: "/reports",   accent: "saffron",  badge: reports?.total || undefined },
    { label: "Risk Dashboard",   description: "Project risk scores",          icon: Shield,        href: "/risk",      accent: "saffron" },
    { label: "Map View",         description: "Spatial intelligence",         icon: Map,           href: "/map",      accent: "green" },
    { label: "Analytics",         description: "Financial & sector trends", icon: BarChart2,     href: "/analytics", accent: "blue" },
    { label: "Notifications",     description: "Alert center",                icon: BellRing,      href: "/notifications", accent: "electric" },
    { label: "Settings",          description: "System configuration",       icon: Server,        href: "/settings",  accent: "emerald" },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-52 rounded-3xl overflow-hidden"><SkeletonStatCard /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></div>
        <LoadingState message="Loading command center..." />
      </div>
    );
  }

  const startTour = () => {
    localStorage.removeItem("vojas.demoTourCompleted");
    window.dispatchEvent(new CustomEvent("vojas:start-tour"));
  };

  return (
    <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
      {/* Hero */}
      <motion.div variants={fadeUp} custom={0}>
        <HeroBanner totalBudget={totalBudget} totalProjects={totalProjects} activeProjects={activeProjects} utilization={utilization} anomalies={topAnomalies.length} healthOk={health?.status === "ok"} />
      </motion.div>

      {/* Live ticker */}
      <motion.div variants={fadeUp} custom={1}><LiveTicker /></motion.div>

      {/* Quick actions bar */}
      <motion.div variants={fadeUp} custom={2} className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={startTour}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-navy-900 text-xs font-bold transition-all shadow-lg shadow-electric-500/30 hover:shadow-electric-500/50 hover:scale-105">
            <Rocket className="w-3.5 h-3.5" /> Start Demo Tour
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-slate-400">
            <span className="text-electric-400 font-mono">●</span> Auto-refresh 30s
          </div>
        </div>
        <Link to="/projects" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 flex items-center gap-1 font-medium">
          View all projects <ChevronRight className="w-3 h-3" />
        </Link>
      </motion.div>

      {/* Quick Actions grid */}
      <motion.div variants={fadeUp} custom={3}>
        <QuickActions title="Command Center" columns={4} actions={actions} />
      </motion.div>

      {/* Constellation + Activity feed */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_340px] gap-5">
        <motion.div variants={fadeUp} custom={4} className="glass rounded-xl p-2 top-accent top-accent-electric">
          <div className="flex items-center justify-between mb-2 px-2 pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-electric-400" />
              <h2 className="text-sm font-semibold text-white">Project Constellation</h2>
              <span className="text-[10px] text-slate-600 font-mono">{totalProjects} projects · {activeProjects} active · {fmtINR(totalBudget)} monitored</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> over budget</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-saffron-500" /> high</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-electric-500" /> medium</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> low</span>
            </div>
          </div>
          <div className="w-full flex items-center justify-center" style={{ height: 300 }}>
            <Suspense fallback={
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full border-2 border-electric-500 border-t-transparent animate-spin mb-3" />
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Initializing globe</p>
              </div>
            }>
              <GlobeHero height={300} />
            </Suspense>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} custom={5} className="xl:row-span-2"><div className="h-full"><LiveActivityFeed activities={liveActivities} /></div></motion.div>
      </div>

      {/* Financial bar */}
      <motion.div variants={fadeUp} custom={6}>{schemeFin && <FinancialBar fin={schemeFin} />}</motion.div>

      {/* Three-column: Pulse + Tasks + System */}
      <motion.div variants={fadeUp} custom={7} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass rounded-2xl p-6 top-accent top-accent-electric relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: "radial-gradient(ellipse at top left, rgba(59,130,246,0.08), transparent 60%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-electric-400" /><h2 className="text-sm font-semibold text-white uppercase tracking-wider">Performance Pulse</h2></div>
              <span className="text-[10px] text-slate-500 font-mono">live · all sectors</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center"><RibbonGauge value={utilization} label="Budget Utilization" color={utilization > 90 ? "red" : utilization > 70 ? "saffron" : "green"} size={140} thickness={10} /></div>
              <div className="flex flex-col items-center"><RibbonGauge value={totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0} label="Completion Rate" color="electric" size={140} thickness={10} /></div>
              <div className="flex flex-col items-center"><RibbonGauge value={reports && reports.total > 0 ? Math.round(((reports.total - pendingReports) / reports.total) * 100) : 0} label="Report Resolution" color="saffron" size={140} thickness={10} /></div>
              <div className="flex flex-col items-center"><RibbonGauge value={topProjects[0] ? Math.min(100, (topProjects[0].spentAmount / topProjects[0].approvedAmount) * 100) : 0} label="Top Project" color="green" size={140} thickness={10} /></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <MyTasks title="My Tasks" items={tasks} viewAllHref="/anomalies" />
          <SystemStatus health={health} />
        </div>
      </motion.div>

      {/* Anomalies + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={fadeUp} custom={8} className="lg:col-span-2 glass rounded-xl p-5 top-accent top-accent-saffron">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-saffron-400" /><h2 className="text-sm font-semibold text-white">Open Anomalies</h2>{topAnomalies.length > 0 && <span className="badge badge-amber text-[10px]">{topAnomalies.length}</span>}</div>
            <Link to="/anomalies" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">View all <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {topAnomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="w-8 h-8 text-green-400/30 mb-2" />
              <p className="text-sm text-slate-400">No open anomalies</p>
              <p className="text-[11px] text-slate-600 mt-1">All detection rules passed · system clean</p>
            </div>
          ) : (
            <div className="space-y-2">{topAnomalies.map((anom, i) => <AnomalyRow key={anom.id} anom={anom} index={i} />)}</div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} custom={9} className="glass rounded-xl p-2 top-accent top-accent-electric">
          <div className="flex items-center justify-between mb-2 px-2 pt-1">
            <div className="flex items-center gap-2"><Map className="w-4 h-4 text-electric-400" /><h2 className="text-sm font-semibold text-white">Spatial Intelligence</h2></div>
            <Link to="/map" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">Open <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div style={{ height: 360 }}><SpatialDashboardMap /></div>
        </motion.div>
      </div>

      {/* Top Projects table */}
      <motion.div variants={fadeUp} custom={10} className="glass rounded-xl p-5 top-accent top-accent-electric">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-electric-400" /><h2 className="text-sm font-semibold text-white">Top Projects by Utilization</h2></div>
          <Link to="/projects" className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors">All projects <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Top projects by budget utilization">
            <caption className="sr-only">Top projects by budget utilization</caption>
            <thead><tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-white/5">
              <th scope="col" className="text-left pb-2 pr-4 font-semibold">Project</th>
              <th scope="col" className="text-left pb-2 pr-4 font-semibold">Sector</th>
              <th scope="col" className="text-left pb-2 pr-4 font-semibold">Location</th>
              <th scope="col" className="text-right pb-2 pr-4 font-semibold">Budget</th>
              <th scope="col" className="text-right pb-2 pr-4 font-semibold">Spent</th>
              <th scope="col" className="text-right pb-2 pr-4 font-semibold">Util%</th>
              <th scope="col" className="pb-2 font-semibold w-24">Utilization</th>
            </tr></thead>
            <tbody>{topProjects.length === 0 ? (<tr><td colSpan={7} className="py-8 text-center text-slate-600 text-sm">No projects found</td></tr>) : topProjects.map((p, i) => <ProjectRow key={p.id} p={p} index={i} />)}</tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
