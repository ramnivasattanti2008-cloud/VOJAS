import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { useProjects } from "@/hooks/useProjects";
import { useReports } from "@/hooks/useReports";
import { cn } from "@/lib/utils";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import {
  Search,
  MapPin,
  CheckCircle,
  Users,
  Globe,
  Shield,
  ChevronRight,
  Building2,
  BarChart3,
  MessageSquare,
  ArrowRight,
  Eye,
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

function CitizenHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1a2e] via-[#0d2040] to-[#0a1a2e]">
      {/* subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      {/* radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />

      <div className="relative px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-emerald-400/80 text-xs font-semibold uppercase tracking-widest">Public Portal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Track MPLAD<br />
              <span className="text-emerald-400">Development Works</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Search development projects in your district, monitor fund utilization,
              and report issues directly to accountability officers — all in one place.
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

          {/* Trust badge */}
          <div className="shrink-0 bg-white/5 border border-white/10 rounded-2xl p-6 text-center min-w-[200px]">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Open Government</h3>
            <p className="text-slate-500 text-xs leading-relaxed">Verified data from official MPLADS portal &amp; open data sources</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, bg, delay }: {
  icon: typeof Search; label: string; value: string; sub: string; color: string; bg: string; delay: number;
}) {
  return (
    <motion.div variants={fadeUp} custom={delay}
      className="glass rounded-2xl p-5 border border-white/[0.06] hover:border-emerald-500/20 transition-all group cursor-default">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">Public</span>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums mb-1" style={{ textShadow: "0 0 20px currentColor" }}>
        <span className={color}>{value}</span>
      </p>
      <p className="text-xs text-slate-300 font-medium">{label}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </motion.div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────────

function ProjectCard({ p, index }: { p: any; index: number }) {
  const utilPct = p.approvedAmount > 0 ? Math.round((p.spentAmount / p.approvedAmount) * 100) : 0;
  const statusColor = p.status === "COMPLETED" || p.status === "VERIFIED" ? "text-emerald-400" : p.status === "IN_PROGRESS" ? "text-saffron-400" : "text-slate-400";
  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" animate="visible">
      <Link to={`/projects/${p.id}`}
        className="flex items-start gap-4 p-4 rounded-xl bg-navy-800/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all group">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm text-slate-200 group-hover:text-white transition-colors font-medium leading-snug">{p.name}</p>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider shrink-0", statusColor)}>{p.status.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 mb-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{p.district}, {p.state}</span>
            <span>·</span>
            <span>{p.sector.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-navy-800 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", utilPct > 100 ? "bg-red-500" : utilPct > 80 ? "bg-emerald-500" : "bg-emerald-500/60")}
                style={{ width: `${Math.min(100, utilPct)}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono shrink-0">{utilPct}% spent</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-emerald-400 font-semibold">{fmtINR(p.approvedAmount)}</span>
            <div className="flex items-center gap-1 text-[10px] text-slate-600">
              <Eye className="w-3 h-3" /> View details
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

const HOW_STEPS = [
  { icon: Search, title: "Search Projects", desc: "Find development works by district, constituency, or sector across all of India." },
  { icon: Eye, title: "View Details", desc: "Access project timelines, expenditure records, and fund utilization — all verified." },
  { icon: MessageSquare, title: "Report Issues", desc: "Submit anonymous reports about quality, delays, or irregularities to accountability officers." },
  { icon: CheckCircle, title: "Track Progress", desc: "Monitor the status of your reports and see how anomalies are resolved." },
];

function HowItWorks() {
  return (
    <motion.div variants={fadeUp} custom={4}
      className="glass rounded-2xl p-8 top-accent top-accent-emerald">
      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        How It Works
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {HOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative">
              <div className="flex flex-col items-center text-center p-5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
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

// ── Quick Search ───────────────────────────────────────────────────────────────

function QuickSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  const popular = ["Delhi", "Mumbai", "Lucknow", "Jaipur", "Chennai", "Bangalore", "Hyderabad", "Kolkata"];
  return (
    <motion.div variants={fadeUp} custom={3}
      className="glass rounded-2xl p-6 top-accent top-accent-emerald">
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-emerald-400" />
        Quick Search
      </h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text" value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSearch(q); }}
          placeholder="Search district, constituency, or project name…"
          className="flex-1 bg-navy-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
        />
        <button onClick={() => onSearch(q)}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-900 text-sm font-bold transition-all shrink-0">
          Search
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] text-slate-600 self-center">Popular:</span>
        {popular.map(city => (
          <button key={city} onClick={() => onSearch(city)}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 text-[11px] text-slate-400 transition-all">
            {city}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Citizen Dashboard ─────────────────────────────────────────────────────────

export default function CitizenDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const projectsQuery = useProjects({ search: searchQuery || undefined, limit: 6 });
  const reportsQuery = useReports({ limit: 5 });

  const projects = projectsQuery.data?.items ?? [];
  const reports = reportsQuery.data;
  const loading = projectsQuery.isLoading;

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  return (
    <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
      {/* Hero */}
      <motion.div variants={fadeUp} custom={0}><CitizenHero /></motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} custom={1}><QuickSearch onSearch={handleSearch} /></motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} custom={2} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Projects Tracked" value={projectsQuery.data?.total?.toLocaleString("en-IN") ?? "—"} sub="verified MPLADS data" color="text-emerald-400" bg="bg-emerald-500/10" delay={0} />
        <StatCard icon={MapPin} label="Districts Covered" value={projectsQuery.data?.total ? "700+" : "—"} sub="across all states" color="text-cyan-400" bg="bg-cyan-500/10" delay={1} />
        <StatCard icon={Users} label="Reports Submitted" value={reports?.total?.toLocaleString("en-IN") ?? "—"} sub="citizen submissions" color="text-saffron-400" bg="bg-saffron-500/10" delay={2} />
        <StatCard icon={CheckCircle} label="Resolved" value={reports?.items?.filter(r => r.status === "RESOLVED" || r.status === "CLOSED").length.toLocaleString("en-IN") ?? "—"} sub="issues addressed" color="text-blue-400" bg="bg-blue-500/10" delay={3} />
      </motion.div>

      {/* Projects grid */}
      <motion.div variants={fadeUp} custom={4} className="glass rounded-2xl p-6 top-accent top-accent-emerald">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              {searchQuery ? `Results for "${searchQuery}"` : "Featured Projects"}
            </h2>
            {searchQuery && (
              <span className="badge badge-emerald text-[10px]">
                {projects.length} found
              </span>
            )}
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

      {/* How it works */}
      <HowItWorks />

      {/* CTA */}
      <motion.div variants={fadeUp} custom={5}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 via-[#0a1a2e] to-[#0d2040]">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(16,185,129,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">See something wrong?</h2>
            <p className="text-slate-400 text-sm">Submit an anonymous report — quality issues, delays, corruption indicators — directly to accountability officers.</p>
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
