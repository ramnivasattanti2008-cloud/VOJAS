/**
 * MetricCard — VOJAS 2.0 light theme.
 * Compact KPI card following IBM Carbon's metric pattern.
 * No glassmorphism, no glow, no shimmer. Clean white surface.
 */

import { type ComponentType } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

export type AccentColor = "electric" | "saffron" | "green" | "blue" | "red" | "amber";

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: AccentColor;
  subtext?: string;
  /** Optional sparkline trend (real data only — do not invent) */
  trend?: number[];
  /** Optional delta like "+12%" */
  delta?: string;
  /** "up good" or "down good" — default up is good */
  upIsGood?: boolean;
  /** Compact = smaller padding for tight grids */
  compact?: boolean;
}

const ACCENT: Record<AccentColor, { icon: string; bg: string; line: string }> = {
  electric: { icon: "text-blue-600",    bg: "bg-blue-50",    line: "bg-blue-500"    },
  saffron:  { icon: "text-orange-600",  bg: "bg-orange-50",  line: "bg-orange-500"  },
  green:    { icon: "text-green-600",   bg: "bg-green-50",   line: "bg-green-500"   },
  blue:     { icon: "text-sky-600",     bg: "bg-sky-50",     line: "bg-sky-500"     },
  red:      { icon: "text-red-600",     bg: "bg-red-50",     line: "bg-red-500"     },
  amber:    { icon: "text-amber-600",   bg: "bg-amber-50",   line: "bg-amber-500"   },
};

const TREND_COLORS: Record<AccentColor, string> = {
  electric: "#2563eb",
  saffron:  "#ea580c",
  green:    "#16a34a",
  blue:     "#0284c7",
  red:      "#dc2626",
  amber:    "#d97706",
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

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible opacity-70"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const count = useCountUp(value, 1100);
  const styles = ACCENT[accent];
  const TypedIcon = Icon as ComponentType<{ className?: string }>;

  const deltaIsUp = delta?.trim().startsWith("+");
  const deltaColor = !delta
    ? ""
    : (deltaIsUp === upIsGood)
      ? "text-green-700 bg-green-50 border-green-200"
      : "text-red-700 bg-red-50 border-red-200";

  return (
    <div
      className={cn(
        "group relative rounded-md border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-sm",
        compact ? "p-4" : "p-5"
      )}
    >
      {/* Top accent bar — 2px */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", styles.line)} aria-hidden />

      {/* Header row: icon + delta chip */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded flex items-center justify-center", styles.bg)}>
          <TypedIcon className={cn("w-4.5 h-4.5", styles.icon)} />
        </div>
        {delta && (
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border tabular-nums", deltaColor)}>
            {delta}
          </span>
        )}
      </div>

      {/* Animated value */}
      <p
        className={cn(
          "font-semibold text-gray-900 tracking-tight leading-none tabular-nums",
          compact ? "text-2xl" : "text-[28px]"
        )}
      >
        {fmt(count)}
      </p>

      {/* Label + subtext */}
      <p className="text-sm text-gray-700 font-medium mt-2">{label}</p>
      {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}

      {/* Sparkline (real data only) */}
      {trend && trend.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Sparkline data={trend} color={accent} />
        </div>
      )}
    </div>
  );
}
