import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import {
  Activity, IndianRupee, AlertTriangle, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedGrid from "./AnimatedGrid";

interface StatBlockProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: "auto" | "percent" | "number";
  accent: "electric" | "saffron" | "red" | "green";
  index: number;
}

function fmt(v: number, format?: "auto" | "percent" | "number"): string {
  if (format === "percent") return `${Math.round(v)}%`;
  if (format === "number") {
    if (v >= 1_00_00_000) return `${(v / 1_00_00_000).toFixed(2)} Cr`;
    if (v >= 1_00_000)     return `${(v / 1_00_000).toFixed(1)} L`;
    if (v >= 1_000)        return `${(v / 1_000).toFixed(1)}K`;
    return Math.floor(v).toLocaleString("en-IN");
  }
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000)       return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

const ACCENT: Record<StatBlockProps["accent"], { text: string; ring: string; glow: string; bar: string; halo: string; icon: string; bg: string; gradient: string }> = {
  electric: { text: "text-electric-400", ring: "ring-electric-500/30", glow: "shadow-electric-500/40",  bar: "from-electric-500 to-electric-400",  halo: "bg-electric-500/30",  icon: "text-electric-400",  bg: "bg-electric-500/10",  gradient: "from-electric-500/20 via-electric-500/5"  },
  saffron:  { text: "text-saffron-400",  ring: "ring-saffron-500/30",  glow: "shadow-saffron-500/40",   bar: "from-saffron-500 to-saffron-400",    halo: "bg-saffron-500/30",   icon: "text-saffron-400",   bg: "bg-saffron-500/10",   gradient: "from-saffron-500/20 via-saffron-500/5"   },
  red:      { text: "text-red-400",      ring: "ring-red-500/30",      glow: "shadow-red-500/40",       bar: "from-red-500 to-red-400",            halo: "bg-red-500/30",       icon: "text-red-400",       bg: "bg-red-500/10",       gradient: "from-red-500/20 via-red-500/5"           },
  green:    { text: "text-green-400",    ring: "ring-green-500/30",    glow: "shadow-green-500/40",     bar: "from-green-500 to-green-400",        halo: "bg-green-500/30",     icon: "text-green-400",     bg: "bg-green-500/10",     gradient: "from-green-500/20 via-green-500/5"       },
};

function StatBlock({ icon: Icon, label, value, format, accent, index }: StatBlockProps) {
  const animated = useCountUp(value, 1800);
  const a = ACCENT[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6 + index * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.04 }}
      className={cn(
        "group relative flex flex-col items-center justify-center",
        "rounded-2xl p-5 cursor-default overflow-hidden",
        "bg-white/[0.03] backdrop-blur-xl ring-1 ring-white/[0.08]",
        "hover:ring-2 transition-all duration-500",
        a.ring
      )}
      style={{ boxShadow: `0 0 40px -10px ${a.glow.replace("shadow-", "")}` }}
    >
      {/* Hover halo */}
      <motion.div
        className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none", a.halo)}
        initial={{ opacity: 0.1 }}
        whileHover={{ opacity: 0.5, scale: 1.3 }}
        transition={{ duration: 0.6 }}
      />

      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-white/10 mb-2", a.bg)}>
        <Icon className={cn("w-5 h-5", a.icon)} />
      </div>
      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8 + index * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn("text-2xl md:text-3xl font-bold text-white tracking-tight tabular-nums leading-none", a.text)}
        style={{ textShadow: `0 0 24px ${a.glow.replace("shadow-", "")}` }}
      >
        {fmt(animated, format)}
      </motion.p>
      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 font-semibold">{label}</p>

      {/* Bottom accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.0 + index * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn("absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r origin-left", a.bar)}
      />
    </motion.div>
  );
}

interface HeroBannerProps {
  totalBudget: number;
  totalProjects: number;
  activeProjects: number;
  utilization: number;
  anomalies: number;
  healthOk: boolean;
}

/**
 * Cinematic hero banner with animated grid background, mesh gradient,
 * floating orb halos, and 4 dramatic stat blocks. Sets the tone for the
 * entire Command Center.
 */
export default function HeroBanner({
  totalBudget,
  totalProjects,
  activeProjects,
  utilization,
  anomalies,
  healthOk,
}: HeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/[0.08] bg-gradient-to-br from-navy-900 via-navy-800/60 to-navy-900">
      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatedGrid />
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 opacity-60" style={{
          background: "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(59,130,246,0.25), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(251,191,36,0.18), transparent 60%)",
        }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
        }} />
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 p-6 md:p-8">
        {/* Left: title + CTA */}
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-electric-500/15 border border-electric-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-electric-400" />
              </span>
              <span className="text-[10px] font-bold tracking-widest text-electric-400 uppercase">Live</span>
            </div>
            {healthOk && (
              <span className="text-[10px] text-slate-500 font-mono">v1.0 · All systems operational</span>
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-white"
          >
            Command <span className="bg-gradient-to-r from-electric-400 via-electric-300 to-saffron-400 bg-clip-text text-transparent">Center</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 text-sm md:text-base text-slate-400 max-w-lg leading-relaxed"
          >
            Real-time MPLAD accountability, AI-driven anomaly detection, and citizen-powered transparency
            across {totalProjects} projects.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium">
              <span className="text-electric-400 font-mono">↑</span> 47 reports resolved today
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium">
              <span className="text-saffron-400 font-mono">●</span> 12 new submissions
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium">
              <span className={anomalies === 0 ? "text-green-400" : "text-red-400"}>
                {anomalies === 0 ? "✓" : "!"}
              </span>{" "}
              {anomalies === 0 ? "All clear" : `${anomalies} anomalies need review`}
            </div>
          </motion.div>
        </div>

        {/* Right: 4 dramatic stat blocks */}
        <div className="grid grid-cols-2 gap-3">
          <StatBlock icon={IndianRupee}    label="Total Budget"    value={totalBudget}   format="auto"    accent="electric" index={0} />
          <StatBlock icon={Activity}       label="Active Projects" value={activeProjects} format="number" accent="saffron"  index={1} />
          <StatBlock icon={AlertTriangle}  label="Open Anomalies"  value={anomalies}     format="number" accent="red"      index={2} />
          <StatBlock icon={Zap}            label="Utilization"     value={utilization}   format="percent" accent="green"    index={3} />
        </div>
      </div>
    </div>
  );
}
