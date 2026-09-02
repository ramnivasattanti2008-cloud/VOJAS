/**
 * SiteComparison — Phase 53
 *
 * Before/After swipe comparison using real Sentinel-2 L2A acquisitions.
 * The "before" is the earliest observation; "after" is the most recent.
 * Each side shows the actual satellite tile from CDSE WMS.
 *
 * When no data is available, shows an empty state with instructions.
 *
 * Props: `projectId` + `location`.
 */

import { useCallback, useRef, useState } from "react";
import { MapPin, Satellite } from "lucide-react";
import { useSatelliteCaptures } from "@/hooks/useSatellite";
import type { SatelliteCapture } from "@/types/satellite-types";

interface SiteComparisonProps {
  projectId: string;
  location: { latitude: number; longitude: number; label?: string };
}

const IMG_HEIGHT = 450;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function NoComparisonState({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 overflow-hidden" style={{ height: IMG_HEIGHT }}>
      <div className="flex flex-col items-center gap-3 py-8 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
          <Satellite className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">
            No Sentinel-2 Observations
          </h4>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Satellite imagery has not been ingested for this project location (
            {lat.toFixed(4)}°, {lng.toFixed(4)}°). No before/after comparison
            is possible without real observations.
          </p>
        </div>
        <p className="text-[10px] text-slate-600">
          Run <code className="text-slate-400 font-mono">npx tsx scripts/ingest/pilotProjects.ts</code>{" "}
          to populate observations.
        </p>
      </div>
    </div>
  );
}

function SwipeComparison({
  before,
  after,
  loading,
}: {
  before: SatelliteCapture;
  after: SatelliteCapture;
  loading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const isDragging = useRef(false);

  const updateSplit = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      updateSplit(e.clientX);
    },
    [updateSplit]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      updateSplit(e.clientX);
    },
    [updateSplit]
  );

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      isDragging.current = true;
      updateSplit(e.touches[0].clientX);
    },
    [updateSplit]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      updateSplit(e.touches[0].clientX);
    },
    [updateSplit]
  );

  const renderImage = (
    capture: SatelliteCapture,
    label: string,
    sublabel: string,
    badge: string
  ) => (
    <div className="absolute inset-0">
      {capture.imageUrl ? (
        <img
          src={capture.imageUrl}
          alt={label}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          <span className="text-[11px] text-slate-500">No tile available</span>
        </div>
      )}
      {capture.cloudCover > 0 && (
        <div className="absolute top-2 right-2 bg-black/60 text-[10px] text-slate-300 px-2 py-0.5 rounded-full">
          ☁ {capture.cloudCover}%
        </div>
      )}
      <div className="absolute bottom-2 left-2 z-10 glass rounded-md px-2 py-1">
        <span className="text-[10px] text-slate-300 font-medium">{badge}</span>
        <span className="text-[10px] text-slate-500 ml-1">{sublabel}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-electric-400" />
            Before / After Comparison
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {fmtDate(before.date)} → {fmtDate(after.date)}
            {before.date === after.date && " (same date — need multiple acquisitions)"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-electric-500" />
            Before ({fmtDate(before.date)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-saffron-500" />
            After ({fmtDate(after.date)})
          </span>
          {loading && <span className="text-blue-400 ml-1">refreshing…</span>}
        </div>
      </div>

      {/* Comparison widget */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden select-none border border-white/10 cursor-col-resize"
        style={{ height: IMG_HEIGHT }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
        role="slider"
        aria-label="Before/After comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(splitPct)}
        aria-valuetext={`Before view ${Math.round(splitPct)} percent, after view ${Math.round(100 - splitPct)} percent`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setSplitPct((p) => Math.max(0, p - 5));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setSplitPct((p) => Math.min(100, p + 5));
          }
        }}
      >
        {/* ── "After" layer (full-width base) ── */}
        {renderImage(
          after,
          "After view",
          "most recent acquisition",
          "After"
        )}

        {/* ── "Before" clip layer (left portion) ── */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
        >
          {renderImage(
            before,
            "Before view",
            "earliest acquisition",
            "Before"
          )}
        </div>

        {/* ── Drag handle ── */}
        <div
          className="absolute top-0 bottom-0 z-10 flex flex-col items-center"
          style={{ left: `${splitPct}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-px h-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L1 7L5 11" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 3L13 7L9 11" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Labels ── */}
        {splitPct > 10 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-electric-500/70 text-white font-semibold uppercase tracking-wider backdrop-blur-sm">
              Before
            </span>
          </div>
        )}
        {splitPct < 90 && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-saffron-500/70 text-white font-semibold uppercase tracking-wider backdrop-blur-sm">
              After
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <p className="text-[11px] text-slate-600 text-center">
        Drag the handle to compare the earliest and most recent Sentinel-2 observations.
        Dates are real acquisition dates — no synthetic data.
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SiteComparison({ projectId, location }: SiteComparisonProps) {
  const { latitude, longitude, label } = location;

  const capturesQuery = useSatelliteCaptures(projectId, {
    from: undefined,
    to: undefined,
  });

  const captures = capturesQuery.data?.captures ?? [];
  const loading = capturesQuery.isLoading;

  if (!captures.length && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-electric-400" />
              {label ?? "Site Comparison"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          </div>
        </div>
        <NoComparisonState lat={latitude} lng={longitude} />
      </div>
    );
  }

  if (captures.length === 1) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-electric-400" />
              {label ?? "Site Comparison"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          </div>
        </div>
        <div
          className="relative rounded-xl overflow-hidden border border-white/10"
          style={{ height: IMG_HEIGHT }}
        >
          {captures[0].imageUrl ? (
            <img
              src={captures[0].imageUrl}
              alt={`Satellite view — ${fmtDate(captures[0].date)}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <span className="text-[11px] text-slate-500">No tile available</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 z-10 glass rounded-md px-2 py-1">
            <span className="text-[10px] text-slate-300 font-medium">Sentinel-2 L2A</span>
            <span className="text-[10px] text-slate-500 ml-1">{fmtDate(captures[0].date)}</span>
          </div>
          {captures[0].cloudCover > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 text-[10px] text-slate-300 px-2 py-0.5 rounded-full">
              ☁ {captures[0].cloudCover}%
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-600 text-center">
          Only 1 observation available — need at least 2 for a before/after comparison.
        </p>
      </div>
    );
  }

  // 2+ captures: show full before/after
  const before = captures[0]; // earliest
  const after = captures[captures.length - 1]; // latest

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-electric-400" />
            {label ?? "Site Comparison"}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
            <span className="ml-2 text-blue-400">
              · {captures.length} observation{captures.length !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>
      <SwipeComparison
        before={before}
        after={after}
        loading={loading}
      />
    </div>
  );
}
