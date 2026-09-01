import { useEffect, useRef, useState, type ComponentType } from "react";
import { motion, type Variants } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

export type AccentColor = "electric" | "saffron" | "green" | "blue" | "red";

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: AccentColor;
  subtext: string;
  /** Optional trend line — sparkline at the bottom */
  trend?: number[];
  /** Optional delta like "+12%" */
  delta?: string;
  /** Is the delta "up good" (green) or "down good" (red)? Default: up = good */
  upIsGood?: boolean;
  /** Compact = smaller padding for tight grids */
  compact?: boolean;
}

const ACCENT: Record<AccentColor, {
  icon: string;
  ring: string;
  bg: string;
  glow: string;
  line: string;
  number: string;
}> = {
  electric: {
    icon: "text-electric-400",
    ring: "ring-electric-500/20 group-hover:ring-electric-500/40",
    bg: "bg-electric-500/10 group-hover:bg-electric-500/15",
    glow: "bg-electric-400",
    line: "from-electric-500/0 via-electric-400/40 to-electric-500/0",
    number: "text-white",
  },
  saffron: {
    icon: "text-saffron-400",
    ring: "ring-saffron-500/20 group-hover:ring-saffron-500/40",
    bg: "bg-saffron-500/10 group-hover:bg-saffron-500/15",
    glow: "bg-saffron-400",
    line: "from-saffron-500/0 via-saffron-400/40 to-saffron-500/0",
    number: "text-white",
  },
  green: {
    icon: "text-green-400",
    ring: "ring-green-500/20 group-hover:ring-green-500/40",
    bg: "bg-green-500/10 group-hover:bg-green-500/15",
    glow: "bg-green-400",
    line: "from-green-500/0 via-green-400/40 to-green-500/0",
    number: "text-white",
  },
  blue: {
    icon: "text-blue-400",
    ring: "ring-blue-500/20 group-hover:ring-blue-500/40",
    bg: "bg-blue-500/10 group-hover:bg-blue-500/15",
    glow: "bg-blue-400",
    line: "from-blue-500/0 via-blue-400/40 to-blue-500/0",
    number: "text-white",
  },
  red: {
    icon: "text-red-400",
    ring: "ring-red-500/20 group-hover:ring-red-500/40",
    bg: "bg-red-500/10 group-hover:bg-red-500/15",
    glow: "bg-red-400",
    line: "from-red-500/0 via-red-400/40 to-red-500/0",
    number: "text-white",
  },
};

const TREND_COLORS: Record<AccentColor, string> = {
  electric: "#3b82f6",
  saffron:  "#fbbf24",
  green:    "#22c55e",
  blue:     "#60a5fa",
  red:      "#ef4444",
};

function fmt(v: number): string {
  if (v >= 1_00_00_000) return `${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)    return `${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000)       return `${(v / 1_000).toFixed(1)}K`;
  if (v < 10)           return v.toFixed(1);
  return Math.floor(v).toLocaleString("en-IN");
}

function Sparkline({ data, color }: { data: number[]; color: AccentColor }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return [x, y] as const;
  });
  const points = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const stroke = TREND_COLORS[color];
  const gradId = `sg-${color}`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible opacity-50 group-hover:opacity-80 transition-opacity duration-500"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2"
        fill={stroke}
        className="animate-pulse"
      />
    </svg>
  );
}

const variants: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

/**
 * A hero metric card with animated count, optional trend line, and a soft glow.
 * Built for the Command Center — uses viewport detection so numbers only
 * "wake up" when the user actually sees them.
 */
export default function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  subtext,
  trend,
  delta,
  upIsGood = true,
  compact = false,
}: MetricCardProps) {
  const count = useCountUp(value, 1300);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const styles = ACCENT[accent];
  const TypedIcon = Icon as ComponentType<{ className?: string }>;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const deltaIsUp = delta?.trim().startsWith("+");
  const deltaColor = !delta
    ? ""
    : (deltaIsUp === upIsGood)
      ? "text-green-400 bg-green-500/10 border-green-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";
  const iconClass: string = cn("w-5 h-5 transition-transform group-hover:scale-110 duration-300", styles.icon);
  const chipClass: string = cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", deltaColor);

  return (
    <motion.div
      ref={ref}
      variants={variants}
      className={cn(
        "group glass rounded-xl relative overflow-hidden",
        "ring-1 ring-white/[0.04] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl",
        styles.ring,
        compact ? "p-4" : "p-5"
      ) as string}
    >
      {/* Top accent line that appears on viewport entry */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-px bg-gradient-to-r transition-opacity duration-700",
          styles.line,
          visible ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      />

      {/* Header row: icon + delta chip */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors ring-1 ring-white/5", styles.bg) as string}>
          <TypedIcon className={iconClass} />
        </div>
        {delta && (
          <span className={chipClass}>
            {delta}
          </span>
        )}
      </div>

      {/* Animated value */}
      <div className="relative inline-block">
        <p
          className={cn(
            "font-bold text-white tracking-tight leading-none tabular-nums",
            compact ? "text-2xl" : "text-3xl"
          )}
        >
          {fmt(count)}
        </p>
        {/* Soft glow on value when visible */}
        {visible && (
          <span
            className={cn("absolute inset-0 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none", styles.glow)}
            aria-hidden
          />
        )}
      </div>

      {/* Label + subtext */}
      <p className="text-sm text-slate-400 font-medium mt-1">{label}</p>
      <p className="text-[11px] text-slate-600 mt-0.5">{subtext}</p>

      {/* Sparkline */}
      {trend && (
        <div className="absolute bottom-3 right-3">
          <Sparkline data={trend} color={accent} />
        </div>
      )}

      {/* Shimmer overlay on hover */}
      <div
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        }}
        aria-hidden
      />
    </motion.div>
  );
}
