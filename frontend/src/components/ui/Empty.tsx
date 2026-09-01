import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  accent?: "electric" | "saffron" | "green" | "red";
}

const ACCENT_CLASS = {
  electric: "text-electric-400/30",
  saffron:  "text-saffron-400/30",
  green:    "text-green-400/30",
  red:      "text-red-400/30",
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  accent = "electric",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col items-center justify-center py-14 text-center", className)}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Icon className={cn("w-12 h-12 mb-4", ACCENT_CLASS[accent])} strokeWidth={1} />
      </motion.div>
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-slate-600 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
