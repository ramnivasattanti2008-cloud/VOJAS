/**
 * MapViewPage — VOJAS 2.0 Project Map
 *
 * IBM Carbon–inspired light theme for surrounding UI.
 * Map canvas stays dark (Leaflet/OpenStreetMap constraint).
 * No gradients, no glassmorphism, no glow effects.
 * All data from real hooks.
 */

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import {
  type MapMarker,
  type ProjectStatus,
  type Anomaly,
  PROJECT_STATUSES,
  STATUS_COLORS,
  PROJECT_SECTORS,
} from "@/types";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useMapOverview } from "@/hooks/useMap";
import { riskApi, type RiskLevel } from "@/services/risk-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { MapLegend } from "./MapLegend";
import { BoundariesLayer } from "./BoundariesLayer";
import { DistrictsLayer } from "./DistrictsLayer";
import { ClusterLayer, AnomalyHeatmap, MapLayersControl, type LayerMode, type TileMode } from "./MapLayers";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Search,
  X,
  Filter,
  Building2,
  ChevronRight,
  Map as MapIcon,
  CheckCircle2,
  IndianRupee,
  AlertTriangle,
  Calendar,
  Layers,
  Briefcase,
} from "lucide-react";

const INDIA_CENTER: [number, number] = [22.5937, 78.9629];
const INDIA_ZOOM = 5;

const RISK_FILTER_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#facc15",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

function statusHex(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    PROPOSED: "#94a3b8",
    APPROVED: "#60a5fa",
    IN_PROGRESS: "#f59e0b",
    COMPLETED: "#22c55e",
    VERIFIED: "#10b981",
    CANCELLED: "#ef4444",
  };
  return map[status];
}

function getStatusLabel(v: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === v)?.label ?? v;
}

// ── Zoom-aware districts boundary ────────────────────────────────────────────

function DistrictsBoundary({
  showDistricts,
  districtCounts,
  highlightedState,
}: {
  showDistricts: boolean;
  districtCounts?: Record<string, number>;
  highlightedState: string;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoom", onZoom);
    return () => { map.off("zoom", onZoom); };
  }, [map]);
  if (!showDistricts || zoom < 9) return null;
  return (
    <DistrictsLayer
      districtCounts={districtCounts}
      highlightedState={highlightedState}
    />
  );
}

// ── Recenter map when filters change ─────────────────────────────────────────

function RecenterOnFit({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 8, { animate: true });
      return;
    }
    const lats = markers.map((m) => m.latitude);
    const lngs = markers.map((m) => m.longitude);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [markers, map]);
  return null;
}

// ── KPI chip (compact, light theme) ──────────────────────────────────────────

function StatChip({
  icon: Icon,
  value,
  label,
  accent = "blue",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  accent?: "blue" | "green" | "amber";
}) {
  const colors: Record<string, { icon: string; text: string }> = {
    blue:  { icon: "text-blue-600", text: "text-gray-900" },
    green: { icon: "text-green-600", text: "text-gray-900" },
    amber: { icon: "text-amber-600", text: "text-gray-900" },
  };
  const c = colors[accent] ?? colors.blue;
  return (
    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded px-3 py-1.5">
      <Icon className={cn("w-3.5 h-3.5 shrink-0", c.icon)} aria-hidden="true" />
      <span className={cn("font-semibold text-sm tabular-nums", c.text)}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  count,
  isActive,
  color,
  onClick,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border transition-colors",
        isActive
          ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      {color && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      )}
      {label}
      {count !== undefined && (
        <span className={cn("text-[10px] tabular-nums", isActive ? "text-blue-500" : "text-gray-400")}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

type EnrichedMarker = MapMarker & {
  anomalyCount: number;
  riskLevel?: RiskLevel;
};

export default function MapViewPage() {
  const navigate = useNavigate();

  const [layerMode, setLayerMode] = useState<LayerMode>("markers");
  const [tileMode, setTileMode] = useState<TileMode>("map");

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [stateFilter, setStateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevel | "">("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showDistricts, setShowDistricts] = useState(false);

  const riskCache = useRef<Map<string, RiskLevel>>(new Map());
  const [recenterToken, setRecenterToken] = useState(0);

  const overviewQuery = useMapOverview({
    status: (statusFilter || undefined) as ProjectStatus | undefined,
    state: stateFilter || undefined,
  });
  const anomaliesQuery = useAnomalies({ status: "OPEN", limit: 500 });

  const overview = overviewQuery.data ?? null;
  const anomalies = anomaliesQuery.data?.items ?? [];
  const loading = overviewQuery.isLoading;
  const error = overviewQuery.error?.message ?? null;

  const getProjectRisk = async (projectId: string): Promise<RiskLevel | undefined> => {
    if (riskCache.current.has(projectId)) {
      return riskCache.current.get(projectId);
    }
    try {
      const risk = await riskApi.get(projectId);
      riskCache.current.set(projectId, risk.riskLevel);
      return risk.riskLevel;
    } catch {
      return undefined;
    }
  };

  const anomalyCountByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of anomalies) {
      if (a.projectId) m.set(a.projectId, (m.get(a.projectId) ?? 0) + 1);
    }
    return m;
  }, [anomalies]);

  const heatmapAnomalies = useMemo(() => {
    if (!overview) return [] as (Pick<Anomaly, "id" | "projectId" | "severity"> & { latitude: number; longitude: number })[];
    const locByProject = new Map<string, { lat: number; lng: number }>();
    for (const m of overview.markers) {
      locByProject.set(m.project.id, { lat: m.latitude, lng: m.longitude });
    }
    return anomalies
      .map((a) => {
        if (!a.projectId) return null;
        const loc = locByProject.get(a.projectId);
        if (!loc) return null;
        return { id: a.id, projectId: a.projectId, severity: a.severity, latitude: loc.lat, longitude: loc.lng };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [anomalies, overview]);

  const states = useMemo(() => {
    if (!overview) return [] as string[];
    return Array.from(new Set(overview.markers.map((m) => m.project.state))).sort();
  }, [overview]);

  const enrichedMarkers: EnrichedMarker[] = useMemo(() => {
    if (!overview) return [];
    return overview.markers.map((m) => ({
      ...m,
      anomalyCount: anomalyCountByProject.get(m.project.id) ?? 0,
      riskLevel: riskCache.current.get(m.project.id),
    }));
  }, [overview, anomalyCountByProject]);

  const filtered = useMemo(() => {
    let list = enrichedMarkers;
    if (stateFilter) list = list.filter((m) => m.project.state === stateFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) =>
        m.project.name.toLowerCase().includes(q) ||
        m.project.district.toLowerCase().includes(q) ||
        (m.label ?? "").toLowerCase().includes(q)
      );
    }
    if (riskLevelFilter) list = list.filter((m) => m.riskLevel === riskLevelFilter);
    if (sectorFilter) list = list.filter((m) => m.project.sector === sectorFilter);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((m) => m.project.startDate && new Date(m.project.startDate).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      list = list.filter((m) => m.project.expectedEndDate && new Date(m.project.expectedEndDate).getTime() <= to);
    }
    if (budgetMin) {
      const min = parseFloat(budgetMin) * 1_000_000;
      list = list.filter((m) => m.project.approvedAmount >= min);
    }
    if (budgetMax) {
      const max = parseFloat(budgetMax) * 1_000_000;
      list = list.filter((m) => m.project.approvedAmount <= max);
    }
    return list;
  }, [enrichedMarkers, stateFilter, search, riskLevelFilter, sectorFilter, dateFrom, dateTo, budgetMin, budgetMax]);

  const statusCounts = useMemo(() => {
    if (!overview) return {} as Record<ProjectStatus, number>;
    const counts: Record<string, number> = {};
    for (const m of overview.markers) {
      counts[m.project.status] = (counts[m.project.status] ?? 0) + 1;
    }
    return counts as Record<ProjectStatus, number>;
  }, [overview]);

  const withAnomaliesCount = useMemo(
    () => enrichedMarkers.filter((m) => m.anomalyCount > 0).length,
    [enrichedMarkers]
  );

  const clearFilters = () => {
    setStatusFilter("");
    setStateFilter("");
    setSearchInput("");
    setSearch("");
    setRiskLevelFilter("");
    setSectorFilter("");
    setDateFrom("");
    setDateTo("");
    setBudgetMin("");
    setBudgetMax("");
  };
  const hasActiveFilters =
    !!statusFilter || !!stateFilter || !!search || !!riskLevelFilter ||
    !!sectorFilter || !!dateFrom || !!dateTo || !!budgetMin || !!budgetMax;

  const handleMarkerClick = async (projectId: string) => {
    const cached = riskCache.current.has(projectId);
    if (!cached) {
      await getProjectRisk(projectId);
      setRecenterToken((t) => t + 1);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-blue-600" />
            Project Map
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Geographic distribution of MPLAD projects across India
          </p>
        </div>
        {overview && (
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip icon={MapPin} value={overview.total} label="total" accent="blue" />
            <StatChip icon={CheckCircle2} value={overview.markers.filter((m) => m.verified).length} label="verified" accent="green" />
            <StatChip icon={AlertTriangle} value={withAnomaliesCount} label="with anomalies" accent="amber" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <form
            role="search"
            aria-label="Search projects on map"
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
            className="relative flex-1 min-w-[220px]"
          >
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by project, district, or label…"
              className="w-full border border-gray-200 rounded px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </form>

          {/* State filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
          >
            <option value="">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "")}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mr-1">Status:</span>
          {PROJECT_STATUSES.map((s) => (
            <FilterChip
              key={s.value}
              label={s.label}
              count={statusCounts[s.value] ?? 0}
              isActive={statusFilter === s.value}
              color={statusHex(s.value)}
              onClick={() => setStatusFilter(statusFilter === s.value ? "" : s.value as ProjectStatus)}
            />
          ))}
        </div>

        {/* Risk chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTriangle className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mr-1">Risk:</span>
          {RISK_FILTER_LEVELS.map((level) => (
            <FilterChip
              key={level}
              label={level}
              isActive={riskLevelFilter === level}
              color={RISK_COLORS[level]}
              onClick={() => setRiskLevelFilter(riskLevelFilter === level ? "" : level)}
            />
          ))}
          {riskLevelFilter && (
            <span className="text-[10px] text-gray-400 italic ml-1">(applies to cached risk)</span>
          )}
        </div>

        {/* Sector + budget + date */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
          <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="border border-gray-200 rounded px-2.5 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
          >
            <option value="">All sectors</option>
            {PROJECT_SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <span className="text-[11px] text-gray-500 ml-2 flex items-center gap-1">
            <IndianRupee className="w-3 h-3" aria-hidden="true" />
            Budget (₹Cr)
          </span>
          <input
            type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="Min" min="0" step="0.1"
            className="w-16 border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-400 text-[11px]">–</span>
          <input
            type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="Max" min="0" step="0.1"
            className="w-16 border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
          />

          <span className="text-[11px] text-gray-500 ml-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" aria-hidden="true" />
            Period
          </span>
          <input
            type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-800 focus:outline-none focus:border-blue-500 [color-scheme:light]"
          />
          <span className="text-gray-400 text-[11px]">→</span>
          <input
            type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-800 focus:outline-none focus:border-blue-500 [color-scheme:light]"
          />

          {/* Boundary toggles */}
          <button
            onClick={() => setShowBoundaries((v) => !v)}
            aria-pressed={showBoundaries}
            className={cn(
              "ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded border transition-colors",
              showBoundaries
                ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <Layers className="w-3 h-3" aria-hidden="true" />
            {showBoundaries ? "States on" : "States"}
          </button>
          <button
            onClick={() => setShowDistricts((v) => !v)}
            aria-pressed={showDistricts}
            className={cn(
              "flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded border transition-colors",
              showDistricts
                ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <Layers className="w-3 h-3" aria-hidden="true" />
            {showDistricts ? "Districts on" : "Districts"}
          </button>
        </div>
      </div>

      {/* Map + sidebar */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-md" style={{ height: 560 }}>
          <LoadingState message="Loading map data…" />
        </div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-md" style={{ height: 560 }}>
          <ErrorState message={error} onRetry={() => overviewQuery.refetch()} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Map (dark canvas stays dark) */}
          <div className="rounded-md overflow-hidden relative border border-gray-200" style={{ height: 560 }}>
            <MapContainer
              center={INDIA_CENTER}
              zoom={INDIA_ZOOM}
              minZoom={4}
              maxZoom={18}
              scrollWheelZoom
              zoomControl={false}
              className="h-full w-full"
              style={{ background: "#0b1220" }}
              aria-label="Interactive project map of India"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {(tileMode === "satellite" || tileMode === "hybrid") && (
                <TileLayer
                  attribution="Tiles © Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={19} maxZoom={19}
                />
              )}
              {tileMode === "hybrid" && (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  opacity={0.4}
                />
              )}
              <ZoomControl position="bottomright" />
              <RecenterOnFit markers={filtered} key={recenterToken} />
              {showBoundaries && (
                <BoundariesLayer
                  highlightedState={stateFilter}
                  stateCounts={overview?.stateCounts}
                  onStateClick={(state) => setStateFilter((prev) => (prev === state ? "" : state))}
                />
              )}
              <DistrictsBoundary
                showDistricts={showDistricts}
                districtCounts={overview?.districtCounts}
                highlightedState={stateFilter}
              />
              {(layerMode === "markers" || layerMode === "both") && (
                <ClusterLayer markers={filtered} onMarkerClick={handleMarkerClick} />
              )}
              {(layerMode === "heatmap" || layerMode === "both") && (
                <AnomalyHeatmap anomalies={heatmapAnomalies} />
              )}
            </MapContainer>

            {/* Floating layer control */}
            <MapLayersControl
              mode={layerMode}
              onChange={setLayerMode}
              tileMode={tileMode}
              onTileModeChange={setTileMode}
            />

            {/* Floating count badge */}
            <div
              role="status"
              aria-live="polite"
              className="absolute top-3 left-3 z-[1000] bg-white border border-gray-200 rounded px-3 py-1.5 text-xs text-gray-700 pointer-events-none shadow-sm"
            >
              Showing <span className="font-semibold">{filtered.length}</span> of{" "}
              <span className="font-semibold">{overview?.total ?? 0}</span>
            </div>
          </div>

          {/* Sidebar (light theme) */}
          <div
            className="bg-white border border-gray-200 rounded-md p-4 space-y-3"
            style={{ height: 560, overflowY: "auto" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Projects ({filtered.length})
              </h2>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-6 h-6" />}
                title="No projects in view"
                description="Adjust filters or zoom out to see more markers."
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((m) => {
                  const statusStyle = STATUS_COLORS[m.project.status] ?? {
                    bg: "bg-gray-100",
                    text: "text-gray-700",
                    dot: "bg-gray-400",
                  };
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/projects/${m.project.id}`)}
                      className="w-full text-left p-3 rounded-md bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider",
                          statusStyle.bg, statusStyle.text
                        )}>
                          <span className={cn("w-1 h-1 rounded-full", statusStyle.dot)} />
                          {getStatusLabel(m.project.status)}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.anomalyCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {m.anomalyCount}
                            </span>
                          )}
                          {m.riskLevel && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: RISK_COLORS[m.riskLevel] }}
                              title={`${m.riskLevel} risk`}
                            />
                          )}
                          {m.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                        {m.project.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          {m.project.district}
                        </span>
                        {m.label && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{m.label}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">
                          <IndianRupee className="w-2.5 h-2.5 inline" />
                          {(m.project.approvedAmount / 1_00_00_000).toFixed(2)} Cr
                        </span>
                        <div className="flex items-center gap-1 text-gray-400 group-hover:text-blue-600 transition-colors">
                          <span className="text-[10px]">View</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && !error && overview && overview.total > 0 && (
        <MapLegend layerMode={layerMode} showBoundaries={showBoundaries} showDistricts={showDistricts} />
      )}
    </div>
  );
}
