import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronRight, Zap, type LucideIcon } from "lucide-react";

export interface QuickAction {
  label: string;
  description?: string;
  icon: LucideIcon;
  href: string;
  accent: "electric" | "saffron" | "red" | "green" | "emerald" | "blue" | "amber";
  badge?: string | number;
}

const ACCENT_MAP: Record<QuickAction["accent"], { icon: string; ring: string; glow: string; bg: string }> = {
  electric: { icon: "text-electric-400", ring: "hover:ring-electric-500/40", glow: "hover:shadow-electric-500/20",   bg: "bg-electric-500/10" },
  saffron:  { icon: "text-saffron-400",  ring: "hover:ring-saffron-500/40",  glow: "hover:shadow-saffron-500/20",    bg: "bg-saffron-500/10" },
  red:      { icon: "text-red-400",      ring: "hover:ring-red-500/40",      glow: "hover:shadow-red-500/20",        bg: "bg-red-500/10" },
  green:    { icon: "text-green-400",    ring: "hover:ring-green-500/40",    glow: "hover:shadow-green-500/20",      bg: "bg-green-500/10" },
  emerald:  { icon: "text-emerald-400",  ring: "hover:ring-emerald-500/40",  glow: "hover:shadow-emerald-500/20",    bg: "bg-emerald-500/10" },
  blue:     { icon: "text-blue-400",     ring: "hover:ring-blue-500/40",     glow: "hover:shadow-blue-500/20",       bg: "bg-blue-500/10" },
  amber:    { icon: "text-amber-400",    ring: "hover:ring-amber-500/40",    glow: "hover:shadow-amber-500/20",      bg: "bg-amber-500/10" },
};

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

/**
 * Grid of action tiles — primary navigation cards surfaced for the role.
 */
export default function QuickActions({ actions, title = "Quick Actions", columns = 4, className }: QuickActionsProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  }[columns];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("glass rounded-2xl p-5 ring-1 ring-white/5 relative overflow-hidden", className)}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-electric-400" />
        </div>
        <h2 className="text-xs font-semibold text-white uppercase tracking-widest">{title}</h2>
      </div>
      <div className={cn("grid gap-3", gridCols)}>
        {actions.map((a, i) => {
          const cfg = ACCENT_MAP[a.accent];
          const Icon = a.icon;
          return (
            <motion.div
              key={a.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to={a.href}
                className={cn(
                  "group relative flex flex-col p-4 rounded-xl bg-navy-800/40 border border-white/5",
                  "ring-1 ring-transparent transition-all duration-300",
                  "hover:border-white/10 hover:bg-navy-800/70 hover:-translate-y-0.5",
                  "hover:shadow-lg", cfg.glow, cfg.ring,
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", cfg.bg)}>
                    <Icon className={cn("w-5 h-5", cfg.icon)} />
                  </div>
                  {a.badge !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 tabular-nums">
                      {a.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white leading-snug">{a.label}</p>
                {a.description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{a.description}</p>
                )}
                <ChevronRight className="absolute top-4 right-4 w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
