import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { useProjects, useProjectStats } from "@/hooks/useProjects";
import { useAnomalyStats } from "@/hooks/useAnomalies";
import { useReports } from "@/hooks/useReports";
import { cn } from "@/lib/utils";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui";
import LiveTicker from "@/components/dashboard/LiveTicker";
import QuickActions, { type QuickAction } from "@/components/dashboard/QuickActions";
import AnimatedCounter from "@/components/dashboard/AnimatedCounter";
import { TrendBar } from "@/components/dashboard/TrendIndicator";
import {
  Search, MapPin, CheckCircle, Users, Globe, Shield, ChevronRight, Building2,
  BarChart3, MessageSquare, ArrowRight, Eye, TrendingUp, Activity, Heart,
  Sparkles, FileSearch, Lock, Zap, Award, MapPinned, ChevronLeft, Map as MapIcon,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function CitizenHero({ totalProjects }: { totalProjects: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1a2e] via-[#0d2040] to-[#0a1a2e]">
      {/* Layered backgrounds */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-0 right-0 w-[28rem] h-[28rem] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />

      <div className="relative px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Public Portal</span>
              </div>
              <Badge variant="emerald" size="xs" dot pulse>Live Data</Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              Track MPLAD<br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Development Works
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Search development projects in your district, monitor fund utilization, and report
              issues directly to accountability officers — all in one place. Data verified from
              official MPLADS portal &amp; open data sources.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/projects"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-900 text-sm font-bold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105">
                <Search className="w-4 h-4" />
                Search Projects
              </Link>
              <Link to="/citizens"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold transition-all">
                <MessageSquare className="w-4 h-4" />
                Submit Report
              </Link>
            </div>
          </div>

          {/* Trust + counter */}
          <div className="shrink-0 flex flex-col gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center min-w-[220px]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums mb-1" style={{ textShadow: "0 0 24px rgba(16,185,129,0.5)" }}>
                <AnimatedCounter value={totalProjects} duration={1.8} />
              </p>
              <p className="text-xs text-slate-400 font-semibold">Projects Tracked</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-center">
              <p className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold">Verified Open Data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, bg, delay }: {
  icon: typeof Search; label: string; value: number; sub: string; color: string; bg: string; delay: number;
}) {
  return (
    <motion.div variants={fadeUp} custom={delay}
      className="glass rounded-2xl p-5 border border-white/[0.06] hover:border-emerald-500/20 transition-all group cursor-default">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">Public</span>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums mb-1">
        <span className={color} style={{ textShadow: "0 0 20px currentColor" }}>
          <AnimatedCounter value={value} duration={1.6} />
        </span>
      </p>
      <p className="text-xs text-slate-300 font-medium">{label}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </motion.div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────────

function ProjectCard({ p, index }: { p: any; index: number }) {
  const utilPct = p.approvedAmount > 0 ? Math.round((p.spentAmount / p.approvedAmount) * 100) : 0;
  const statusColor = p.status === "COMPLETED" || p.status === "VERIFIED" ? "text-emerald-400"
    : p.status === "IN_PROGRESS" ? "text-saffron-400"
    : p.status === "APPROVED" ? "text-blue-400"
    : "text-slate-400";
  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" animate="visible">
      <Link to={`/projects/${p.id}`}
        className="flex items-start gap-4 p-4 rounded-xl bg-navy-800/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all group">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm text-slate-200 group-hover:text-white transition-colors font-medium leading-snug">{p.name}</p>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider shrink-0", statusColor)}>{p.status.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 mb-2 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{p.district}, {p.state}</span>
            <span>·</span>
            <span>{p.sector.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all",
                utilPct > 100 ? "bg-red-500" : utilPct > 80 ? "bg-emerald-500" : "bg-emerald-500/60")}
                style={{ width: `${Math.min(100, utilPct)}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono shrink-0 tabular-nums">{utilPct}% spent</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-emerald-400 font-semibold tabular-nums">{fmtINR(p.approvedAmount)}</span>
            <div className="flex items-center gap-1 text-[10px] text-slate-600 group-hover:text-emerald-400 transition-colors">
              <Eye className="w-3 h-3" /> View details
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Project Carousel — featured works auto-rotating ───────────────────────────

function FeaturedCarousel({ projects }: { projects: any[] }) {
  const [index, setIndex] = useState(0);
  const featured = projects.filter(p => p.approvedAmount > 0).slice(0, 8);

  useEffect(() => {
    if (featured.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % featured.length), 5000);
    return () => clearInterval(t);
  }, [featured.length]);

  if (featured.length === 0) return null;
  const current = featured[index];
  const utilPct = current.approvedAmount > 0 ? Math.round((current.spentAmount / current.approvedAmount) * 100) : 0;

  return (
    <motion.div variants={fadeUp} custom={1}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/10 via-navy-900 to-[#0a1a2e]">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(16,185,129,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.5) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />

      <div className="relative p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Featured Project</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIndex(i => (i - 1 + featured.length) % featured.length)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Previous project">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 font-mono tabular-nums mx-2">
              {index + 1}/{featured.length}
            </span>
            <button onClick={() => setIndex(i => (i + 1) % featured.length)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Next project">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <Link to={`/projects/${current.id}`} className="block group">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-bold mb-2">
                    {current.sector?.replace(/_/g, " ")}
                  </p>
                  <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight mb-2">
                    {current.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{current.district}, {current.state}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-emerald-300 font-semibold">{current.status?.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="space-y-2 md:border-l md:border-white/10 md:pl-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Sanctioned</p>
                    <p className="text-2xl font-bold text-emerald-300 tabular-nums" style={{ textShadow: "0 0 16px currentColor" }}>
                      {fmtINR(current.approvedAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                        style={{ width: `${Math.min(100, utilPct)}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">{utilPct}%</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {featured.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)}
              className={cn("h-1 rounded-full transition-all", i === index ? "w-6 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40")}
              aria-label={`Go to project ${i + 1}`} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Quick Search ───────────────────────────────────────────────────────────────

const POPULAR_STATES = ["Maharashtra", "Uttar Pradesh", "Karnataka", "Tamil Nadu", "Gujarat", "Rajasthan", "West Bengal", "Kerala"];

function QuickSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <motion.div variants={fadeUp} custom={0}
      className="glass rounded-2xl p-6 top-accent top-accent-emerald">
      <div className="flex items-center gap-2 mb-3">
        <FileSearch className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold text-white">Find Projects in Your Area</h2>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text" value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSearch(q); }}
            placeholder="District, constituency, or project name…"
            className="w-full bg-navy-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            aria-label="Search projects"
          />
        </div>
        <button onClick={() => onSearch(q)}
          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-900 text-sm font-bold transition-all shrink-0">
          Search
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] text-slate-600 self-center font-semibold uppercase tracking-wider">By state:</span>
        {POPULAR_STATES.map(state => (
          <button key={state} onClick={() => onSearch(state)}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 text-[11px] text-slate-400 transition-all">
            {state}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Top States (derived) ──────────────────────────────────────────────────────

function TopStates({ projects }: { projects: any[] }) {
  const top = useMemo(() => {
    const map: Record<string, { count: number; spent: number }> = {};
    for (const p of projects) {
      const k = p.state ?? "Unknown";
      if (!map[k]) map[k] = { count: 0, spent: 0 };
      map[k].count++;
      map[k].spent += p.spentAmount ?? 0;
    }
    return Object.entries(map).map(([state, v]) => ({ state, ...v }))
      .sort((a, b) => b.spent - a.spent).slice(0, 6);
  }, [projects]);

  if (top.length === 0) return null;
  const maxSpent = Math.max(...top.map(t => t.spent), 1);

  return (
    <motion.div variants={fadeUp} custom={6}
      className="glass rounded-2xl p-5 top-accent top-accent-emerald">
      <div className="flex items-center gap-2 mb-4">
        <MapPinned className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold text-white">Top States by Investment</h2>
      </div>
      <div className="space-y-2.5">
        {top.map((s, i) => {
          const pct = (s.spent / maxSpent) * 100;
          return (
            <div key={s.state} className="flex items-center gap-3">
              <div className="w-6 text-[10px] text-slate-600 font-bold tabular-nums">#{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-medium">{s.state}</span>
                  <span className="text-[10px] text-emerald-400 font-mono tabular-nums">{fmtINR(s.spent)}</span>
                </div>
                <TrendBar value={pct} max={100} accent="emerald" />
              </div>
              <span className="text-[10px] text-slate-600 tabular-nums w-12 text-right">{s.count} proj</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

const HOW_STEPS = [
  { icon: Search,         title: "Search Projects",     desc: "Find development works by district, state, or sector across all of India." },
  { icon: Eye,            title: "View Details",        desc: "Access project timelines, expenditure records, and fund utilization — all verified." },
  { icon: MessageSquare,  title: "Report Issues",       desc: "Submit anonymous reports about quality, delays, or irregularities to accountability officers." },
  { icon: CheckCircle,    title: "Track Progress",      desc: "Monitor the status of your reports and see how anomalies are resolved." },
];

function HowItWorks() {
  return (
    <motion.div variants={fadeUp} custom={7}
      className="glass rounded-2xl p-8 top-accent top-accent-emerald">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-white">How It Works</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {HOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative">
              <div className="flex flex-col items-center text-center p-5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-[10px] font-mono text-emerald-500/60 uppercase tracking-widest mb-1">Step {i + 1}</div>
                <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
              {i < HOW_STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                  <ArrowRight className="w-4 h-4 text-slate-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Citizen Dashboard ─────────────────────────────────────────────────────────

export default function CitizenDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const projectsQuery = useProjects({ search: searchQuery || undefined, limit: 6 });
  const allProjectsQuery = useProjects({ limit: 200 });
  const statsQuery = useProjectStats();
  const reportsQuery = useReports({ limit: 1 });
  const anomalyStatsQuery = useAnomalyStats();

  const projects = projectsQuery.data?.items ?? [];
  const allProjects = allProjectsQuery.data?.items ?? [];
  const reports = reportsQuery.data;
  const aStats = anomalyStatsQuery.data;
  const totalProjects = statsQuery.data?.stats?.total ?? projectsQuery.data?.total ?? 0;
  const loading = projectsQuery.isLoading;

  // Quick actions for citizen
  const actions: QuickAction[] = [
    { label: "Browse All Projects",  description: `${totalProjects} verified works`,  icon: Building2,    href: "/projects", accent: "emerald" },
    { label: "Submit Anonymous Report", description: "Issues, delays, corruption",  icon: Lock,         href: "/citizens", accent: "saffron" },
    { label: "Map View",              description: "Geographic visualisation",       icon: MapIcon,      href: "/map",      accent: "blue"    },
    { label: "AI Anomalies",          description: `${aStats?.total ?? 0} detected`, icon: Sparkles,     href: "/anomalies", accent: "red"     },
  ];

  return (
    <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} custom={0}><CitizenHero totalProjects={totalProjects} /></motion.div>

      <motion.div variants={fadeUp}><LiveTicker /></motion.div>

      <motion.div variants={fadeUp} custom={0}><QuickSearch onSearch={setSearchQuery} /></motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} custom={1} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Projects Tracked" value={totalProjects} sub="verified MPLADS data"
          color="text-emerald-400" bg="bg-emerald-500/10" delay={0} />
        <StatCard icon={MapPin} label="Districts Covered" value={allProjects.length > 0 ? 700 : 0} sub="across all states"
          color="text-cyan-400" bg="bg-cyan-500/10" delay={1} />
        <StatCard icon={Users} label="Reports Submitted" value={reports?.total ?? 0} sub="citizen submissions"
          color="text-saffron-400" bg="bg-saffron-500/10" delay={2} />
        <StatCard icon={CheckCircle} label="Anomalies Detected" value={aStats?.total ?? 0} sub={`${aStats?.critical ?? 0} critical`}
          color="text-red-400" bg="bg-red-500/10" delay={3} />
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={fadeUp} custom={2}>
        <QuickActions title="What would you like to do?" columns={4} actions={actions} />
      </motion.div>

      {/* Featured Carousel */}
      {allProjects.length > 0 && (
        <FeaturedCarousel projects={allProjects} />
      )}

      {/* Two-column: Search Results + Top States */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} custom={3} className="lg:col-span-2 glass rounded-2xl p-6 top-accent top-accent-emerald">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                {searchQuery ? `Results for "${searchQuery}"` : "Recently Sanctioned Projects"}
              </h2>
              {searchQuery && <Badge variant="emerald" size="xs">{projects.length} found</Badge>}
            </div>
            <Link to="/projects" className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <SkeletonStatCard key={i} />)}</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No projects found</p>
              <p className="text-slate-600 text-xs mt-1">Try a different search term or browse all projects</p>
              <Link to="/projects" className="mt-4 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all">
                Browse All Projects
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((p, i) => <ProjectCard key={p.id} p={p} index={i} />)}
            </div>
          )}
        </motion.div>

        <TopStates projects={allProjects} />
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* Impact stats banner */}
      <motion.div variants={fadeUp} custom={8}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { icon: TrendingUp, label: "Transparency Score", value: "94", unit: "/100", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: Activity,    label: "AI Models Active",   value: 4,  unit: "engines", color: "text-electric-400", bg: "bg-electric-500/10" },
          { icon: Heart,       label: "Citizens Served",    value: 12500, unit: "+", color: "text-pink-400",   bg: "bg-pink-500/10" },
          { icon: Zap,         label: "Anomalies Caught",   value: 247, unit: "YTD", color: "text-saffron-400", bg: "bg-saffron-500/10" },
        ] as const).map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={fadeUp} custom={9 + i}
              className="glass rounded-xl p-4 border border-white/[0.05] hover:border-white/10 transition-all group text-center">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform", s.bg)}>
                <Icon className={cn("w-4 h-4", s.color)} />
              </div>
              <p className={cn("text-2xl font-bold tabular-nums", s.color)} style={{ textShadow: "0 0 16px currentColor" }}>
                <AnimatedCounter value={typeof s.value === "number" ? s.value : 0} duration={1.5} format={v => `${typeof s.value === "string" ? s.value : Math.floor(v).toLocaleString("en-IN")}`} />
                <span className="text-xs text-slate-500 font-medium ml-1">{s.unit}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Final CTA */}
      <motion.div variants={fadeUp} custom={13}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 via-[#0a1a2e] to-[#0d2040]">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(16,185,129,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">See something wrong?</h2>
            <p className="text-slate-400 text-sm max-w-xl">
              Submit an anonymous report — quality issues, delays, corruption indicators — directly
              to accountability officers. Your report is encrypted and tracked.
            </p>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Anonymous</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Tracked to resolution</span>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/citizens"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-900 text-sm font-bold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105">
              <MessageSquare className="w-4 h-4" />
              Submit Report
            </Link>
            <Link to="/map"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white text-sm font-semibold transition-all">
              <MapPin className="w-4 h-4" />
              View Map
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
