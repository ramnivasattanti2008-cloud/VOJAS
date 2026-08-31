/// <reference types="leaflet.markercluster" />
import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { MapMarker } from "@/types";
import type { Anomaly } from "@/types";
import type { RiskLevel } from "@/services/risk-api";
import { CheckCircle2, Building2, AlertTriangle, MapPin } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: "#94a3b8",
  APPROVED: "#60a5fa",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#22c55e",
  VERIFIED: "#10b981",
  CANCELLED: "#ef4444",
};

function statusHex(status: string): string {
  return STATUS_COLORS[status] ?? "#94a3b8";
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PROPOSED: "Proposed",
    APPROVED: "Approved",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    VERIFIED: "Verified",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

const SEVERITY_RADII: Record<string, number> = {
  LOW: 14,
  MEDIUM: 22,
  HIGH: 32,
  CRITICAL: 44,
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#facc15",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

// ─── Cluster Layer ─────────────────────────────────────────────────────────────

interface ClusterLayerProps {
  markers: (MapMarker & { anomalyCount?: number; riskLevel?: RiskLevel })[];
  onMarkerClick?: (projectId: string) => void;
}

export function ClusterLayer({ markers, onMarkerClick }: ClusterLayerProps) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      zoomToBoundsOnClick
      iconCreateFunction={(cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? "small" : count < 50 ? "medium" : "large";
        const clusterClass = `marker-cluster marker-cluster-${size}`;
        return L.divIcon({
          html: `<div class="cluster-inner"><span>${count}</span></div>`,
          className: clusterClass,
          iconSize: L.point(40, 40),
        });
      }}
    >
      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.latitude, m.longitude]}
          radius={8}
          pathOptions={{
            color: statusHex(m.project.status),
            fillColor: statusHex(m.project.status),
            fillOpacity: 0.65,
            weight: m.verified ? 3 : 1.5,
          }}
          eventHandlers={{
            click: () => onMarkerClick?.(m.project.id),
          }}
        >
          <Popup>
            <div className="text-xs space-y-1.5 min-w-[200px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusHex(m.project.status) }}
                />
                <span className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider">
                  {getStatusLabel(m.project.status)}
                </span>
                {m.verified && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-auto" />
                )}
              </div>
              <p className="font-semibold text-slate-900 leading-snug">
                {m.project.name}
              </p>
              <div className="flex items-center gap-1 text-slate-600">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>
                  {m.project.district}, {m.project.state}
                </span>
              </div>
              {m.label && (
                <div className="flex items-center gap-1 text-slate-600">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span>{m.label}</span>
                </div>
              )}
              {m.anomalyCount !== undefined && m.anomalyCount > 0 && (
                <div className="flex items-center gap-1 text-orange-600 font-medium">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{m.anomalyCount} open anomaly{m.anomalyCount !== 1 ? "s" : ""}</span>
                </div>
              )}
              {m.riskLevel && (
                <div className="flex items-center gap-1">
                  <RiskBadge riskLevel={m.riskLevel} />
                </div>
              )}
              <p className="text-slate-500 text-[10px] italic">
                Tap project to view details →
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MarkerClusterGroup>
  );
}

// ─── Anomaly Heatmap Layer ─────────────────────────────────────────────────────

interface AnomalyHeatmapProps {
  anomalies: (Pick<Anomaly, "id" | "projectId" | "severity"> & {
    latitude: number;
    longitude: number;
  })[];
}

export function AnomalyHeatmap({ anomalies }: AnomalyHeatmapProps) {
  return (
    <>
      {anomalies.map((a) => {
        const radius = SEVERITY_RADII[a.severity] ?? 18;
        const color = SEVERITY_COLORS[a.severity] ?? "#94a3b8";
        return (
          <CircleMarker
            key={a.id}
            center={[a.latitude, a.longitude]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.18,
              weight: 1.5,
              opacity: 0.55,
            }}
          >
            <Tooltip sticky>
              <span className="text-xs font-medium">
                {a.severity} severity anomaly
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ─── Risk Badge (popup) ────────────────────────────────────────────────────────

const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  CRITICAL: "Critical Risk",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#facc15",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

export function RiskBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  const color = RISK_COLORS[riskLevel];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border"
      style={{
        backgroundColor: `${color}20`,
        color,
        borderColor: `${color}40`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {RISK_LABEL[riskLevel]}
    </span>
  );
}

// ─── Map Layers Control (floating toggle) ─────────────────────────────────────

export type LayerMode = "markers" | "heatmap" | "both";

export type TileMode = "map" | "satellite" | "hybrid";

interface MapLayersControlProps {
  mode: LayerMode;
  onChange: (mode: LayerMode) => void;
  tileMode?: TileMode;
  onTileModeChange?: (mode: TileMode) => void;
}

export function MapLayersControl({ mode, onChange, tileMode, onTileModeChange }: MapLayersControlProps) {
  const layerOptions: { value: LayerMode; label: string }[] = [
    { value: "markers", label: "Markers" },
    { value: "heatmap", label: "Heatmap" },
    { value: "both", label: "Both" },
  ];

  const tileOptions: { value: TileMode; label: string }[] = [
    { value: "map", label: "Map" },
    { value: "satellite", label: "Satellite" },
    { value: "hybrid", label: "Hybrid" },
  ];

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
      {/* Tile mode selector */}
      {onTileModeChange && tileMode && (
        <div className="glass rounded-lg p-1 flex flex-col gap-0.5 min-w-[88px]">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 py-0.5">Base Map</p>
          {tileOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onTileModeChange(opt.value)}
              className={`w-full text-[11px] px-3 py-1.5 rounded-md font-medium transition-all ${
                tileMode === opt.value
                  ? "bg-electric-500/20 text-electric-400 border border-electric-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Layer mode selector */}
      <div className="glass rounded-lg p-1 flex flex-col gap-0.5 min-w-[80px]">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 py-0.5">Layers</p>
        {layerOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-[11px] px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === opt.value
                ? "bg-electric-500/20 text-electric-400 border border-electric-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
