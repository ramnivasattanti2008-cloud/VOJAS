import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronRight, Inbox, type LucideIcon } from "lucide-react";

export interface TaskItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  href: string;
  meta?: string;
  accent: "red" | "amber" | "electric" | "green" | "blue" | "emerald" | "saffron";
  urgent?: boolean;
}

const ACCENT_MAP: Record<TaskItem["accent"], { bar: string; icon: string; bg: string }> = {
  red:     { bar: "bg-red-500",     icon: "text-red-400",     bg: "bg-red-500/10" },
  amber:   { bar: "bg-amber-500",   icon: "text-amber-400",   bg: "bg-amber-500/10" },
  saffron: { bar: "bg-saffron-500", icon: "text-saffron-400", bg: "bg-saffron-500/10" },
  electric:{ bar: "bg-electric-500", icon: "text-electric-400", bg: "bg-electric-500/10" },
  green:   { bar: "bg-green-500",   icon: "text-green-400",   bg: "bg-green-500/10" },
  blue:    { bar: "bg-blue-500",    icon: "text-blue-400",    bg: "bg-blue-500/10" },
  emerald: { bar: "bg-emerald-500", icon: "text-emerald-400", bg: "bg-emerald-500/10" },
};

interface MyTasksProps {
  title?: string;
  items: TaskItem[];
  viewAllHref?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Personal task queue for the current user — anomaly acknowledgements, report assignments,
 * pending verifications. Click a task to navigate to its detail page.
 */
export default function MyTasks({
  title = "My Tasks", items, viewAllHref, emptyMessage = "All caught up. Nothing waiting on you.", className,
}: MyTasksProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("glass rounded-2xl p-5 ring-1 ring-white/5 relative overflow-hidden", className)}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric-500/60 to-electric-400/0" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-white uppercase tracking-widest">{title}</h2>
          {items.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-electric-500/20 text-electric-400 tabular-nums">
              {items.length}
            </span>
          )}
        </div>
        {viewAllHref && (
          <Link to={viewAllHref} className="flex items-center gap-1 text-[11px] text-electric-400 hover:text-electric-300 transition-colors font-medium">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Inbox className="w-8 h-8 text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((t, i) => {
            const cfg = ACCENT_MAP[t.accent];
            const Icon = t.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              >
                <Link
                  to={t.href}
                  className={cn(
                    "group relative flex items-center gap-3 p-2.5 rounded-lg",
                    "border border-white/5 bg-navy-800/30",
                    "hover:border-white/10 hover:bg-navy-800/60 transition-all",
                  )}
                >
                  {/* Left accent bar */}
                  <span className={cn("absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-full", cfg.bar)} />

                  {/* Icon */}
                  {Icon && (
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-1", cfg.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", cfg.icon)} />
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 group-hover:text-white font-medium truncate">{t.title}</p>
                    {t.subtitle && (
                      <p className="text-[10px] text-slate-600 mt-0.5 truncate">{t.subtitle}</p>
                    )}
                  </div>

                  {/* Meta */}
                  {t.meta && (
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{t.meta}</span>
                  )}

                  {/* Urgent pulse */}
                  {t.urgent && (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                    </span>
                  )}

                  <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
