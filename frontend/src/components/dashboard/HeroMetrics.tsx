import { useState } from "react";
import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import {
  ArrowUpRight, ArrowDownRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AccentKey = "electric" | "saffron" | "red" | "green" | "blue";

const ACCENT: Record<AccentKey, {
  text: string;
  ring: string;
  glow: string;
  bar: string;
  halo: string;
  icon: string;
  bg: string;
}> = {
  electric: { text: "text-electric-400", ring: "ring-electric-500/30",  glow: "shadow-electric-500/30",  bar: "from-electric-500 to-electric-400",  halo: "bg-electric-500/20",  icon: "text-electric-400",  bg: "bg-electric-500/10"   },
  saffron:  { text: "text-saffron-400",  ring: "ring-saffron-500/30",   glow: "shadow-saffron-500/30",   bar: "from-saffron-500 to-saffron-400",    halo: "bg-saffron-500/20",   icon: "text-saffron-400",   bg: "bg-saffron-500/10"    },
  red:      { text: "text-red-400",      ring: "ring-red-500/30",       glow: "shadow-red-500/30",       bar: "from-red-500 to-red-400",            halo: "bg-red-500/20",       icon: "text-red-400",       bg: "bg-red-500/10"        },
  green:    { text: "text-green-400",    ring: "ring-green-500/30",     glow: "shadow-green-500/30",     bar: "from-green-500 to-green-400",        halo: "bg-green-500/20",     icon: "text-green-400",     bg: "bg-green-500/10"      },
  blue:     { text: "text-blue-400",     ring: "ring-blue-500/30",      glow: "shadow-blue-500/30",      bar: "from-blue-500 to-blue-400",          halo: "bg-blue-500/20",      icon: "text-blue-400",      bg: "bg-blue-500/10"       },
};

export interface HeroMetric {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: AccentKey;
  /** Pre-formatted unit label (₹, %, etc.) */
  prefix?: string;
  suffix?: string;
  /** Format: 'auto' = ₹1.2Cr, 'percent' = 78%, 'number' = 1,234 */
  format?: "auto" | "percent" | "number";
  /** Decimals for percent */
  decimals?: number;
  delta?: number;
  /** Is "up" good? (Default true). E.g. anomalies: up is bad → false */
  upIsGood?: boolean;
  subtext: string;
  /** Optional trend points for the sparkline */
  trend?: number[];
}

function fmt(v: number, format?: string, prefix = "", suffix = "", decimals = 0): string {
  if (format === "percent") {
    return `${prefix}${v.toFixed(decimals)}${suffix || "%"}`;
  }
  if (format === "number") {
    if (v >= 1_00_00_000) return `${prefix}${(v / 1_00_00_000).toFixed(2)} Cr${suffix}`;
    if (v >= 1_00_000)     return `${prefix}${(v / 1_00_000).toFixed(1)} L${suffix}`;
    if (v >= 1_000)        return `${prefix}${(v / 1_000).toFixed(1)}K${suffix}`;
    return `${prefix}${Math.floor(v).toLocaleString("en-IN")}${suffix}`;
  }
  // INR auto
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000)       return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100;
  const H = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return [x, y] as const;
  });
  const points = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`sl-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#sl-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="3"
        fill={color}
        className="animate-pulse"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

interface HeroMetricsProps {
  metrics: HeroMetric[];
}

export default function HeroMetrics({ metrics }: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <HeroMetricCard key={m.label} metric={m} index={i} />
      ))}
    </div>
  );
}

function HeroMetricCard({ metric, index }: { metric: HeroMetric; index: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useCountUpRef(metric.value, 1500);
  const styles = ACCENT[metric.accent];

  const deltaIsUp = metric.delta !== undefined && metric.delta > 0;
  const deltaIsDown = metric.delta !== undefined && metric.delta < 0;
  const deltaColor = metric.delta === undefined
    ? "text-slate-500"
    : deltaIsUp
      ? (metric.upIsGood !== false ? "text-green-400 bg-green-500/15 border-green-500/30" : "text-red-400 bg-red-500/15 border-red-500/30")
      : deltaIsDown
        ? (metric.upIsGood !== false ? "text-red-400 bg-red-500/15 border-red-500/30" : "text-green-400 bg-green-500/15 border-green-500/30")
        : "text-slate-400 bg-white/5 border-white/10";

  // Sparkline color in hex
  const sparkColor = metric.accent === "electric" ? "#3b82f6"
    : metric.accent === "saffron"  ? "#fbbf24"
    : metric.accent === "red"      ? "#ef4444"
    : metric.accent === "green"    ? "#22c55e"
    : "#60a5fa";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "group relative glass rounded-2xl p-5 overflow-hidden",
        "ring-1 ring-white/[0.06] cursor-default",
        "hover:ring-2 hover:-translate-y-1 hover:shadow-2xl transition-all duration-500",
        styles.ring, styles.glow
      )}
    >
      {/* Animated halo on hover */}
      <motion.div
        className={cn("absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none", styles.halo)}
        animate={{ opacity: hovered ? 0.6 : 0.15, scale: hovered ? 1.2 : 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Top progress bar that fills on mount */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3 + index * 0.08, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r origin-left", styles.bar)}
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className={cn("w-11 h-11 rounded-xl flex items-center justify-center ring-1 ring-white/10", styles.bg)}
          >
            <metric.icon className={cn("w-5 h-5", styles.icon)} />
          </motion.div>
          {metric.delta !== undefined && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.08 }}
              className={cn("flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border", deltaColor)}
            >
              {deltaIsUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : deltaIsDown ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
              {Math.abs(metric.delta).toFixed(1)}%
            </motion.div>
          )}
        </div>

        {/* Animated value */}
        <div className="relative">
          <p className="text-3xl font-bold text-white tracking-tight leading-none tabular-nums">
            {fmt(ref, metric.format, metric.prefix, metric.suffix, metric.decimals)}
          </p>
          {/* Underline that grows on hover */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: hovered ? 1 : 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn("h-px mt-2 bg-gradient-to-r origin-left", styles.bar)}
          />
        </div>

        {/* Label + subtext */}
        <p className="text-sm text-slate-300 font-medium mt-2">{metric.label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{metric.subtext}</p>

        {/* Sparkline */}
        {metric.trend && (
          <div className="mt-3 -mb-1">
            <Sparkline data={metric.trend} color={sparkColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// useCountUp wrapped to keep this file self-contained
function useCountUpRef(target: number, duration = 1500): number {
  return useCountUp(target, duration);
}
