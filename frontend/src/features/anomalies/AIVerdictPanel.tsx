/**
 * AIVerdictPanel — AI explanation display
 * IBM Carbon light theme.
 */

import { Sparkles, AlertTriangle, Gavel, Quote } from "lucide-react";
import type { AIExplanation } from "@/types";
import { cn } from "@/lib/utils";

interface AIVerdictPanelProps {
  explanation: AIExplanation;
  severity: string;
  onRegenerate?: () => void;
  loading?: boolean;
}

function ringColor(confidence: number): { stroke: string; text: string; bg: string; bgLight: string; label: string } {
  if (confidence >= 80) return { stroke: "#16a34a", text: "text-green-600", bg: "bg-green-50", bgLight: "bg-green-100", label: "HIGH" };
  if (confidence >= 60) return { stroke: "#d97706", text: "text-amber-600", bg: "bg-amber-50", bgLight: "bg-amber-100", label: "MEDIUM" };
  return { stroke: "#9ca3af", text: "text-gray-500", bg: "bg-gray-100", bgLight: "bg-gray-200", label: "LOW" };
}

function verdictFooter(severity: string, confidence: number): string {
  if (severity === "CRITICAL") return "Critical — escalate to senior officer within 24 hours.";
  if (confidence >= 80) return "AI confidence is high — human review recommended within 7 days.";
  if (confidence >= 60) return "AI confidence is moderate — gather additional evidence before action.";
  return "AI confidence is low — log for periodic monitoring and pattern analysis.";
}

const RING_SIZE = 64;
const RING_RADIUS = 26;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export default function AIVerdictPanel({ explanation, severity, onRegenerate, loading }: AIVerdictPanelProps) {
  const conf = explanation.confidence;
  const colors = ringColor(conf);
  const offset = RING_CIRC * (1 - conf / 100);

  return (
    <div className="bg-white border border-gray-200 rounded-md p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight">AI Verdict</h2>
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
          colors.bg, colors.text, "border-current opacity-80"
        )}>
          {colors.label} confidence
        </span>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-[10px] font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Regenerate
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
        {/* Confidence ring */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                className="text-gray-100"
                strokeWidth={6}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={colors.stroke}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-base font-bold leading-none", colors.text)}>
                {conf}
              </span>
              <span className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">/ 100</span>
            </div>
          </div>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">AI Confidence</p>
        </div>

        {/* Verdict statement */}
        <div className="space-y-3 min-w-0">
          <div className="relative pl-4 border-l-2 border-blue-200">
            <Quote className="absolute -left-[7px] -top-0.5 w-3 h-3 text-blue-400 bg-white rounded-full p-px" />
            <p className="text-xs text-gray-700 leading-relaxed italic">
              {explanation.explanation}
            </p>
          </div>

          {explanation.contributingFactors.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">
                Contributing Factors
              </p>
              <div className="space-y-1">
                {explanation.contributingFactors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${f.weight}%`, transition: "width 0.5s ease" }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-700 flex-1 min-w-0 truncate">{f.factor}</span>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0">{f.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
        <p className="text-[9px] uppercase tracking-widest text-blue-600 font-semibold mb-1 flex items-center gap-1.5">
          <Gavel className="w-3 h-3" />
          AI Recommendation
        </p>
        <p className="text-xs text-gray-700 leading-relaxed">
          {explanation.recommendation}
        </p>
      </div>

      {/* Footer note */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2">
        <AlertTriangle className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-gray-500 leading-relaxed">
          {verdictFooter(severity, conf)}
        </p>
      </div>
    </div>
  );
}
