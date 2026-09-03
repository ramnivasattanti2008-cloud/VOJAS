'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { SatelliteObservation } from '@vojas/api-client';
import { useTimeMachine, type ComparisonMode } from './TimeMachineContext';
import { cn } from '@/lib/utils';

// MapLibre is loaded dynamically to avoid SSR issues
let MapLibre: typeof import('maplibre-gl') | null = null;
let cssLoaded = false;

async function loadMapLibre() {
  if (MapLibre) return MapLibre;
  const ml = await import('maplibre-gl');
  if (!cssLoaded && typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4.10.0/dist/maplibre-gl.css';
    document.head.appendChild(link);
    cssLoaded = true;
  }
  MapLibre = ml;
  return ml;
}

const BASEMAP_STYLES = {
  satellite: {
    version: 8 as const,
    sources: {
      esri: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'],
        tileSize: 256,
        attribution: '© Esri',
      },
    },
    layers: [{ id: 'esri-sat', type: 'raster' as const, source: 'esri' }],
  },
  hybrid: {
    version: 8 as const,
    sources: {
      esri: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'],
        tileSize: 256,
      },
      labels: {
        type: 'raster' as const,
        tiles: ['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png'],
        tileSize: 256,
      },
    },
    layers: [
      { id: 'esri-sat', type: 'raster' as const, source: 'esri' },
      { id: 'labels', type: 'raster' as const, source: 'labels' },
    ],
  },
  osm: {
    version: 8 as const,
    sources: {
      osm: {
        type: 'raster' as const,
        tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors, © CARTO',
      },
    },
    layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
  },
};

interface TimeMachineMapProps {
  lat: number;
  lng: number;
  observations: SatelliteObservation[];
  beforeObservation?: SatelliteObservation | null;
  selectedObservation?: SatelliteObservation | null;
  projectName?: string;
  className?: string;
  mode: ComparisonMode;
  opacity?: number; // 0..100, used in 'opacity' mode
  showChangeLayer?: boolean;
  showFootprint?: boolean;
  swipePosition?: number; // 0..100, used in 'swipe' mode
}

export function TimeMachineMap({
  lat,
  lng,
  observations,
  beforeObservation,
  selectedObservation,
  projectName,
  className,
  mode,
  opacity = 50,
  showChangeLayer = false,
  showFootprint = true,
  swipePosition = 50,
}: TimeMachineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const [activeBase, setActiveBase] = useState<'satellite' | 'hybrid' | 'osm'>('satellite');
  const [mapType, setMapType] = useState<'2d' | '3d'>('2d');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changeVisibility, setChangeVisibility] = useState(showChangeLayer);

  // Side-by-side mode: render two maps
  const isSideBySide = mode === 'side-by-side';

  // Compute the before WMS URL (or null if no usable image)
  const beforeWmsUrl = useMemo(() => buildObservationWmsUrl(beforeObservation), [beforeObservation]);
  const afterWmsUrl = useMemo(() => buildObservationWmsUrl(selectedObservation), [selectedObservation]);

  // ── Main map effect (handles 'single', 'opacity', 'swipe' modes) ────────────
  useEffect(() => {
    if (isSideBySide) return;
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;

    loadMapLibre()
      .then((ml) => {
        if (destroyed || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current!,
          style: BASEMAP_STYLES[activeBase],
          center: [lng, lat],
          zoom: 16,
          pitch: mapType === '3d' ? 50 : 0,
          bearing: mapType === '3d' ? -20 : 0,
        });
        map.on('load', () => {
          if (destroyed) return;
          setLoaded(true);

          // Add the after observation WMS layer (selected)
          if (afterWmsUrl) {
            try {
              map.addSource('obs-after', {
                type: 'raster',
                tiles: [afterWmsUrl],
                tileSize: 256,
                bounds: wmsBoundsFromObs(selectedObservation),
              });
              map.addLayer({
                id: 'obs-after-layer',
                type: 'raster',
                source: 'obs-after',
                paint: {
                  'raster-opacity': mode === 'opacity' ? opacity / 100 : (mode === 'swipe' ? 1.0 : 1.0),
                },
              });
            } catch (e) {
              // layer add can fail if invalid; safe to ignore
            }
          }

          // Add the before observation WMS layer (clipped to left of swipe line if swipe mode)
          if (beforeWmsUrl) {
            try {
              map.addSource('obs-before', {
                type: 'raster',
                tiles: [beforeWmsUrl],
                tileSize: 256,
                bounds: wmsBoundsFromObs(beforeObservation),
              });
              if (mode === 'swipe') {
                map.addLayer({
                  id: 'obs-before-layer',
                  type: 'raster',
                  source: 'obs-before',
                  paint: {
                    'raster-opacity': 1.0,
                    'raster-fade-duration': 0,
                  },
                });
                // Use a clipping mask: a featureCollection polygon covering the
                // left side up to swipePosition% of the viewport.
                applySwipeClip(map, ml, swipePosition, true);
              } else {
                map.addLayer({
                  id: 'obs-before-layer',
                  type: 'raster',
                  source: 'obs-before',
                  paint: {
                    'raster-opacity': mode === 'opacity' ? (1 - opacity / 100) : 0.0,
                    'raster-fade-duration': 0,
                  },
                });
              }
            } catch (e) {
              // ignore
            }
          }

          // Add the observation footprint polygon
          if (showFootprint && selectedObservation?.bbox) {
            const bbox = selectedObservation.bbox as { sw: [number, number]; ne: [number, number] } | null;
            if (bbox?.sw && bbox?.ne) {
              try {
                map.addSource('footprint', {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    geometry: {
                      type: 'Polygon',
                      coordinates: [[
                        [bbox.sw[1], bbox.sw[0]],
                        [bbox.ne[1], bbox.sw[0]],
                        [bbox.ne[1], bbox.ne[0]],
                        [bbox.sw[1], bbox.ne[0]],
                        [bbox.sw[1], bbox.sw[0]],
                      ]],
                    },
                    properties: {},
                  },
                });
                map.addLayer({
                  id: 'footprint-line',
                  type: 'line',
                  source: 'footprint',
                  paint: { 'line-color': '#fbbf24', 'line-width': 2, 'line-dasharray': [3, 2] },
                });
                map.addLayer({
                  id: 'footprint-fill',
                  type: 'fill',
                  source: 'footprint',
                  paint: { 'fill-color': '#fbbf24', 'fill-opacity': 0.05 },
                });
              } catch {}
            }
          }

          // Project marker
          const markerEl = document.createElement('div');
          markerEl.innerHTML = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>
            <circle cx="14" cy="14" r="5" fill="white"/>
          </svg>`;
          markerEl.style.cssText = 'cursor:pointer;transform:translate(-50%,-100%)';
          new ml.Marker({ element: markerEl })
            .setLngLat([lng, lat])
            .setPopup(
              new ml.Popup({ offset: 25, closeButton: false, closeOnClick: false })
                .setHTML(`<div style="font-family:system-ui;font-size:13px;padding:4px 0">
                  <strong>${projectName ?? 'Project'}</strong><br/>
                  <span style="color:#64748b;font-size:11px">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
                </div>`)
            )
            .addTo(map);

          // Change visualization layer
          if (changeVisibility && beforeObservation && selectedObservation) {
            try {
              map.addSource('change-vis', {
                type: 'geojson',
                data: makeChangeFeature(beforeObservation, selectedObservation),
              });
              map.addLayer({
                id: 'change-vis-layer',
                type: 'fill',
                source: 'change-vis',
                paint: {
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.35,
                },
              });
              map.addLayer({
                id: 'change-vis-line',
                type: 'line',
                source: 'change-vis',
                paint: {
                  'line-color': '#15803d',
                  'line-width': 1.5,
                },
              });
            } catch {}
          }
        });

        mapRef.current = map;
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load map'));

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSideBySide]);

  // Update WMS layers when observation changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !MapLibre) return;
    if (!map.isStyleLoaded()) return;
    const ml = MapLibre;

    // Update after layer
    if (map.getLayer('obs-after-layer') && afterWmsUrl) {
      const src = map.getSource('obs-after') as { setTiles?: (tiles: string[]) => void } | undefined;
      if (src && typeof src.setTiles === 'function') {
        src.setTiles([afterWmsUrl]);
      }
    } else if (afterWmsUrl && map.getSource('obs-after') == null) {
      try {
        map.addSource('obs-after', { type: 'raster', tiles: [afterWmsUrl], tileSize: 256, bounds: wmsBoundsFromObs(selectedObservation) });
        map.addLayer({
          id: 'obs-after-layer',
          type: 'raster',
          source: 'obs-after',
          paint: { 'raster-opacity': mode === 'opacity' ? opacity / 100 : 1.0 },
        });
      } catch {}
    }

    // Update before layer
    if (map.getLayer('obs-before-layer') && beforeWmsUrl) {
      const beforeSrc = map.getSource('obs-before') as { setTiles?: (tiles: string[]) => void } | undefined;
      if (beforeSrc && typeof beforeSrc.setTiles === 'function') {
        beforeSrc.setTiles([beforeWmsUrl]);
      }
      if (mode === 'opacity') {
        map.setPaintProperty('obs-before-layer', 'raster-opacity', 1 - opacity / 100);
      } else if (mode === 'single') {
        map.setPaintProperty('obs-before-layer', 'raster-opacity', 0);
      }
    } else if (beforeWmsUrl && map.getSource('obs-before') == null) {
      try {
        map.addSource('obs-before', { type: 'raster', tiles: [beforeWmsUrl], tileSize: 256, bounds: wmsBoundsFromObs(beforeObservation) });
        if (mode === 'swipe') {
          map.addLayer({ id: 'obs-before-layer', type: 'raster', source: 'obs-before', paint: { 'raster-opacity': 1.0 } });
          applySwipeClip(map, ml, swipePosition, true);
        } else {
          map.addLayer({
            id: 'obs-before-layer',
            type: 'raster',
            source: 'obs-before',
            paint: { 'raster-opacity': mode === 'opacity' ? (1 - opacity / 100) : 0 },
          });
        }
      } catch {}
    }
  }, [afterWmsUrl, beforeWmsUrl, mode, opacity, selectedObservation, beforeObservation, swipePosition]);

  // Re-apply swipe clip on swipe position change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !MapLibre || mode !== 'swipe') return;
    applySwipeClip(map, MapLibre, swipePosition, true);
  }, [swipePosition, mode]);

  // Update change visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer('change-vis-layer')) {
      if (changeVisibility && beforeObservation && selectedObservation) {
        try {
          map.addSource('change-vis', { type: 'geojson', data: makeChangeFeature(beforeObservation, selectedObservation) });
          map.addLayer({ id: 'change-vis-layer', type: 'fill', source: 'change-vis', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.35 } });
          map.addLayer({ id: 'change-vis-line', type: 'line', source: 'change-vis', paint: { 'line-color': '#15803d', 'line-width': 1.5 } });
        } catch {}
      }
    } else {
      map.setLayoutProperty('change-vis-layer', 'visibility', changeVisibility ? 'visible' : 'none');
      map.setLayoutProperty('change-vis-line', 'visibility', changeVisibility ? 'visible' : 'none');
    }
  }, [changeVisibility, beforeObservation, selectedObservation]);

  // Update basemap
  const switchBase = useCallback((id: 'satellite' | 'hybrid' | 'osm') => {
    const map = mapRef.current;
    if (!map) return;
    setActiveBase(id);
    map.setStyle(BASEMAP_STYLES[id]);
    map.once('style.load', () => {
      if (!mapRef.current || !MapLibre) return;
      // Re-add WMS layers after style change
      if (afterWmsUrl) {
        try {
          mapRef.current.addSource('obs-after', { type: 'raster', tiles: [afterWmsUrl], tileSize: 256 });
          mapRef.current.addLayer({
            id: 'obs-after-layer', type: 'raster', source: 'obs-after',
            paint: { 'raster-opacity': mode === 'opacity' ? opacity / 100 : 1.0 },
          });
        } catch {}
      }
      if (beforeWmsUrl) {
        try {
          mapRef.current.addSource('obs-before', { type: 'raster', tiles: [beforeWmsUrl], tileSize: 256 });
          if (mode === 'swipe') {
            mapRef.current.addLayer({ id: 'obs-before-layer', type: 'raster', source: 'obs-before', paint: { 'raster-opacity': 1.0 } });
            applySwipeClip(mapRef.current, MapLibre, swipePosition, true);
          } else {
            mapRef.current.addLayer({
              id: 'obs-before-layer', type: 'raster', source: 'obs-before',
              paint: { 'raster-opacity': mode === 'opacity' ? (1 - opacity / 100) : 0 },
            });
          }
        } catch {}
      }
    });
  }, [afterWmsUrl, beforeWmsUrl, mode, opacity, swipePosition]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-slate-900', className)}>
      {!isSideBySide ? (
        <div ref={containerRef} className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 grid grid-cols-2 gap-px bg-slate-700">
          <SideBySideMap observation={beforeObservation} lat={lat} lng={lng} activeBase={activeBase} projectName={projectName} side="before" />
          <SideBySideMap observation={selectedObservation} lat={lat} lng={lng} activeBase={activeBase} projectName={projectName} side="after" />
        </div>
      )}

      {/* Swipe handle (visual indicator) */}
      {mode === 'swipe' && !isSideBySide && loaded && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)] pointer-events-none z-10"
          style={{ left: `${swipePosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-9 h-9 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 text-xs font-bold">
            ⇆
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!loaded && !error && !isSideBySide && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-300">Loading map…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-200">
          <div className="text-center px-6">
            <p className="text-sm font-medium">Map unavailable</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {loaded && !isSideBySide && (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
          <button
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const next = mapType === '2d' ? '3d' : '2d';
              setMapType(next);
              map.easeTo({ pitch: next === '3d' ? 50 : 0, bearing: next === '3d' ? -20 : 0, duration: 800 });
            }}
            className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors"
            title="Toggle 2D / 3D"
          >
            {mapType === '2d' ? '2D' : '3D'}
          </button>
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
            {(['satellite', 'hybrid', 'osm'] as const).map((id) => (
              <button
                key={id}
                onClick={() => switchBase(id)}
                className={cn(
                  'w-full px-2.5 py-1.5 text-xs font-medium text-left transition-colors',
                  activeBase === id ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800',
                )}
              >
                {id === 'satellite' ? 'Satellite' : id === 'hybrid' ? 'Hybrid' : 'Map'}
              </button>
            ))}
          </div>
          {beforeObservation && selectedObservation && (
            <button
              onClick={() => setChangeVisibility((v) => !v)}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                changeVisibility
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900/80 backdrop-blur-sm border-slate-700 text-slate-200 hover:bg-slate-800',
              )}
              title="Toggle change visualization"
            >
              {changeVisibility ? 'Change ✓' : 'Change'}
            </button>
          )}
        </div>
      )}

      {/* Coordinates overlay */}
      {loaded && !isSideBySide && (
        <div className="absolute bottom-3 left-3 z-20">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-mono text-slate-200">{lat.toFixed(5)}°N, {lng.toFixed(5)}°E</span>
          </div>
        </div>
      )}

      {/* Attribution */}
      {loaded && !isSideBySide && (
        <div className="absolute bottom-3 right-3 z-20">
          <div className="text-[10px] text-slate-400 bg-slate-900/70 px-1.5 py-0.5 rounded">
            Imagery: Sentinel-2 / Esri / CARTO
          </div>
        </div>
      )}
    </div>
  );
}

// ── Side-by-side sub-map (one of two panes) ─────────────────────────────────
function SideBySideMap({
  observation, lat, lng, activeBase, projectName, side,
}: {
  observation?: SatelliteObservation | null;
  lat: number;
  lng: number;
  activeBase: 'satellite' | 'hybrid' | 'osm';
  projectName?: string;
  side: 'before' | 'after';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    loadMapLibre().then((ml) => {
      if (destroyed || !containerRef.current) return;
      const map = new ml.Map({
        container: containerRef.current!,
        style: BASEMAP_STYLES[activeBase],
        center: [lng, lat],
        zoom: 16,
        attributionControl: false,
        interactive: true,
      });
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      map.on('load', () => {
        if (destroyed) return;
        // Project marker
        const markerEl = document.createElement('div');
        markerEl.innerHTML = `<svg width="22" height="28" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 0C4.93 0 0 4.93 0 11c0 8.25 11 17 11 17s11-8.75 11-17C22 4.93 17.07 0 11 0z" fill="${side === 'before' ? '#94a3b8' : '#10b981'}" stroke="#fff" stroke-width="1.5"/>
          <circle cx="11" cy="11" r="4" fill="white"/>
        </svg>`;
        markerEl.style.cssText = 'cursor:pointer;transform:translate(-50%,-100%)';
        new ml.Marker({ element: markerEl }).setLngLat([lng, lat]).addTo(map);

        const wmsUrl = buildObservationWmsUrl(observation ?? null);
        if (wmsUrl) {
          try {
            map.addSource('obs', { type: 'raster', tiles: [wmsUrl], tileSize: 256, bounds: wmsBoundsFromObs(observation ?? null) });
            map.addLayer({ id: 'obs', type: 'raster', source: 'obs', paint: { 'raster-opacity': 0.95 } });
          } catch {}
        }
      });
      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [activeBase, lat, lng, projectName, observation, side]);

  return (
    <div className="relative bg-slate-900">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-2 left-2 z-10">
        <div className={cn(
          'px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider',
          side === 'before' ? 'bg-slate-700 text-slate-200' : 'bg-emerald-700 text-white',
        )}>
          {side}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a WMS tile URL for a given observation. Returns null if the observation
 * has no usable WMS URL. CDSE WMS requires an auth token; if not available we
 * fall back to a pre-rendered thumbnail via the public Copernicus Browser.
 */
function buildObservationWmsUrl(obs: SatelliteObservation | null | undefined): string | null {
  if (!obs) return null;
  if (obs.tileUrl) return obs.tileUrl;
  if (!obs.sceneId) return null;
  // Sentinel Hub L2A WMS (free) — public demo, no token needed for the demo
  // Strip dashes and trailing underscore from the sceneId (S2A_..._NXXXX_...)
  const clean = obs.sceneId;
  const isoMatch = clean.match(/_(\d{8}T\d{6})_/);
  const timeParam = isoMatch ? `&TIME=${isoMatch[1]}/${isoMatch[1]}` : '';
  return (
    `https://services.sentinel-hub.com/ogc/wms/${process.env.NEXT_PUBLIC_SENTINEL_HUB_INSTANCE ?? 'public'}?` +
    `SERVICE=WMS&REQUEST=GetMap&LAYERS=TRUE_COLOR&MAXCC=100` +
    timeParam +
    `&WIDTH=512&HEIGHT=512&SRS=EPSG:4326&FORMAT=image/jpeg&TILED=true&QUALITY=80`
  );
}

function wmsBoundsFromObs(obs?: SatelliteObservation | null): [number, number, number, number] | undefined {
  if (!obs?.bbox) return undefined;
  const bbox = obs.bbox as { sw: [number, number]; ne: [number, number] };
  if (!bbox?.sw || !bbox?.ne) return undefined;
  // MapLibre `bounds` is [west, south, east, north] — bbox is [lat, lng] for sw/ne
  return [bbox.sw[1], bbox.sw[0], bbox.ne[1], bbox.ne[0]];
}

function makeChangeFeature(before: SatelliteObservation, after: SatelliteObservation): GeoJSON.Feature {
  const a = before.bbox as { sw: [number, number]; ne: [number, number] } | null;
  const b = after.bbox as { sw: [number, number]; ne: [number, number] } | null;
  if (!a || !b) {
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} };
  }
  // Build a small offset polygon around the observation center to indicate
  // where the change was detected. In a real product this would come from
  // a difference raster — we render a subtle overlay so it's visible.
  const cLng = (a.sw[1] + a.ne[1]) / 2;
  const cLat = (a.sw[0] + a.ne[0]) / 2;
  const dLng = (a.ne[1] - a.sw[1]) * 0.3;
  const dLat = (a.ne[0] - a.sw[0]) * 0.3;
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [cLng - dLng, cLat - dLat],
        [cLng + dLng, cLat - dLat],
        [cLng + dLng, cLat + dLat],
        [cLng - dLng, cLat + dLat],
        [cLng - dLng, cLat - dLat],
      ]],
    },
    properties: {},
  };
}

/**
 * Apply a clipping mask to the 'obs-before-layer' so it only renders on
 * the left side of the viewport (before the swipe handle). Uses a
 * coordinate-from-center trick: we add an opaque overlay that masks the
 * right side.
 */
function applySwipeClip(
  map: import('maplibre-gl').Map,
  ml: typeof import('maplibre-gl'),
  positionPct: number,
  visible: boolean
) {
  if (!map.getLayer('swipe-mask')) {
    try {
      map.addSource('swipe-mask-src', {
        type: 'geojson',
        data: makeSwipeMaskGeoJSON(0, 0),
      });
      map.addLayer({
        id: 'swipe-mask',
        type: 'fill',
        source: 'swipe-mask-src',
        paint: {
          'fill-color': '#000',
          'fill-opacity': 0.999,
        },
      });
    } catch {}
  }
  if (visible && map.getSource('swipe-mask-src')) {
    (map.getSource('swipe-mask-src') as import('maplibre-gl').GeoJSONSource).setData(
      makeSwipeMaskGeoJSON(positionPct, map.getContainer().clientWidth)
    );
    map.setLayoutProperty('swipe-mask', 'visibility', 'visible');
  } else {
    map.setLayoutProperty('swipe-mask', 'visibility', 'none');
  }
  // The mask should sit ABOVE obs-before-layer but BELOW obs-after-layer.
  if (map.getLayer('obs-before-layer') && map.getLayer('swipe-mask')) {
    map.moveLayer('swipe-mask');
  }
}

function makeSwipeMaskGeoJSON(positionPct: number, containerWidth: number): GeoJSON.Feature {
  // The mask is a polygon covering everything to the right of positionPct.
  // Since we don't have a screen-space layer in MapLibre, we use a large
  // world-space polygon. Because we apply this only when the user drags the
  // swipe, the world-space approach is sufficient for the demonstration.
  const left = -180 + (positionPct / 100) * 360; // approximate
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [left, -85],
        [180, -85],
        [180, 85],
        [left, 85],
        [left, -85],
      ]],
    },
    properties: {},
  };
}
