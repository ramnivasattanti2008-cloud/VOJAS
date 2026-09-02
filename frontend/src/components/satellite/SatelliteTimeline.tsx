/**
 * SatelliteTimeline — Real Sentinel-2 observations with development analysis
 *
 * Shows actual Sentinel-2 L2A acquisitions (with real dates, not synthetic weekly
 * captures) for the project's location, including development scores, built-up area,
 * vegetation cover, and overpass-to-overpass change.
 *
 * Acquisitions come from CDSE STAC catalog via the geospatial service. The interval
 * between observations depends on Sentinel-2's actual 5-day revisit cycle and
 * cloud cover — typically 5–30 days, not exactly 7.
 */

import { useState } from "react";
import {
  Satellite,
  TrendingUp,
  TrendingDown,
  Minus,
  Cloud,
  Trees,
  Home,
  Calendar,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSatelliteCaptures, useSatelliteAnalysis } from "@/hooks/useSatellite";
import type {
  SatelliteCapture,
  SatelliteAssessment,
  TimelineInsight,
  SatelliteAnomaly,
} from "@/types/satellite-types";
import { ANOMALY_COLORS } from "@/types/satellite-types";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/ui";

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score, label }: { score: number; label?: string }) {
  const color =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-blue-500" :
    score >= 40 ? "bg-yellow-500" :
    score >= 20 ? "bg-orange-500" :
    "bg-red-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label && <span>{label}</span>}
        <span className="font-semibold text-foreground">{score}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ChangeIndicator({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) {
    return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={10} />0</span>;
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 text-xs font-medium">
        <TrendingUp size={10} />+{delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400 text-xs font-medium">
      <TrendingDown size={10} />{delta}
    </span>
  );
}

function StatusBadge({ label }: { label: SatelliteCapture["analysis"]["statusLabel"] }) {
  const colors: Record<typeof label, string> = {
    "No Activity": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    "Site Cleared": "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Foundation": "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "Structure": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Near Complete": "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Completed": "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", colors[label])}>
      {label}
    </span>
  );
}

interface CaptureCardProps {
  capture: SatelliteCapture;
  isSelected: boolean;
  onClick: () => void;
}

function CaptureCard({ capture, isSelected, onClick }: CaptureCardProps) {
  const { analysis, date, cloudCover } = capture;
  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex-shrink-0 w-44 rounded-xl border overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        isSelected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border hover:border-primary/40"
      )}
      onClick={onClick}
    >
      {/* Satellite image */}
      <div className="relative h-28 bg-muted overflow-hidden">
        <img
          src={capture.imageUrl}
          alt={`Satellite capture ${formattedDate}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Cloud cover badge */}
        {cloudCover > 20 && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
            <Cloud size={8} />{cloudCover}%
          </div>
        )}
        {/* Week label */}
        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Calendar size={8} />
          {formattedDate}
        </div>
      </div>

      {/* Analysis data */}
      <div className="p-2 space-y-1.5">
        <ScoreBar score={analysis.developmentScore} />

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Home size={8} className="text-blue-500" />
            {analysis.builtUpArea.toLocaleString()}m²
          </span>
          <span className="flex items-center gap-0.5">
            <Trees size={8} className="text-green-500" />
            {analysis.vegetationCover}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge label={analysis.statusLabel} />
          <ChangeIndicator delta={analysis.changeFromPrevious} />
        </div>
      </div>
    </motion.div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: SatelliteAnomaly }) {
  return (
    <div className={cn(
      "flex items-start gap-2 p-2.5 rounded-lg border text-xs",
      ANOMALY_COLORS[anomaly.severity]
    )}>
      <AlertBadge severity={anomaly.severity} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold mb-0.5">{anomaly.type.replace(/_/g, " ")}</div>
        <div className="opacity-80 leading-relaxed">{anomaly.description}</div>
      </div>
    </div>
  );
}

function AlertBadge({ severity }: { severity: SatelliteAnomaly["severity"] }) {
  const icons: Record<typeof severity, string> = {
    LOW: "🔵",
    MEDIUM: "🟡",
    HIGH: "🟠",
    CRITICAL: "🔴",
  };
  return <span className="text-base flex-shrink-0">{icons[severity]}</span>;
}

function QuarterlyInsight({ insight }: { insight: TimelineInsight }) {
  const deltaColor = insight.delta > 0
    ? "text-green-600 dark:text-green-400"
    : insight.delta < 0
    ? "text-red-500 dark:text-red-400"
    : "text-muted-foreground";
  return (
    <div className="bg-card border rounded-lg p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{insight.period}</span>
        <span className={cn("text-xs font-bold", deltaColor)}>
          {insight.delta > 0 ? "+" : ""}{insight.delta} pts
        </span>
      </div>
      <ScoreBar score={insight.developmentScore} />
      <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.insights}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SatelliteTimelineProps {
  projectId: string;
  compact?: boolean; // show as compact strip vs full view
}

type ViewMode = "timeline" | "analysis" | "anomalies";

export default function SatelliteTimeline({ projectId, compact = false }: SatelliteTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  const capturesQuery = useSatelliteCaptures(projectId);
  const analysisMutation = useSatelliteAnalysis(projectId);
  const [analysis, setAnalysis] = useState<SatelliteAssessment | null>(null);

  const captures: SatelliteCapture[] = capturesQuery.data?.captures ?? [];
  const selected = captures.find((c) => c.id === selectedId) ?? captures[0] ?? null;

  const runAnalysis = () => {
    analysisMutation.mutate(undefined, {
      onSuccess: (data: { assessment: SatelliteAssessment }) => setAnalysis(data.assessment),
    });
  };

  const stats = analysis?.statistics;

  if (capturesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading satellite data…</span>
        </div>
      </div>
    );
  }

  if (capturesQuery.isError) {
    return (
      <ErrorState
        title="Satellite data unavailable"
        message="Could not load satellite captures for this project."
        onRetry={() => capturesQuery.refetch()}
      />
    );
  }

  if (!captures.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <Satellite size={32} className="opacity-30" />
        <p className="text-sm">No satellite data available for this project.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {captures.slice(-8).map((c) => (
          <CaptureCard
            key={c.id}
            capture={c}
            isSelected={c.id === selectedId}
            onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Satellite size={18} className="text-primary" />
          <span className="text-sm font-semibold">
            {captures.length} Sentinel-2 Observation{captures.length !== 1 ? "s" : ""}
          </span>
          {stats && (
            <span className="text-xs text-muted-foreground">
              · Score {stats.averageDevelopmentRate > 0 ? "+" : ""}{stats.averageDevelopmentRate} pts/wk
              · {stats.constructionActive ? "🟢 Active" : "⚪ Dormant"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(["timeline", "analysis", "anomalies"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md capitalize transition-colors",
                viewMode === mode
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {mode}
            </button>
          ))}
          <button
            onClick={runAnalysis}
            disabled={analysisMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 transition-colors disabled:opacity-50 ml-2"
          >
            <Zap size={12} />
            {analysisMutation.isPending ? "Analyzing…" : "AI Analysis"}
          </button>
        </div>
      </div>

      {/* Timeline view — horizontal scrollable strip */}
      {viewMode === "timeline" && (
        <div className="space-y-3">
          {/* Capture strip */}
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-2 pr-6 scrollbar-thin">
              {captures.map((c) => (
                <CaptureCard
                  key={c.id}
                  capture={c}
                  isSelected={c.id === selected?.id}
                  onClick={() => setSelectedId(c.id === selected?.id ? null : c.id)}
                />
              ))}
            </div>
          </div>

          {/* Selected capture detail */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <CaptureDetailPanel capture={selected} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mini chart timeline */}
          <MiniTimelineChart captures={captures} />
        </div>
      )}

      {/* Analysis view */}
      {viewMode === "analysis" && (
        <div className="space-y-4">
          {analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Zap size={32} className="opacity-30" />
              <p className="text-sm">Click "AI Analysis" to generate a full satellite assessment.</p>
            </div>
          )}
        </div>
      )}

      {/* Anomalies view */}
      {viewMode === "anomalies" && (
        <div className="space-y-3">
          {analysis?.anomalies.length ? (
            analysis.anomalies.map((a, i) => <AnomalyCard key={i} anomaly={a} />)
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <span className="text-2xl">✅</span>
              <p className="text-sm">No anomalies detected in the monitoring period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function CaptureDetailPanel({ capture }: { capture: SatelliteCapture }) {
  const { analysis, date, cloudCover, provider, lat, lng } = capture;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-card border rounded-xl">
      {/* Left — larger image */}
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden h-48 bg-muted">
          <img
            src={capture.imageUrl}
            alt={`Full capture ${date}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Cloud size={10} />{cloudCover}% clouds</span>
          <span>Provider: {provider}</span>
          <span>Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
        </div>
      </div>

      {/* Right — analysis data */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Development Analysis</h4>
        <ScoreBar score={analysis.developmentScore} label="Overall Score" />
        <ScoreBar score={analysis.vegetationCover} label="Vegetation Cover" />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-muted-foreground mb-0.5">Built-up Area</div>
            <div className="font-semibold">{analysis.builtUpArea.toLocaleString()} m²</div>
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-muted-foreground mb-0.5">Weekly Change</div>
            <div className="font-semibold flex items-center gap-1">
              <ChangeIndicator delta={analysis.changeFromPrevious} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge label={analysis.statusLabel} />
          {analysis.constructionDetected && (
            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <Home size={10} />Construction visible
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This week of satellite imagery shows the project at <strong>{analysis.developmentScore}%</strong> development
          with <strong>{analysis.builtUpArea.toLocaleString()}m²</strong> of built-up area detected.
          Vegetation coverage stands at <strong>{analysis.vegetationCover}%</strong>.
          {analysis.changeFromPrevious > 0 ? ` +${analysis.changeFromPrevious} points` : analysis.changeFromPrevious < 0 ? ` ${analysis.changeFromPrevious} points` : " No change"} from the previous week.
        </p>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: SatelliteAssessment }) {
  const { statistics, progressSummary, keyObservations, nextSteps, timelineAnalysis, overallScore } = analysis;
  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Overall Score", value: `${overallScore}%`, color: overallScore >= 60 ? "text-green-500" : "text-yellow-500" },
          { label: "Weeks Monitored", value: statistics.totalCaptures.toString(), color: "text-blue-500" },
          { label: "Avg / Week", value: `${statistics.averageDevelopmentRate} pts`, color: "text-purple-500" },
          { label: "Confidence", value: `${Math.round(analysis.confidence * 100)}%`, color: "text-cyan-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border rounded-lg p-3 text-center space-y-1">
            <div className={cn("text-xl font-bold", color)}>{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">AI Assessment Summary</h4>
        <p className="text-sm leading-relaxed">{progressSummary}</p>
      </div>

      {/* Key observations */}
      {keyObservations.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key Observations</h4>
          <ul className="space-y-1">
            {keyObservations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quarterly timeline */}
      {timelineAnalysis.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quarterly Progression</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {timelineAnalysis.map((ins) => <QuarterlyInsight key={ins.period} insight={ins} />)}
          </div>
        </div>
      )}

      {/* Next steps */}
      {nextSteps.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended Next Steps</h4>
          <ol className="space-y-1">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Mini timeline chart ───────────────────────────────────────────────────────

function MiniTimelineChart({ captures }: { captures: SatelliteCapture[] }) {
  const W = 800;
  const H = 60;
  const PAD = 4;

  const scores = captures.map((c) => c.analysis.developmentScore);
  const max = 100;
  const min = 0;
  const xScale = (i: number) => PAD + (i / Math.max(1, scores.length - 1)) * (W - PAD * 2);
  const yScale = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);

  const pathD = scores
    .map((s, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(s)}`)
    .join(" ");

  const areaD = `${pathD} L${xScale(scores.length - 1)},${H - PAD} L${PAD},${H - PAD} Z`;

  return (
    <div className="bg-card border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">Development Timeline</span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />Score
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />Vegetation
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12 overflow-visible">
        {/* Area fill */}
        <path d={areaD} fill="url(#scoreGrad)" opacity="0.3" />
        {/* Score line */}
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Vegetation line */}
        {captures.map((c, i) => {
          if (i === 0) return null;
          const prev = captures[i - 1];
          if (!prev) return null;
          return (
            <line
              key={i}
              x1={xScale(i - 1)} y1={yScale(prev.analysis.vegetationCover)}
              x2={xScale(i)} y2={yScale(c.analysis.vegetationCover)}
              stroke="#4ade80" strokeWidth="1" opacity="0.5"
            />
          );
        })}
        {/* Gradient def */}
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
