/**
 * District boundaries overlay — loads 820-district simplified GeoJSON on mount
 * (fetch, cached in module scope) and renders it via Leaflet GeoJSON.
 * Choropleth colors keyed by "STATE|DISTRICT" (canonical, uppercased).
 * Visible only when zoom >= 9 (enforced by parent DistricBoundary wrapper).
 */

import { GeoJSON } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { Feature, Geometry } from "geojson";

// ── GeoJSON type ──────────────────────────────────────────────────────────────

interface DistrictProps {
  state: string;    // e.g. "KARNATAKA"
  district: string; // e.g. "BENGALURU RURAL"
  st_code: string;
  dist_code: string;
  shape_area: string;
}

type DistrictGeoJSON = GeoJSON.FeatureCollection<Geometry, DistrictProps>;

// ── Module-level cache (fetch once, reuse across renders) ─────────────────────

let _cache: DistrictGeoJSON | null = null;
let _promise: Promise<DistrictGeoJSON> | null = null;

function loadGeoJSON(): Promise<DistrictGeoJSON> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;

  _promise = fetch("/data/india-districts.geojson")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load districts: ${r.status}`);
      return r.json() as Promise<DistrictGeoJSON>;
    })
    .then((data) => {
      _cache = data;
      _promise = null;
      return data;
    });

  return _promise;
}

// ── Choropleth color ─────────────────────────────────────────────────────────

function getDistrictColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "#1a3050";
  const ratio = Math.min(1, Math.log(count + 1) / Math.log(maxCount + 1));
  const hue = 220 - ratio * 220; // blue → red
  return `hsl(${hue}, 68%, ${24 + ratio * 24}%)`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DistrictsLayerProps {
  /** Canonical district counts: Record<"STATE|DISTRICT", count> */
  districtCounts?: Record<string, number>;
  /** State to highlight */
  highlightedState?: string;
  onDistrictClick?: (state: string, district: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DistrictsLayer({
  districtCounts = {},
  highlightedState = "",
  onDistrictClick,
}: DistrictsLayerProps) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const [geojson, setGeojson] = useState<DistrictGeoJSON | null>(null);

  const maxCount = Math.max(...Object.values(districtCounts), 0);
  const hl = highlightedState.toUpperCase().trim();

  // Load GeoJSON once
  useEffect(() => {
    loadGeoJSON().then(setGeojson).catch(console.error);
  }, []);

  const style = (feature: Feature<Geometry> | undefined): L.PathOptions => {
    if (!feature?.properties) return { fillOpacity: 0, weight: 0 };
    const props = feature.properties as DistrictProps;
    const key = `${props.state}|${props.district}`;
    const count = districtCounts[key] ?? 0;
    const isHl = hl !== "" && props.state === hl;

    return {
      color: isHl ? "#a5b4fc" : "#475569",
      fillColor: isHl ? "#6366f1" : getDistrictColor(count, maxCount),
      fillOpacity: isHl ? 0.6 : count > 0 ? 0.5 : 0.18,
      weight: isHl ? 1.5 : 0.8,
      opacity: isHl ? 0.9 : 0.4,
      dashArray: isHl ? undefined : "2 3",
    };
  };

  const onEachFeature = (feature: Feature<Geometry>, layer: L.Layer) => {
    const props = feature.properties as DistrictProps | undefined;
    if (!props) return;

    const key = `${props.state}|${props.district}`;
    const count = districtCounts[key] ?? 0;

    layer.bindTooltip(
      `<div style="font-size:11px;line-height:1.5">
        <b>${props.district}</b><br/>
        <span style="color:#64748b">${props.state}</span><br/>
        ${count > 0
          ? `<span style="color:#f59e0b">${count} project${count !== 1 ? "s" : ""}</span>`
          : `<span style="color:#475569;font-style:italic">No projects</span>`
        }
      </div>`,
      { sticky: true, direction: "top", offset: [0, -4] }
    );

    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.8, weight: 1.5, opacity: 0.85 });
        l.bringToFront();
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        (e.target as L.Path).setStyle(style(feature));
      },
      click: () => {
        if (onDistrictClick) onDistrictClick(props.state, props.district);
      },
    });
  };

  if (!geojson) return null;

  return (
    <GeoJSON
      ref={layerRef}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}
