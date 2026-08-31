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
import { ClusterLayer, AnomalyHeatmap, MapLayersControl, type LayerMode, type TileMode } from "./MapLayers";
import { MapLegend } from "./MapLegend";
import { BoundariesLayer } from "./BoundariesLayer";
import { DistrictsLayer } from "./DistrictsLayer";

/** Zoom-aware districts wrapper — only renders DistrictsLayer when zoom >= 9 */
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

// Recenter map when filters change
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

type EnrichedMarker = MapMarker & {
  anomalyCount: number;
  riskLevel?: RiskLevel;
};

export default function MapViewPage() {
  const navigate = useNavigate();

  // Layer mode
  const [layerMode, setLayerMode] = useState<LayerMode>("markers");

  // Tile mode (base map)
  const [tileMode, setTileMode] = useState<TileMode>("map");

  // Filters
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [stateFilter, setStateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevel | "">("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showDistricts, setShowDistricts] = useState(false);

  // Per-project risk cache: projectId → riskLevel
  const riskCache = useRef<Map<string, RiskLevel>>(new Map());

  // Trigger recenter when filters change
  const [recenterToken, setRecenterToken] = useState(0);

  // React Query: server-state caching for map overview + open anomalies
  const overviewQuery = useMapOverview({
    status: (statusFilter || undefined) as ProjectStatus | undefined,
    state: stateFilter || undefined,
  });
  const anomaliesQuery = useAnomalies({ status: "OPEN", limit: 500 });

  const overview = overviewQuery.data ?? null;
  const anomalies = anomaliesQuery.data?.items ?? [];
  const loading = overviewQuery.isLoading;
  const error = overviewQuery.error?.message ?? null;

  // Lazy-fetch risk for a project; returns the cached or freshly-fetched level.
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

  // Anomaly count by projectId (only those with location data)
  const anomalyCountByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of anomalies) {
      if (a.projectId) {
        m.set(a.projectId, (m.get(a.projectId) ?? 0) + 1);
      }
    }
    return m;
  }, [anomalies]);

  // Build a flat anomaly list with location data for the heatmap.
  // Anomalies may not have lat/lng — synthesize from the matching project marker.
  const heatmapAnomalies = useMemo(() => {
    if (!overview) return [] as (Pick<Anomaly, "id" | "projectId" | "severity"> & {
      latitude: number;
      longitude: number;
    })[];

    // Build project-id → marker location map
    const locByProject = new Map<string, { lat: number; lng: number }>();
    for (const m of overview.markers) {
      locByProject.set(m.project.id, { lat: m.latitude, lng: m.longitude });
    }

    return anomalies
      .map((a) => {
        if (!a.projectId) return null;
        const loc = locByProject.get(a.projectId);
        if (!loc) return null;
        return {
          id: a.id,
          projectId: a.projectId,
          severity: a.severity,
          latitude: loc.lat,
          longitude: loc.lng,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [anomalies, overview]);

  // Unique states for the dropdown
  const states = useMemo(() => {
    if (!overview) return [] as string[];
    return Array.from(new Set(overview.markers.map((m) => m.project.state))).sort();
  }, [overview]);

  // Apply client-side search + state + risk + anomaly filters
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
    if (stateFilter) {
      list = list.filter((m) => m.project.state === stateFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) =>
        m.project.name.toLowerCase().includes(q) ||
        m.project.district.toLowerCase().includes(q) ||
        (m.label ?? "").toLowerCase().includes(q)
      );
    }
    if (riskLevelFilter) {
      // Opportunistic: only filter when we know the risk level for that project.
      // Projects not yet in cache (no popup opened) are hidden when a risk filter is active.
      list = list.filter((m) => m.riskLevel === riskLevelFilter);
    }
    if (sectorFilter) {
      list = list.filter((m) => m.project.sector === sectorFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((m) => {
        if (!m.project.startDate) return false;
        return new Date(m.project.startDate).getTime() >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      list = list.filter((m) => {
        if (!m.project.expectedEndDate) return false;
        return new Date(m.project.expectedEndDate).getTime() <= to;
      });
    }
    if (budgetMin) {
      const min = parseFloat(budgetMin) * 1_000_000; // convert crores → rupees
      list = list.filter((m) => m.project.approvedAmount >= min);
    }
    if (budgetMax) {
      const max = parseFloat(budgetMax) * 1_000_000;
      list = list.filter((m) => m.project.approvedAmount <= max);
    }
    return list;
  }, [enrichedMarkers, stateFilter, search, riskLevelFilter, sectorFilter, dateFrom, dateTo, budgetMin, budgetMax]);

  // Status counts (across full overview, before status filter)
  const statusCounts = useMemo(() => {
    if (!overview) return {} as Record<ProjectStatus, number>;
    const counts: Record<string, number> = {};
    for (const m of overview.markers) {
      counts[m.project.status] = (counts[m.project.status] ?? 0) + 1;
    }
    return counts as Record<ProjectStatus, number>;
  }, [overview]);

  // How many projects have any open anomaly (header chip)
  const withAnomaliesCount = useMemo(
    () => enrichedMarkers.filter((m) => m.anomalyCount > 0).length,
    [enrichedMarkers]
  );

  const clearFilters = () => {
    setStatusFilter("");
    setStateFilter("");
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

  // Marker click — fetch risk lazily, refresh marker list to surface the badge
  const handleMarkerClick = async (projectId: string) => {
    const cached = riskCache.current.has(projectId);
    if (!cached) {
      await getProjectRisk(projectId);
      // Trigger a re-render so the freshly cached riskLevel is shown in popup/sidebar.
      setRecenterToken((t) => t + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-electric-400" />
            Project Map
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Geographic distribution of MPLAD projects across India
          </p>
        </div>
        {overview && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-electric-400" />
              <span className="text-white font-medium">{overview.total}</span> total
            </div>
            <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-medium">
                {overview.markers.filter((m) => m.verified).length}
              </span>{" "}
              verified
            </div>
            <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-white font-medium">{withAnomaliesCount}</span> with anomalies
            </div>
          </div>
        )}
      </div>

      {/* Filters bar */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <form
            role="search"
            aria-label="Search projects on map"
            onSubmit={(e) => e.preventDefault()}
            className="relative flex-1 min-w-[220px]"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project, district, or label..."
              aria-label="Search projects by name, district, or label"
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
            />
          </form>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            aria-label="Filter by state"
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "")}
            aria-label="Filter by project status"
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Status quick-filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Status:</span>
          {PROJECT_STATUSES.map((s) => {
            const isActive = statusFilter === s.value;
            const count = statusCounts[s.value] ?? 0;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(isActive ? "" : s.value)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                  isActive
                    ? "bg-electric-500/15 border-electric-500/30 text-electric-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusHex(s.value) }}
                />
                {s.label}
                <span className={`text-[10px] ${isActive ? "text-electric-300" : "text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Risk-level quick-filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
          <span
            className="text-[10px] text-slate-500 uppercase tracking-wider mr-1"
            title="Risk filter applies to projects whose risk has been viewed in this session."
          >
            Risk:
          </span>
          {RISK_FILTER_LEVELS.map((level) => {
            const isActive = riskLevelFilter === level;
            const color = RISK_COLORS[level];
            return (
              <button
                key={level}
                onClick={() => setRiskLevelFilter(isActive ? "" : level)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                  isActive
                    ? "border-electric-500/30 text-electric-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
                style={
                  isActive
                    ? { backgroundColor: `${color}25` }
                    : undefined
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {level}
              </button>
            );
          })}
          {riskLevelFilter && (
            <span className="text-[10px] text-slate-600 italic ml-1">
              (applies to projects with cached risk)
            </span>
          )}
        </div>

        {/* Sector + budget + date range filters (Phase 5B) */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            aria-label="Filter by project sector"
            className="bg-navy-800/60 border border-white/10 rounded-md px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
          >
            <option value="">All sectors</option>
            {PROJECT_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2 flex items-center gap-1">
            <IndianRupee className="w-3 h-3" aria-hidden="true" /> Budget (₹Cr)
          </span>
          <input
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="Min"
            min="0"
            step="0.1"
            aria-label="Minimum budget in crore"
            className="w-16 bg-navy-800/60 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50"
          />
          <span className="text-slate-600 text-[10px]" aria-hidden="true">–</span>
          <input
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="Max"
            min="0"
            step="0.1"
            aria-label="Maximum budget in crore"
            className="w-16 bg-navy-800/60 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50"
          />

          <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" aria-hidden="true" /> Period
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Start date filter"
            className="bg-navy-800/60 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-electric-500/50 [color-scheme:dark]"
          />
          <span className="text-slate-600 text-[10px]" aria-hidden="true">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="End date filter"
            className="bg-navy-800/60 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-electric-500/50 [color-scheme:dark]"
          />

          <button
            onClick={() => setShowBoundaries((v) => !v)}
            aria-pressed={showBoundaries}
            className={`ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border transition-all ${
              showBoundaries
                ? "bg-electric-500/15 border-electric-500/30 text-electric-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
            }`}
            title="Toggle India state boundaries"
          >
            <Layers className="w-3 h-3" aria-hidden="true" />
            {showBoundaries ? "States on" : "States"}
          </button>

          <button
            onClick={() => setShowDistricts((v) => !v)}
            aria-pressed={showDistricts}
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border transition-all ${
              showDistricts
                ? "bg-electric-500/15 border-electric-500/30 text-electric-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
            }`}
            title="Toggle India district boundaries (visible at zoom ≥ 9)"
          >
            <Layers className="w-3 h-3" aria-hidden="true" />
            {showDistricts ? "Districts on" : "Districts"}
          </button>
        </div>
      </div>

      {/* Map + sidebar layout */}
      {loading ? (
        <div className="glass rounded-xl" style={{ height: 560 }}>
          <LoadingState message="Loading map data..." />
        </div>
      ) : error ? (
        <div className="glass rounded-xl" style={{ height: 560 }}>
          <ErrorState message={error} onRetry={() => overviewQuery.refetch()} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Map */}
          <div className="glass rounded-xl overflow-hidden relative" style={{ height: 560 }}>
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
              {/* Satellite layer (only when in satellite or hybrid mode) */}
              {(tileMode === "satellite" || tileMode === "hybrid") && (
                <TileLayer
                  attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={19}
                  maxZoom={19}
                />
              )}
              {/* Semi-transparent OSM overlay for hybrid mode */}
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
                  onStateClick={(state) => {
                    setStateFilter((prev) => (prev === state ? "" : state));
                  }}
                />
              )}

              <DistrictsBoundary
                showDistricts={showDistricts}
                districtCounts={overview?.districtCounts}
                highlightedState={stateFilter}
              />

              {(layerMode === "markers" || layerMode === "both") && (
                <ClusterLayer
                  markers={filtered}
                  onMarkerClick={handleMarkerClick}
                />
              )}

              {(layerMode === "heatmap" || layerMode === "both") && (
                <AnomalyHeatmap anomalies={heatmapAnomalies} />
              )}
            </MapContainer>

            {/* Floating layer control (top-right) */}
            <MapLayersControl
              mode={layerMode}
              onChange={setLayerMode}
              tileMode={tileMode}
              onTileModeChange={setTileMode}
            />

            {/* Floating count badge (top-left) — announced to assistive tech */}
            <div
              role="status"
              aria-live="polite"
              className="absolute top-3 left-3 z-[1000] glass rounded-lg px-3 py-1.5 text-xs text-slate-300 pointer-events-none"
            >
              Showing <span className="text-white font-medium">{filtered.length}</span> of{" "}
              <span className="text-white font-medium">{overview?.total ?? 0}</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="glass rounded-xl p-4 space-y-3" style={{ height: 560, overflowY: "auto" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-electric-400" />
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
                  const statusStyle = STATUS_COLORS[m.project.status];
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/projects/${m.project.id}`)}
                      className="w-full text-left p-3 rounded-lg bg-navy-800/40 border border-white/5 hover:border-white/15 hover:bg-navy-800/70 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border border-white/5 ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${statusStyle.dot}`} />
                          {getStatusLabel(m.project.status)}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.anomalyCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-orange-400 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {m.anomalyCount}
                            </span>
                          )}
                          {m.riskLevel && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: RISK_COLORS[m.riskLevel] }}
                              title={`${m.riskLevel} risk`}
                            />
                          )}
                          {m.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-electric-300 transition-colors line-clamp-2 leading-snug">
                        {m.project.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {m.project.district}
                        </span>
                        {m.label && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{m.label}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <IndianRupee className="w-2.5 h-2.5" />
                          <span className="text-slate-400">Verified location</span>
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-electric-400 group-hover:translate-x-0.5 transition-all" />
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
