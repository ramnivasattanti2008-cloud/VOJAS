/**
 * WorksBreakdown — horizontal phase timeline showing construction/work phases
 * for a project. Used in MP project cards, project detail page overview.
 */

import { CheckCircle2, Circle, Clock, Hammer, AlertCircle, Ban } from "lucide-react";

export interface WorkPhase {
  name: string;
  status: "completed" | "active" | "pending" | "delayed" | "skipped";
  pct: number; // 0-100
}

interface WorksBreakdownProps {
  works: WorkPhase[];
  /** "compact" = single row with dot indicators (for cards) */
  /** "full" = expanded timeline with labels and progress (for detail page) */
  variant?: "compact" | "full";
  className?: string;
}

const STATUS_META = {
  completed: { color: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/40", label: "Done" },
  active:    { color: "text-electric-400", bg: "bg-electric-500", border: "border-electric-500/40", label: "Active" },
  pending:   { color: "text-slate-500",    bg: "bg-slate-600",   border: "border-slate-600/30",   label: "Pending" },
  delayed:   { color: "text-red-400",      bg: "bg-red-500",     border: "border-red-500/40",     label: "Delayed" },
  skipped:   { color: "text-slate-600",    bg: "bg-slate-700",   border: "border-slate-700/30",   label: "Skipped" },
} as const;

export default function WorksBreakdown({ works, variant = "full", className = "" }: WorksBreakdownProps) {
  if (!works || works.length === 0) return null;

  if (variant === "compact") {
    return <CompactView works={works} className={className} />;
  }
  return <FullView works={works} className={className} />;
}

function CompactView({ works, className }: { works: WorkPhase[]; className: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {works.map((phase, i) => {
        const meta = STATUS_META[phase.status];
        const Icon =
          phase.status === "completed" ? CheckCircle2 :
          phase.status === "active"    ? Clock :
          phase.status === "delayed"   ? AlertCircle :
          phase.status === "skipped"   ? Ban :
          Circle;
        return (
          <div
            key={i}
            title={`${phase.name} — ${meta.label} (${phase.pct}%)`}
            className={`w-2.5 h-2.5 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-1.5 h-1.5 text-navy-950" />
          </div>
        );
      })}
      <span className="text-[9px] text-slate-500 font-mono ml-1.5 whitespace-nowrap">
        {works.filter((w) => w.status === "completed").length}/{works.length}
      </span>
    </div>
  );
}

function FullView({ works, className }: { works: WorkPhase[]; className: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Hammer className="w-3.5 h-3.5 text-orange-400" />
        <h4 className="text-xs font-semibold text-slate-300">Works Breakdown</h4>
        <span className="text-[10px] text-slate-500 ml-auto">
          {works.filter((w) => w.status === "completed").length} of {works.length} phases complete
        </span>
      </div>

      {/* Horizontal timeline */}
      <div className="relative pt-6 pb-2">
        {/* Background bar */}
        <div className="absolute top-[28px] left-0 right-0 h-0.5 bg-navy-800 rounded-full" />
        {/* Progress fill */}
        <div
          className="absolute top-[28px] left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-electric-500 rounded-full transition-all"
          style={{
            width: `${(works.filter((w) => w.status === "completed").length / works.length) * 100}%`,
          }}
        />
        {/* Phase nodes */}
        <div className="relative flex items-start justify-between">
          {works.map((phase, i) => {
            const meta = STATUS_META[phase.status];
            const isActive = phase.status === "active";
            return (
              <div
                key={i}
                className="flex flex-col items-center flex-1 min-w-0"
                style={{ maxWidth: `${100 / works.length}%` }}
              >
                {/* Node */}
                <div
                  className={`w-5 h-5 rounded-full ${meta.bg} border-2 ${
                    isActive ? "border-white/40 ring-2 ring-electric-500/30" : meta.border
                  } flex items-center justify-center mb-1.5 transition-all z-10`}
                >
                  {phase.status === "completed" ? (
                    <CheckCircle2 className="w-3 h-3 text-navy-950" />
                  ) : phase.status === "delayed" ? (
                    <AlertCircle className="w-3 h-3 text-navy-950" />
                  ) : phase.status === "skipped" ? (
                    <Ban className="w-3 h-3 text-navy-950" />
                  ) : isActive ? (
                    <Clock className="w-2.5 h-2.5 text-navy-950" />
                  ) : (
                    <Circle className="w-2.5 h-2.5 text-navy-950" />
                  )}
                </div>

                {/* Label */}
                <p className={`text-[9px] font-medium text-center leading-tight px-0.5 line-clamp-2 ${meta.color}`}>
                  {phase.name}
                </p>

                {/* Status text + pct */}
                <p className={`text-[8px] font-mono mt-0.5 ${meta.color}`}>
                  {meta.label} · {phase.pct}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase list (detailed) */}
      <div className="space-y-1 pt-2 border-t border-white/5">
        {works.map((phase, i) => {
          const meta = STATUS_META[phase.status];
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.bg} shrink-0`} />
              <span className="text-slate-300 flex-1 truncate">{phase.name}</span>
              <span className={`font-mono ${meta.color}`}>{phase.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
