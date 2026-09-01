import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface MetricStripProps {
  metrics: {
    label: string;
    value: number;
    /** "auto" formats in INR, "number" keeps digits, "percent" shows % */
    format?: "auto" | "number" | "percent";
    /** Compact number label like "Cr", "L", "K" */
    unit?: string;
    accent?: "electric" | "saffron" | "green" | "blue" | "red";
  }[];
}

const fmt = (v: number, format = "auto", unit = ""): string => {
  if (format === "percent") return `${Math.round(v)}%`;
  if (format === "number") {
    if (unit === "K" && v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString("en-IN");
  }
  // INR auto-format
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)     return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000)        return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};

const ACCENT_DOT: Record<string, string> = {
  electric: "bg-electric-400",
  saffron:  "bg-saffron-400",
  green:    "bg-green-400",
  blue:     "bg-blue-400",
  red:      "bg-red-400",
};

export default function MetricStrip({ metrics }: MetricStripProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      {metrics.map((m, i) => (
        <MetricPill key={m.label} metric={m} index={i} />
      ))}
    </motion.div>
  );
}

function MetricPill({ metric, index }: { metric: MetricStripProps["metrics"][0]; index: number }) {
  const count = useCountUp(metric.value, 1400);
  const dot = ACCENT_DOT[metric.accent ?? "electric"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 + index * 0.07,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative group"
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative glass rounded-xl p-3 border border-white/[0.05] overflow-hidden">
        {/* Left accent bar */}
        <div className={cn("absolute left-0 top-3 bottom-3 w-px rounded-full", dot)} />

        <div className="pl-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-0.5">
            {metric.label}
          </p>
          <p className="text-xl font-bold text-white tabular-nums leading-tight">
            {fmt(count, metric.format, metric.unit)}
          </p>
        </div>

        {/* Subtle bottom shimmer */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`,
          }}
          aria-hidden
        />
      </div>
    </motion.div>
  );
}
