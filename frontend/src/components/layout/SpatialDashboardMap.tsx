/**
 * SpatialDashboardMap — 3D-perspective intelligence map for the Command Center.
 *
 * Renders a stylized SVG India map with:
 *   - Project density heat zones (color intensity by cluster)
 *   - Interactive project markers with hover tooltips
 *   - CSS 3D perspective tilt (keeps the map flat-UI-friendly)
 *   - Ambient glow pulses on high-risk markers
 *   - State-level data overlay via opacity layers
 *
 * Uses the existing /api/locations/map/overview endpoint data.
 * Zero new dependencies — pure SVG + CSS transforms + Framer Motion.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import type { MapOverview, MapMarker, ProjectStatus } from "@/types";
import { CheckCircle2 } from "lucide-react";

// ── Status → color ─────────────────────────────────────────────────────────────

const STATUS_HEX: Record<ProjectStatus, string> = {
  PROPOSED:    "#94a3b8",
  APPROVED:    "#60a5fa",
  IN_PROGRESS: "#f59e0b",
  COMPLETED:   "#22c55e",
  VERIFIED:    "#10b981",
  CANCELLED:   "#ef4444",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PROPOSED:    "Proposed",
  APPROVED:    "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
  VERIFIED:    "Verified",
  CANCELLED:   "Cancelled",
};

// ── India bounding box for normalisation ────────────────────────────────────────
// India approx: lat [6, 36], lon [68, 98]
// SVG viewBox: 0 0 600 660

function normalise(lat: number, lng: number): [number, number] {
  const x = ((lng - 68) / 30) * 600;
  const y = ((36 - lat) / 30) * 660;
  return [x, y];
}

// ── Project density zones (computed from markers) ────────────────────────────────

interface DensityZone {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  count: number;
}

function computeZones(markers: MapMarker[], gridX = 6, gridY = 6): DensityZone[] {
  const cellW = 600 / gridX;
  const cellH = 660 / gridY;
  const cells: Map<string, MapMarker[]> = new Map();

  for (const m of markers) {
    const [x, y] = normalise(m.latitude, m.longitude);
    const gx = Math.floor(x / cellW);
    const gy = Math.floor(y / cellH);
    const key = `${gx},${gy}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(m);
  }

  return Array.from(cells.entries()).map(([key, ms]) => {
    const [gx, gy] = key.split(",").map(Number);
    const cx = (gx + 0.5) * cellW;
    const cy = (gy + 0.5) * cellH;
    const count = ms.length;
    const r = Math.min(80, 20 + count * 8);
    const opacity = Math.min(0.18, 0.04 + count * 0.02);
    return { cx, cy, r, opacity, count };
  });
}

// ── Single marker dot ───────────────────────────────────────────────────────────

function MarkerDot({
  marker,
  onHover,
  onLeave,
}: {
  marker: MapMarker;
  onHover: (m: MapMarker | null) => void;
  onLeave: () => void;
}) {
  const [x, y] = normalise(marker.latitude, marker.longitude);
  const color = STATUS_HEX[marker.project.status];
  const isHighRisk = marker.project.status === "IN_PROGRESS" || marker.project.status === "CANCELLED";

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(marker)}
      onMouseLeave={onLeave}
    >
      {/* Ambient pulse ring for high-risk / in-progress */}
      {isHighRisk && (
        <motion.circle
          cx={x}
          cy={y}
          r={14}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.4}
          animate={{ r: [10, 20], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Core dot */}
      <motion.circle
        cx={x}
        cy={y}
        r={5}
        fill={color}
        fillOpacity={0.85}
        stroke={marker.verified ? "#10b981" : color}
        strokeWidth={marker.verified ? 2 : 1}
        strokeOpacity={0.8}
        animate={{ r: [5, 5.8, 5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Glow on hover handled by parent group */}
    </g>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────────────

function MarkerTooltip({ marker }: { marker: MapMarker }) {
  const [x, y] = normalise(marker.latitude, marker.longitude);
  const color = STATUS_HEX[marker.project.status];

  // Clamp so tooltip stays in view
  const tx = x > 480 ? x - 160 : x + 16;
  const ty = y > 580 ? y - 110 : y + 16;

  return (
    <g>
      {/* Invisible wider hitbox */}
      <rect
        x={x - 20}
        y={y - 20}
        width={40}
        height={40}
        fill="transparent"
      />
      <foreignObject x={tx} y={ty} width={155} height={110} style={{ overflow: "visible" }}>
        <div
          className="pointer-events-none"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          <div
            style={{
              background: "rgba(17,25,43,0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.625rem",
              padding: "0.625rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              width: "155px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {STATUS_LABEL[marker.project.status]}
              </span>
              {marker.verified && (
                <CheckCircle2
                  style={{ width: "10px", height: "10px", color: "#10b981", marginLeft: "auto" }}
                />
              )}
            </div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#f1f5f9",
                lineHeight: 1.3,
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
              }}
            >
              {marker.project.name}
            </p>
            <p style={{ fontSize: "9px", color: "#64748b", marginTop: "0.25rem" }}>
              {marker.project.district}, {marker.project.state}
            </p>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

// ── State labels ────────────────────────────────────────────────────────────────

const STATE_LABELS: { label: string; x: number; y: number; opacity?: number }[] = [
  { label: "Jammu & Kashmir",  x: 135, y: 80,  opacity: 0.25 },
  { label: "Himachal Pradesh", x: 185, y: 120, opacity: 0.25 },
  { label: "Punjab",          x: 200, y: 155, opacity: 0.3  },
  { label: "Uttarakhand",     x: 240, y: 165, opacity: 0.25 },
  { label: "Haryana",         x: 225, y: 195, opacity: 0.25 },
  { label: "Delhi",           x: 245, y: 210, opacity: 0.35 },
  { label: "Uttar Pradesh",   x: 310, y: 210, opacity: 0.25 },
  { label: "Bihar",           x: 380, y: 240, opacity: 0.25 },
  { label: "West Bengal",     x: 415, y: 280, opacity: 0.25 },
  { label: "Odisha",          x: 420, y: 330, opacity: 0.25 },
  { label: "Chhattisgarh",    x: 385, y: 320, opacity: 0.25 },
  { label: "Madhya Pradesh",  x: 310, y: 300, opacity: 0.25 },
  { label: "Gujarat",         x: 225, y: 310, opacity: 0.3  },
  { label: "Maharashtra",      x: 280, y: 380, opacity: 0.3  },
  { label: "Rajasthan",       x: 220, y: 255, opacity: 0.25 },
  { label: "Andhra Pradesh",  x: 370, y: 410, opacity: 0.25 },
  { label: "Karnataka",       x: 300, y: 440, opacity: 0.3  },
  { label: "Tamil Nadu",      x: 365, y: 500, opacity: 0.3  },
  { label: "Kerala",          x: 310, y: 510, opacity: 0.3  },
  { label: "Telangana",       x: 350, y: 400, opacity: 0.25 },
];

// ── SVG India outline (simplified, stylized) ───────────────────────────────────

// A reasonably detailed India SVG path (simplified for performance)
const INDIA_PATH = `
  M 135 30 L 150 45 L 155 70 L 160 100 L 165 130
  L 185 160 L 200 175 L 220 185 L 235 200
  L 245 210 L 265 220 L 285 225 L 305 230
  L 330 225 L 355 220 L 375 215 L 395 220
  L 420 225 L 440 235 L 455 250 L 465 270
  L 470 295 L 475 320 L 470 345 L 460 370
  L 450 395 L 440 420 L 425 445 L 410 465
  L 395 480 L 380 490 L 365 495 L 350 505
  L 340 520 L 350 535 L 365 545 L 380 555
  L 400 560 L 420 555 L 440 545 L 455 530
  L 470 510 L 480 490 L 490 470 L 495 450
  L 500 430 L 510 410 L 520 390 L 525 370
  L 530 350 L 535 330 L 530 310 L 520 295
  L 510 280 L 495 265 L 480 255 L 465 245
  L 450 240 L 435 235 L 420 240 L 405 245
  L 390 250 L 375 260 L 360 275 L 345 290
  L 330 305 L 315 315 L 300 330 L 285 345
  L 270 360 L 255 375 L 240 390 L 225 405
  L 210 415 L 195 420 L 180 410 L 165 395
  L 150 375 L 140 355 L 130 330 L 125 305
  L 120 280 L 115 255 L 115 230 L 120 205
  L 125 180 L 130 155 L 130 130 L 135 105
  L 135 80 L 135 55 L 135 30 Z

  M 100 200 L 115 195 L 125 200 L 130 215 L 125 230 L 115 235 L 100 230 L 95 215 Z
  M 90 220 L 85 225 L 80 220 L 82 215 L 90 212 Z

  M 470 300 L 485 305 L 495 315 L 500 330 L 495 345 L 485 355 L 470 360 L 458 350 L 455 335 L 460 320 Z
`;

// ── Main component ──────────────────────────────────────────────────────────────

export default function SpatialDashboardMap() {
  const [overview, setOverview] = useState<MapOverview | null>(null);
  const [hovered, setHovered] = useState<MapMarker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tilt, setTilt] = useState({ x: -8, y: 4 }); // subtle initial tilt

  useEffect(() => {
    api.get<MapOverview>("/locations/map/overview")
      .then((data) => {
        setOverview(data);
        setLoaded(true);
      })
      .catch(() => {
        // silently fail — map stays blank but no crash
        setLoaded(true);
      });
  }, []);

  const zones = overview ? computeZones(overview.markers) : [];

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -8 + cy * 6, y: 4 + cx * -8 });
  }, []);

  const statusCounts = overview
    ? (["PROPOSED","APPROVED","IN_PROGRESS","COMPLETED","VERIFIED","CANCELLED"] as ProjectStatus[]).reduce(
        (acc, s) => {
          acc[s] = overview.markers.filter((m) => m.project.status === s).length;
          return acc;
        },
        {} as Record<ProjectStatus, number>
      )
    : ({} as Record<ProjectStatus, number>);

  return (
    <div
      className="relative w-full h-full"
      style={{ perspective: "900px" }}
    >
      {/* 3D tilt container */}
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          transformStyle: "preserve-3d",
          transition: "rotateX 0.4s cubic-bezier(0.16,1,0.3,1), rotateY 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Map card */}
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(8,11,16,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 0 60px rgba(37,99,235,0.08), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Dot grid background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* SVG Map */}
          <svg
            ref={svgRef}
            viewBox="0 0 600 660"
            className="w-full h-full"
            style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.6s ease" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: -8, y: 4 })}
            role="img"
            aria-label="Geographic map of India showing project locations with status markers"
          >
            <defs>
              <filter id="glow-map" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="zone-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="india-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="rgba(30,41,59,0.6)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0.8)" />
              </linearGradient>
            </defs>

            {/* Density heat zones */}
            {zones.map((z, i) => (
              <motion.circle
                key={i}
                cx={z.cx}
                cy={z.cy}
                r={z.r}
                fill="url(#zone-grad)"
                opacity={z.opacity}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: z.opacity, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.8 }}
              />
            ))}

            {/* India outline */}
            <motion.path
              d={INDIA_PATH}
              fill="url(#india-fill)"
              stroke="rgba(59,130,246,0.2)"
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              filter="url(#glow-map)"
            />

            {/* State labels */}
            {STATE_LABELS.map((s) => (
              <text
                key={s.label}
                x={s.x}
                y={s.y}
                fontSize={7}
                fill={`rgba(148,163,184,${s.opacity ?? 0.2})`}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={500}
                letterSpacing={0.5}
                textAnchor="middle"
                style={{ userSelect: "none", pointerEvents: "none" }}
              >
                {s.label}
              </text>
            ))}

            {/* Project markers */}
            {overview?.markers.map((m) => (
              <MarkerDot
                key={m.id}
                marker={m}
                onHover={setHovered}
                onLeave={() => setHovered(null)}
              />
            ))}

            {/* Hovered marker tooltip */}
            <AnimatePresence>
              {hovered && <MarkerTooltip key={hovered.id} marker={hovered} />}
            </AnimatePresence>

            {/* Grid overlay lines (subtle) */}
            {[1, 2, 3].map((i) => (
              <line
                key={i}
                x1={i * 200}
                y1={0}
                x2={i * 200}
                y2={660}
                stroke="rgba(59,130,246,0.03)"
                strokeWidth={1}
              />
            ))}
            {[1, 2].map((i) => (
              <line
                key={i}
                x1={0}
                y1={i * 220}
                x2={600}
                y2={i * 220}
                stroke="rgba(59,130,246,0.03)"
                strokeWidth={1}
              />
            ))}
          </svg>

          {/* Corner frame accents */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: 28,
              height: 28,
              borderTop: "1px solid rgba(59,130,246,0.25)",
              borderLeft: "1px solid rgba(59,130,246,0.25)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderTop: "1px solid rgba(59,130,246,0.25)",
              borderRight: "1px solid rgba(59,130,246,0.25)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              width: 28,
              height: 28,
              borderBottom: "1px solid rgba(59,130,246,0.25)",
              borderLeft: "1px solid rgba(59,130,246,0.25)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              width: 28,
              height: 28,
              borderBottom: "1px solid rgba(59,130,246,0.25)",
              borderRight: "1px solid rgba(59,130,246,0.25)",
              pointerEvents: "none",
            }}
          />

          {/* Status legend overlay (bottom-left) */}
          {overview && (
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                pointerEvents: "none",
              }}
            >
              {(Object.keys(STATUS_HEX) as ProjectStatus[]).map((s) => (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: STATUS_HEX[s],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "8px", color: "rgba(148,163,184,0.6)", fontFamily: "Inter, sans-serif" }}>
                    {statusCounts[s] ?? 0} {STATUS_LABEL[s]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Coordinates readout (bottom-right) */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              fontSize: "8px",
              fontFamily: "JetBrains Mono, monospace",
              color: "rgba(148,163,184,0.3)",
              pointerEvents: "none",
            }}
          >
            VOJAS · MPLAD · SPATIAL LAYER
          </div>

          {/* Loading shimmer */}
          {!loaded && (
            <div
              role="status"
              aria-label="Loading map data"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.04) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
              }}
            />
          )}
        </div>
      </motion.div>

      {/* Depth shadow layer beneath */}
      <div
        style={{
          position: "absolute",
          bottom: -12,
          left: 8,
          right: -8,
          height: 40,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
          borderRadius: "0 0 1rem 1rem",
          filter: "blur(8px)",
          zIndex: -1,
        }}
      />
    </div>
  );
}
