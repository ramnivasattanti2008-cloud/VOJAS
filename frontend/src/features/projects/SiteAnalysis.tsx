/**
 * SiteAnalysis — Phase 53
 *
 * Shows a before/after satellite comparison for a project using real Sentinel-2
 * observations from the CDSE STAC catalog. Each capture is a real Sentinel-2 L2A
 * acquisition with real dates, cloud cover, and NDVI/NDBI analysis.
 *
 * When no satellite data is available (project not yet ingested or CDSE not configured),
 * shows a clear "No satellite data available" empty state with instructions rather than
 * fake or demo data.
 *
 * Props: `location` — must include latitude + longitude.
 */

import { useState } from "react";
import {
  Layers,
  Activity,
  Droplet,
  TreePine,
  Building2,
  RefreshCw,
  Calendar,
  Mountain,
  Satellite,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSatelliteCaptures } from "@/hooks/useSatellite";
import type { SatelliteCapture } from "@/types/satellite-types";
import { cn } from "@/lib/utils";

interface SiteAnalysisProps {
  /** Project ID — used to fetch real Sentinel-2 observations */
  projectId: string;
  location: { latitude: number; longitude: number; label?: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(score: number): string {
  if (score < 5)  return "No Activity";
  if (score < 20) return "Site Cleared";
  if (score < 45) return "Foundation";
  if (score < 75) return "Structure";
  if (score < 95) return "Near Complete";
  return "Completed";
}

function statusColor(score: number): string {
  if (score < 5)  return "text-slate-400";
  if (score < 20) return "text-yellow-500";
  if (score < 45) return "text-orange-500";
  if (score < 75) return "text-blue-500";
  if (score < 95) return "text-emerald-400";
  return "text-green-500";
}

function netDirection(delta: number): "GAIN" | "LOSS" | "STABLE" {
  if (delta > 2) return "GAIN";
  if (delta < -2) return "LOSS";
  return "STABLE";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({
  value,
  label,
  color,
  unit = "",
}: {
  value: number;
  label: string;
  color: string;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-semibold">
          {value}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function NoDataState({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
        <Satellite className="w-6 h-6 text-slate-500" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-white mb-1">
          No Satellite Observations Available
        </h4>
        <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
          No Sentinel-2 observations have been ingested for this location (
          {lat.toFixed(4)}°, {lng.toFixed(4)}°). This may be because:
        </p>
      </div>
      <ul className="text-[11px] text-slate-500 text-left space-y-1 max-w-xs">
        <li className="flex items-start gap-2">
          <span className="text-amber-400/60 mt-0.5">•</span>
          CDSE credentials are not configured (SATELLITE_STUB_MODE=true)
        </li>
        <li className="flex items-start gap-2">
          <span className="text-amber-400/60 mt-0.5">•</span>
          The project was not yet ingested via the pilot seeder script
        </li>
        <li className="flex items-start gap-2">
          <span className="text-amber-400/60 mt-0.5">•</span>
          The site has persistent cloud cover exceeding the 60% threshold
        </li>
      </ul>
      <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-slate-800/40 rounded-lg px-3 py-2.5 border border-slate-700/30 max-w-xs text-left">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
        <span>
          To populate: set CDSE_CLIENT_ID + CDSE_CLIENT_SECRET in .env, then run{" "}
          <code className="text-slate-400 font-mono">
            npx tsx scripts/ingest/pilotProjects.ts
          </code>
        </span>
      </div>
    </div>
  );
}

// ── Before/After comparison ─────────────────────────────────────────────────────

function BeforeAfterPanel({
  captures,
  loading,
  onRefresh,
}: {
  captures: SatelliteCapture[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (captures.length < 2) {
    return (
      <div className="text-center py-8 text-[11px] text-slate-500">
        {loading ? "Loading…" : `${captures.length} observation${captures.length !== 1 ? "s" : ""} available — need at least 2 for before/after comparison`}
      </div>
    );
  }

  const before = captures[0]; // earliest
  const after = captures[captures.length - 1]; // latest

  return (
    <>
      {/* Before/After header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
          Before / After Comparison
        </h4>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Before */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" /> Before
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {fmtDate(before.date)}
            </span>
          </div>
          <div className="rounded-lg overflow-hidden border border-white/10 aspect-[3/2] relative">
            {before.imageUrl ? (
              <img
                src={before.imageUrl}
                alt={`Satellite view — ${fmtDate(before.date)}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <span className="text-[10px] text-slate-500">No tile</span>
              </div>
            )}
            {before.cloudCover > 0 && (
              <div className="absolute top-1.5 right-1.5 bg-black/60 text-[9px] text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>☁</span> {before.cloudCover}%
              </div>
            )}
          </div>
          <div className="text-[9px] text-slate-600">
            <span className={cn(statusColor(before.analysis.developmentScore))}>
              {statusLabel(before.analysis.developmentScore)}
            </span>{" "}
            · Score {before.analysis.developmentScore}
          </div>
        </div>

        {/* After */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" /> After
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {fmtDate(after.date)}
            </span>
          </div>
          <div className="rounded-lg overflow-hidden border border-white/10 aspect-[3/2] relative">
            {after.imageUrl ? (
              <img
                src={after.imageUrl}
                alt={`Satellite view — ${fmtDate(after.date)}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <span className="text-[10px] text-slate-500">No tile</span>
              </div>
            )}
            {after.cloudCover > 0 && (
              <div className="absolute top-1.5 right-1.5 bg-black/60 text-[9px] text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>☁</span> {after.cloudCover}%
              </div>
            )}
          </div>
          <div className="text-[9px] text-slate-600">
            <span className={cn(statusColor(after.analysis.developmentScore))}>
              {statusLabel(after.analysis.developmentScore)}
            </span>{" "}
            · Score {after.analysis.developmentScore}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Analysis metrics ───────────────────────────────────────────────────────────

function AnalysisMetrics({ captures }: { captures: SatelliteCapture[] }) {
  if (!captures.length) return null;
  const latest = captures[captures.length - 1];
  const a = latest.analysis;
  const dir = netDirection(a.changeFromPrevious);

  return (
    <>
      {/* Development scores */}
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Development Analysis
          </h4>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            {latest.provider === "CDSE" ? (
              <span className="text-blue-400">Sentinel-2 L2A</span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
            · {fmtDate(latest.date)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ScoreBar value={a.developmentScore} label="Development Score" color="#22c55e" unit="%" />
          <ScoreBar value={a.vegetationCover}  label="Vegetation Cover" color="#10b981" unit="%" />
          <ScoreBar
            value={Math.round((a.builtUpArea / 1000) * 10) / 10}
            label="Built-up Area"
            color="#94a3b8"
            unit="K m²"
          />
          <ScoreBar
            value={Math.abs(a.changeFromPrevious)}
            label={`Change ${dir === "GAIN" ? "↑" : dir === "LOSS" ? "↓" : "→"}`}
            color={dir === "GAIN" ? "#10b981" : dir === "LOSS" ? "#ef4444" : "#64748b"}
            unit="%"
          />
        </div>

        <div className="border-t border-white/5 pt-3 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Construction status</span>
            <span className={cn(statusColor(a.developmentScore), "font-semibold")}>
              {statusLabel(a.developmentScore)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Built-up area</span>
            <span className="text-slate-300 font-mono">
              {(a.builtUpArea / 1000).toFixed(1)}K m²
            </span>
          </div>
          {a.vegetationCover > 0 && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Vegetation</span>
              <span className="text-green-400 font-mono">{a.vegetationCover}%</span>
            </div>
          )}
        </div>

        {/* Change direction badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border",
              dir === "GAIN"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : dir === "LOSS"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
            )}
          >
            <Activity className="w-3 h-3" />
            Net: {dir}
          </span>
          <span className="text-[10px] text-slate-600">
            {captures.length} observation{captures.length !== 1 ? "s" : ""} · Sentinel-2 L2A
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 px-1">
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3" /> Built-up
        </span>
        <span className="flex items-center gap-1">
          <TreePine className="w-3 h-3" /> Vegetation
        </span>
        <span className="flex items-center gap-1">
          <Droplet className="w-3 h-3" /> Water
        </span>
        <span className="flex items-center gap-1">
          <Mountain className="w-3 h-3" /> Bare soil
        </span>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SiteAnalysis({ projectId, location }: SiteAnalysisProps) {
  const { latitude, longitude, label } = location;

  const capturesQuery = useSatelliteCaptures(projectId, {
    from: undefined,
    to: undefined,
  });

  const [refreshing, setRefreshing] = useState(false);

  const captures = capturesQuery.data?.captures ?? [];
  const loading = capturesQuery.isLoading || refreshing;

  // In Phase D full implementation, SiteAnalysis receives projectId as a prop
  // so it can call useSatelliteCaptures(projectId). For now, show the empty state.
  const hasData = captures.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-electric-400" />
            {label ?? "Site Analysis"} — Satellite Observation Analysis
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
            {hasData && (
              <span className="ml-2 text-blue-400">
                · {captures.length} observation{captures.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* No data state */}
      {!hasData && !loading && (
        <NoDataState lat={latitude} lng={longitude} />
      )}

      {/* Before/After */}
      {hasData && (
        <div className="glass rounded-xl p-4 space-y-4">
          <BeforeAfterPanel
            captures={captures}
            loading={loading}
            onRefresh={() => {
              setRefreshing(true);
              capturesQuery.refetch().finally(() => setRefreshing(false));
            }}
          />
        </div>
      )}

      {/* Analysis metrics */}
      {hasData && captures.length >= 1 && (
        <AnalysisMetrics captures={captures} />
      )}

      {/* Provenance note */}
      {hasData && (
        <div className="text-[10px] text-slate-600 flex items-start gap-1.5 px-1">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          Data source: Copernicus Data Space Ecosystem (CDSE) Sentinel-2 L2A.
          Tiles from {captures[0]?.provider === "CDSE" ? "CDSE WMS service" : "fallback XYZ"}.
          NDVI/NDBI computed by VOJAS geospatial service.
          Acquisition dates are real Sentinel-2 overpass dates — no synthetic data.
        </div>
      )}
    </div>
  );
}
