import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";

export type AccentColor = "electric" | "saffron" | "green" | "blue";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: AccentColor;
  subtext: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  sparkline?: number[];
}

const ACCENT = {
  electric: {
    bg: "bg-electric-500/15 group-hover:bg-electric-500/25",
    icon: "text-electric-400",
    border: "group-hover:border-electric-500/30",
    shimmer: "bg-gradient-to-r from-electric-500/20 via-electric-400/20 to-electric-500/20",
  },
  saffron: {
    bg: "bg-saffron-500/15 group-hover:bg-saffron-500/25",
    icon: "text-saffron-400",
    border: "group-hover:border-saffron-500/30",
    shimmer: "bg-gradient-to-r from-saffron-500/20 via-saffron-400/20 to-saffron-500/20",
  },
  green: {
    bg: "bg-green-500/15 group-hover:bg-green-500/25",
    icon: "text-green-400",
    border: "group-hover:border-green-500/30",
    shimmer: "bg-gradient-to-r from-green-500/20 via-green-400/20 to-green-500/20",
  },
  blue: {
    bg: "bg-blue-500/15 group-hover:bg-blue-500/25",
    icon: "text-blue-400",
    border: "group-hover:border-blue-500/30",
    shimmer: "bg-gradient-to-r from-blue-500/20 via-blue-400/20 to-blue-500/20",
  },
};

function formatValue(raw: number, prefix = "", suffix = "", decimals = 0): string {
  const formatted = decimals > 0
    ? raw.toFixed(decimals)
    : Math.floor(raw).toLocaleString("en-IN");
  return `${prefix}${formatted}${suffix}`;
}

function Sparkline({ data, color }: { data: number[]; color: AccentColor }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 64;
  const H = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const colorClass = color === "electric" ? "#3b82f6"
    : color === "saffron" ? "#fbbf24"
    : color === "green"   ? "#22c55e"
    : "#3b82f6";

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="opacity-60 group-hover:opacity-80 transition-opacity"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorClass} stopOpacity="0.4" />
          <stop offset="100%" stopColor={colorClass} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${H} ${points.join(" ")} ${W},${H}`}
        fill={`url(#sg-${color})`}
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={colorClass}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r="2.5"
        fill={colorClass}
        className="animate-pulse"
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  subtext,
  prefix = "",
  suffix = "",
  decimals = 0,
  sparkline,
}: StatCardProps) {
  const count = useCountUp(value, 1400);
  const [entered, setEntered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Intersection observer — trigger animation when card enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const styles = ACCENT[accent];

  return (
    <div
      ref={ref}
      className={`glass rounded-xl p-5 group relative overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-electric-500/10 border-transparent ${styles.border}`}
    >
      {/* Icon container */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${styles.bg}`}
      >
        <Icon className={`w-5 h-5 ${styles.icon}`} />
      </div>

      {/* Animated value */}
      <div className="mb-1">
        <div className="relative inline-block">
          <p className="text-3xl font-bold text-white tracking-tight leading-none">
            {formatValue(count, prefix, suffix, decimals)}
          </p>
          {/* Glow on value when counting */}
          {entered && (
            <span
              className={`absolute inset-0 blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none ${
                accent === "electric" ? "bg-electric-400" :
                accent === "saffron"  ? "bg-saffron-400"  :
                accent === "green"    ? "bg-green-400"    :
                "bg-blue-400"
              }`}
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Label */}
      <p className="text-sm text-slate-400 font-medium">{label}</p>

      {/* Subtext */}
      <p className="text-[11px] text-slate-600 mt-0.5">{subtext}</p>

      {/* Sparkline */}
      {sparkline && (
        <div className="absolute bottom-4 right-4">
          <Sparkline data={sparkline} color={accent} />
        </div>
      )}

      {/* Shimmer overlay on hover */}
      <div
        className="shimmer-overlay pointer-events-none"
        aria-hidden
      />

      {/* Top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${entered ? styles.shimmer : "opacity-0"} to-transparent transition-opacity duration-500`}
        aria-hidden
      />
    </div>
  );
}
