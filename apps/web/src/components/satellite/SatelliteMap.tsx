'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SatelliteObservation } from '@vojas/api-client';
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

export interface MapLayer {
  id: string;
  label: string;
  type: 'base' | 'overlay';
}

const LAYERS: MapLayer[] = [
  { id: 'osm', label: 'Map', type: 'base' },
  { id: 'satellite', label: 'Satellite', type: 'base' },
  { id: 'hybrid', label: 'Hybrid', type: 'base' },
  { id: 'earth-obs', label: 'Earth Observation', type: 'overlay' },
];

interface ProjectMapProps {
  lat: number;
  lng: number;
  observation?: SatelliteObservation | null;
  projectName?: string;
  className?: string;
  onMapReady?: (map: unknown) => void;
}

export function ProjectMap({ lat, lng, observation, projectName, className }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const [activeBase, setActiveBase] = useState('osm');
  const [overlayActive, setOverlayActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;

    loadMapLibre()
      .then((ml) => {
        if (destroyed || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current!,
          style: activeBase === 'osm' ? {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
                tileSize: 256,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
              },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          } : activeBase === 'satellite' ? {
            version: 8,
            sources: {
              esri: {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'],
                tileSize: 256,
                attribution: '© Esri',
              },
            },
            layers: [{ id: 'esri-sat', type: 'raster', source: 'esri' }],
          } : {
            version: 8,
            sources: {
              esri: {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'],
                tileSize: 256,
              },
              labels: {
                type: 'raster',
                tiles: ['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png'],
                tileSize: 256,
              },
            },
            layers: [
              { id: 'esri-sat', type: 'raster', source: 'esri' },
              { id: 'labels', type: 'raster', source: 'labels' },
            ],
          },
          center: [lng, lat],
          zoom: 15,
          pitch: mapType === '3d' ? 45 : 0,
          bearing: mapType === '3d' ? -17.6 : 0,
        });

        map.on('load', () => {
          if (destroyed) return;
          setLoaded(true);

          // Add project marker
          const markerEl = document.createElement('div');
          markerEl.className = 'vojas-map-marker';
          markerEl.innerHTML = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#2563EB"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
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

          // Observation footprint
          if (observation?.bbox) {
            const bbox = observation.bbox as { sw: [number, number]; ne: [number, number] } | null;
            if (bbox?.sw && bbox?.ne) {
              try {
                map.addSource('obs-footprint', {
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
                  id: 'obs-footprint-fill',
                  type: 'fill',
                  source: 'obs-footprint',
                  paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 },
                });
                map.addLayer({
                  id: 'obs-footprint-line',
                  type: 'line',
                  source: 'obs-footprint',
                  paint: { 'line-color': '#3b82f6', 'line-width': 1.5 },
                });
              } catch {
                // ignore
              }
            }
          }
        });

        mapRef.current = map;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load map');
      });

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update basemap when toggled
  const switchBase = useCallback((id: string) => {
    const map = mapRef.current;
    if (!map || !MapLibre) return;
    setActiveBase(id);
    let newStyle: import('maplibre-gl').StyleSpecification;
    if (id === 'osm') {
      newStyle = {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'], tileSize: 256 } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      };
    } else if (id === 'satellite') {
      newStyle = {
        version: 8,
        sources: { esri: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'], tileSize: 256 } },
        layers: [{ id: 'esri-sat', type: 'raster', source: 'esri' }],
      };
    } else {
      newStyle = {
        version: 8,
        sources: {
          esri: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'], tileSize: 256 },
          labels: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png'], tileSize: 256 },
        },
        layers: [
          { id: 'esri-sat', type: 'raster', source: 'esri' },
          { id: 'labels', type: 'raster', source: 'labels' },
        ],
      };
    }
    map.setStyle(newStyle);
    map.once('style.load', () => {
      if (!map || !MapLibre) return;
      const markerEl = document.createElement('div');
      markerEl.innerHTML = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none"><path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#2563EB"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`;
      new MapLibre!.Marker({ element: markerEl }).setLngLat([lng, lat]).addTo(map);
    });
  }, [lat, lng, projectName]);

  return (
    <div className={cn('relative', className)}>
      {/* Map container */}
      <div ref={containerRef} className="w-full h-full min-h-[320px] rounded-xl overflow-hidden bg-slate-100" />

      {/* Loading overlay */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Loading map…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
          <div className="text-center px-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-sm text-slate-600 font-medium">Map unavailable</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {loaded && (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {/* 2D/3D toggle */}
          <button
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const next = mapType === '2d' ? '3d' : '2d';
              setMapType(next);
              map.easeTo({ pitch: next === '3d' ? 45 : 0, bearing: next === '3d' ? -17.6 : 0, duration: 800 });
            }}
            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors"
            title="Toggle 2D / 3D view"
          >
            {mapType === '2d' ? '2D' : '3D'}
          </button>
          {/* Layer selector */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {LAYERS.filter(l => l.type === 'base').map((layer) => (
              <button
                key={layer.id}
                onClick={() => switchBase(layer.id)}
                className={cn(
                  'w-full px-2.5 py-1.5 text-xs font-medium text-left transition-colors',
                  activeBase === layer.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coordinates overlay */}
      {loaded && (
        <div className="absolute bottom-3 left-3">
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-xs font-mono text-slate-600">{lat.toFixed(5)}°N, {lng.toFixed(5)}°E</span>
          </div>
        </div>
      )}

      {/* Attribution */}
      {loaded && (
        <div className="absolute bottom-3 right-3">
          <div className="text-[10px] text-slate-400 bg-white/70 px-1.5 py-0.5 rounded">
            © OpenStreetMap contributors, CARTO, Esri
          </div>
        </div>
      )}
    </div>
  );
}
