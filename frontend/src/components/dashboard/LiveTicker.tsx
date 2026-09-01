import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface TickerItem {
  id: string;
  label: string;
  value: string;
  delta: number;
  category: "finance" | "anomaly" | "report" | "system";
}

const CATEGORIES: Record<TickerItem["category"], { color: string; bg: string }> = {
  finance: { color: "text-electric-400", bg: "bg-electric-500/15" },
  anomaly: { color: "text-red-400",       bg: "bg-red-500/15"       },
  report:  { color: "text-saffron-400",   bg: "bg-saffron-500/15"   },
  system:  { color: "text-green-400",     bg: "bg-green-500/15"     },
};

const SAMPLE: TickerItem[] = [
  { id: "1", label: "Total budget",       value: "₹142.5 Cr", delta: +2.3,  category: "finance" },
  { id: "2", label: "Anomalies flagged",  value: "8",          delta: -1.1,  category: "anomaly" },
  { id: "3", label: "New reports today",  value: "12",         delta: +4.0,  category: "report"  },
  { id: "4", label: "API latency",        value: "82 ms",      delta: -8.0,  category: "system"  },
  { id: "5", label: "Utilization",        value: "78.4%",      delta: +0.5,  category: "finance" },
  { id: "6", label: "Active projects",    value: "5",          delta: 0,     category: "system"  },
  { id: "7", label: "Verification queue", value: "23",         delta: -2.2,  category: "report"  },
  { id: "8", label: "Open anomalies",     value: "3",          delta: -0.8,  category: "anomaly" },
  { id: "9", label: "Reports resolved",   value: "47",         delta: +6.1,  category: "report"  },
  { id: "10", label: "DB connections",    value: "14",         delta: +0.0,  category: "system"  },
];

/**
 * A continuously scrolling marquee of live KPIs — Bloomberg-style data ticker
 * that gives the dashboard a "this is a real production system" feel.
 */
export default function LiveTicker({ items }: { items?: TickerItem[] }) {
  const data = items ?? SAMPLE;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % data.length), 2400);
    return () => clearInterval(t);
  }, [data.length]);

  const featured = data[index];
  const fcat = CATEGORIES[featured.category];
  const deltaColor = featured.delta > 0 ? "text-green-400" : featured.delta < 0 ? "text-red-400" : "text-slate-400";

  return (
    <div className="relative overflow-hidden glass rounded-xl border border-white/5 py-2.5">
      {/* Side fades */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-navy-900/95 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-navy-900/95 to-transparent z-10 pointer-events-none" />

      <div className="flex items-center gap-6 px-4">
        {/* Static "LIVE" badge */}
        <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-white/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-bold tracking-widest text-red-400">LIVE</span>
          <Radio className="w-3 h-3 text-red-400" />
        </div>

        {/* Animated featured item */}
        <AnimatePresence mode="wait">
          <motion.div
            key={featured.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 shrink-0 min-w-0"
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${fcat.bg} ${fcat.color}`}>
              {featured.category}
            </span>
            <span className="text-xs text-slate-400 truncate max-w-[120px]">{featured.label}</span>
            <span className="text-sm font-bold text-white tabular-nums">{featured.value}</span>
            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${deltaColor}`}>
              {featured.delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> :
               featured.delta < 0 ? <TrendingDown className="w-2.5 h-2.5" /> :
               <Minus className="w-2.5 h-2.5" />}
              {Math.abs(featured.delta).toFixed(1)}%
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Continuous marquee of remaining items */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 whitespace-nowrap animate-marquee">
            {[...data, ...data].map((it, i) => {
              const style = CATEGORIES[it.category];
              const d = it.delta > 0 ? "text-green-400/70" : it.delta < 0 ? "text-red-400/70" : "text-slate-500";
              return (
                <div key={`${it.id}-${i}`} className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${style.color} opacity-60`}>
                    {it.category}
                  </span>
                  <span className="text-[11px] text-slate-500">{it.label}</span>
                  <span className="text-[11px] font-semibold text-slate-300 tabular-nums">{it.value}</span>
                  <span className={`text-[9px] font-bold ${d}`}>
                    {it.delta > 0 ? "+" : ""}{it.delta.toFixed(1)}%
                  </span>
                  <span className="w-px h-3 bg-white/10" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
