import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, Gavel, Quote } from "lucide-react";
import type { AIExplanation } from "@/types";
import { cn } from "@/lib/utils";

interface AIVerdictPanelProps {
  explanation: AIExplanation;
  severity: string;
  onRegenerate?: () => void;
  loading?: boolean;
}

const RING_SIZE = 64;
const RING_RADIUS = 26;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function ringColor(confidence: number): { stroke: string; text: string; bg: string; label: string } {
  if (confidence >= 80) return { stroke: "#34d399", text: "text-green-400", bg: "bg-green-500/10", label: "HIGH" };
  if (confidence >= 60) return { stroke: "#fbbf24", text: "text-amber-400", bg: "bg-amber-500/10", label: "MEDIUM" };
  return { stroke: "#94a3b8", text: "text-slate-400", bg: "bg-slate-500/10", label: "LOW" };
}

function verdictFooter(severity: string, confidence: number): string {
  if (severity === "CRITICAL") return "Critical — escalate to senior officer within 24 hours.";
  if (confidence >= 80) return "AI confidence is high — human review recommended within 7 days.";
  if (confidence >= 60) return "AI confidence is moderate — gather additional evidence before action.";
  return "AI confidence is low — log for periodic monitoring and pattern analysis.";
}

export default function AIVerdictPanel({ explanation, severity, onRegenerate, loading }: AIVerdictPanelProps) {
  const conf = explanation.confidence;
  const colors = ringColor(conf);
  const offset = RING_CIRC * (1 - conf / 100);

  return (
    <div className="glass rounded-xl p-5 relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-saffron-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-saffron-500/15 border border-saffron-500/30 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-saffron-400" />
        </div>
        <h2 className="text-sm font-semibold text-white tracking-tight">AI Verdict</h2>
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
          colors.bg, colors.text, "border-current/30"
        )}>
          {colors.label} confidence
        </span>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 text-[10px] font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="w-3 h-3 border-2 border-saffron-400/30 border-t-saffron-400 rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Regenerate
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
        {/* ── Confidence ring ────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                className="text-navy-800"
                strokeWidth={6}
              />
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={colors.stroke}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                initial={{ strokeDashoffset: RING_CIRC }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={cn("text-base font-bold leading-none", colors.text)}
              >
                {conf}
              </motion.span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">/ 100</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">AI Confidence</p>
        </div>

        {/* ── Verdict statement ──────────────────────────────────────────── */}
        <div className="space-y-3 min-w-0">
          <div className="relative pl-4 border-l-2 border-saffron-500/40">
            <Quote className="absolute -left-[7px] -top-0.5 w-3 h-3 text-saffron-500 bg-navy-900 rounded-full p-px" />
            <p className="text-xs text-slate-200 leading-relaxed italic">
              {explanation.explanation}
            </p>
          </div>

          {/* Contributing factors */}
          {explanation.contributingFactors.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
                Contributing Factors
              </p>
              <div className="space-y-1">
                {explanation.contributingFactors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-saffron-500/80 to-saffron-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${f.weight}%` }}
                          transition={{ duration: 0.9, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-300 flex-1 min-w-0 truncate">{f.factor}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{f.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-4 p-3 rounded-lg bg-saffron-500/5 border border-saffron-500/20">
        <p className="text-[9px] uppercase tracking-widest text-saffron-400/80 font-semibold mb-1 flex items-center gap-1.5">
          <Gavel className="w-3 h-3" />
          AI Recommendation
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          {explanation.recommendation}
        </p>
      </div>

      {/* Verdict footer */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
        <AlertTriangle className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {verdictFooter(severity, conf)}
        </p>
      </div>
    </div>
  );
}
