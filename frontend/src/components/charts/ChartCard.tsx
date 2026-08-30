import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable wrapper for chart panels — uses the VOJAS dark glass treatment.
 */
export function ChartCard({ title, subtitle, icon, children, className = "" }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass rounded-xl p-5 ${className}`}
      aria-label={`${title}${subtitle ? ` — ${subtitle}` : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-wider">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}
