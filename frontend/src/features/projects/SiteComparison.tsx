import { useCallback, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface SiteComparisonProps {
  location: { latitude: number; longitude: number; label?: string };
}

const IMG_WIDTH = 800;
const IMG_HEIGHT = 450;

function buildExportUrl(
  lat: number,
  lng: number,
  sizeW: number,
  sizeH: number,
  /** Approximate decimal degrees for the width of the bbox */
  bboxDegW: number,
  /** Approximate decimal degrees for the height of the bbox */
  bboxDegH: number
): string {
  const minY = (lat - bboxDegH / 2).toFixed(6);
  const minX = (lng - bboxDegW / 2).toFixed(6);
  const maxY = (lat + bboxDegH / 2).toFixed(6);
  const maxX = (lng + bboxDegW / 2).toFixed(6);
  return (
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${minX},${minY},${maxX},${maxY}` +
    `&bboxSR=4326&imageSR=4326` +
    `&size=${sizeW},${sizeH}` +
    `&format=jpg` +
    `&f=image`
  );
}

/** Approximate degree offsets for ~1 km at India's latitude (22° N) */
const BBOX_WIDE = 0.015;  // ~1.5 km wide  (context view)
const BBOX_TIGHT = 0.003;  // ~330 m wide   (detail view)

export default function SiteComparison({ location }: SiteComparisonProps) {
  const { latitude, longitude, label } = location;
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

  // "Before" — wider context view (1.5 km)
  const beforeUrl = buildExportUrl(latitude, longitude, IMG_WIDTH, IMG_HEIGHT, BBOX_WIDE, BBOX_WIDE);
  // "After" — tighter detail view (330 m)
  const afterUrl = buildExportUrl(latitude, longitude, IMG_WIDTH, IMG_HEIGHT, BBOX_TIGHT, BBOX_TIGHT);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-electric-400" />
            {label ?? "Site Comparison"}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-electric-500" />
            Detail View
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-saffron-500" />
            Context View
          </span>
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
        aria-label="Site comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(splitPct)}
        aria-valuetext={`Detail view ${Math.round(splitPct)} percent, context view ${Math.round(100 - splitPct)} percent`}
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
        {/* ── Base layer (full-width context / "before") ── */}
        <div className="absolute inset-0">
          <img
            src={beforeUrl}
            alt="Context view"
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute bottom-2 left-2 z-10 glass rounded-md px-2 py-1">
            <span className="text-[10px] text-slate-300 font-medium">Context</span>
            <span className="text-[10px] text-slate-500 ml-1">~1.5 km area</span>
          </div>
        </div>

        {/* ── Clip layer (left portion = "after" / detail) ── */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
        >
          <img
            src={afterUrl}
            alt="Detail view"
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute bottom-2 left-2 z-10 glass rounded-md px-2 py-1">
            <span className="text-[10px] text-electric-300 font-medium">Detail</span>
            <span className="text-[10px] text-slate-500 ml-1">~330 m area</span>
          </div>
        </div>

        {/* ── Drag handle ── */}
        <div
          className="absolute top-0 bottom-0 z-10 flex flex-col items-center"
          style={{ left: `${splitPct}%`, transform: "translateX(-50%)" }}
        >
          {/* Vertical line */}
          <div className="w-px h-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />

          {/* Thumb */}
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
              Detail
            </span>
          </div>
        )}
        {splitPct < 90 && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-saffron-500/70 text-white font-semibold uppercase tracking-wider backdrop-blur-sm">
              Context
            </span>
          </div>
        )}
      </div>

      {/* Instruction hint */}
      <p className="text-[11px] text-slate-600 text-center">
        Drag the handle to compare detail and context views of the site
      </p>
    </div>
  );
}
