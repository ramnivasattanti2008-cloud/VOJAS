'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Layers, Maximize2, Minimize2, RotateCcw, Satellite, Compass, Eye, ShieldAlert } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
import 'maplibre-gl/dist/maplibre-gl.css';

// Dynamic loader for MapLibre to avoid WebGL / window references in SSR
let MapLibreModule: typeof import('maplibre-gl') | null = null;
async function getMapLibre() {
  if (MapLibreModule) return MapLibreModule;
  MapLibreModule = await import('maplibre-gl');
  return MapLibreModule;
}

export type BasemapMode = 'satellite' | 'hybrid' | 'streets' | 'dark';

export interface MapProjectItem {
  id: string;
  name: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  approvedAmount?: number | null;
  state?: string | null;
  district?: string | null;
  sector?: string | null;
  riskLevel?: string | null;
  hasSatellite?: boolean;
}

interface UnifiedMapProps {
  projects: MapProjectItem[];
  className?: string;
  height?: string | number;
  focusProjectId?: string;
  selectedProjectId?: string | null;
  onSelectProject?: (project: MapProjectItem | null) => void;
  publicMode?: boolean;
  defaultBasemap?: BasemapMode;
  showLayerControls?: boolean;
}

const BASEMAP_CONFIGS: Record<BasemapMode, { name: string; style: any }> = {
  hybrid: {
    name: 'Hybrid Satellite',
    style: {
      version: 8,
      sources: {
        esri: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'],
          tileSize: 256,
          attribution: '© Esri',
          maxzoom: 19,
        },
        carto_labels: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png'],
          tileSize: 256,
          maxzoom: 19,
        },
      },
      layers: [
        { id: 'esri-layer', type: 'raster', source: 'esri' },
        { id: 'labels-layer', type: 'raster', source: 'carto_labels' },
      ],
    },
  },
  satellite: {
    name: 'Satellite',
    style: {
      version: 8,
      sources: {
        esri: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}@2x'],
          tileSize: 256,
          attribution: '© Esri World Imagery',
          maxzoom: 19,
        },
      },
      layers: [{ id: 'esri-layer', type: 'raster', source: 'esri' }],
    },
  },
  streets: {
    name: 'Civic Street',
    style: {
      version: 8,
      sources: {
        carto_light: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, © CARTO',
          maxzoom: 19,
        },
      },
      layers: [{ id: 'carto-light-layer', type: 'raster', source: 'carto_light' }],
    },
  },
  dark: {
    name: 'Tactical Dark',
    style: {
      version: 8,
      sources: {
        carto_dark: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors, © CARTO',
          maxzoom: 19,
        },
      },
      layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto_dark' }],
    },
  },
};

const STATUS_PALETTE: Record<string, string> = {
  COMPLETED: '#10b981', // green
  VERIFIED: '#059669',
  IN_PROGRESS: '#3b82f6', // blue
  APPROVED: '#8b5cf6', // purple
  SANCTIONED: '#6366f1',
  CANCELLED: '#ef4444', // red
  UNSANCTIONED: '#f59e0b', // amber
  PROPOSED: '#94a3b8', // slate
};

const INDIA_CENTER: [number, number] = [78.9629, 22.5937];
const DEFAULT_ZOOM = 4.3;

export function UnifiedMap({
  projects,
  className,
  height = '580px',
  focusProjectId,
  selectedProjectId,
  onSelectProject,
  publicMode = false,
  defaultBasemap = 'hybrid',
  showLayerControls = true,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const popupRef = useRef<import('maplibre-gl').Popup | null>(null);
  const isMountedRef = useRef(true);

  const [basemap, setBasemap] = useState<BasemapMode>(defaultBasemap);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [onlyHighRisk, setOnlyHighRisk] = useState(false);

  // Filter projects with real coordinates
  const validProjects = projects.filter((p) => {
    if (!p.latitude || !p.longitude) return false;
    if (isNaN(p.latitude) || isNaN(p.longitude)) return false;
    if (onlyHighRisk && p.riskLevel !== 'HIGH' && p.riskLevel !== 'CRITICAL') return false;
    return true;
  });

  // Convert valid projects to GeoJSON FeatureCollection
  const toGeoJSON = useCallback((items: MapProjectItem[]) => {
    return {
      type: 'FeatureCollection',
      features: items.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.longitude!, p.latitude!],
        },
        properties: {
          id: p.id,
          name: p.name,
          status: p.status,
          approvedAmount: p.approvedAmount ?? 0,
          state: p.state ?? '',
          district: p.district ?? '',
          sector: p.sector ?? '',
          riskLevel: p.riskLevel ?? '',
          color: STATUS_PALETTE[p.status] ?? '#3b82f6',
        },
      })),
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    isMountedRef.current = true;

    getMapLibre().then((ml) => {
      if (!isMountedRef.current || !containerRef.current) return;

      const map = new ml.Map({
        container: containerRef.current,
        style: BASEMAP_CONFIGS[basemap].style,
        center: INDIA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 3,
        maxZoom: 18,
      });

      map.addControl(new ml.NavigationControl({ showCompass: true }), 'top-right');

      map.on('load', () => {
        if (!isMountedRef.current) return;

        // Add clustered GeoJSON source
        map.addSource('projects-source', {
          type: 'geojson',
          data: toGeoJSON(validProjects) as any,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // 1. Cluster circles
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'projects-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#3b82f6', // blue < 10
              10,
              '#8b5cf6', // purple < 50
              50,
              '#f59e0b', // amber < 100
              100,
              '#ef4444', // red >= 100
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              18,
              10,
              22,
              50,
              28,
              100,
              34,
            ],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        // 2. Cluster count text
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'projects-source',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });

        // 3. Unclustered individual points
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'projects-source',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 1,
            'circle-opacity': 0.95,
          },
        });

        // Click on cluster: zoom in
        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0]?.properties?.cluster_id;
          if (clusterId == null) return;

          const source = map.getSource('projects-source') as any;
          source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: Math.min(zoom + 0.5, 16),
              duration: 500,
            });
          });
        });

        // Hover cursor pointer
        map.on('mouseenter', 'clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters', () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'unclustered-point', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'unclustered-point', () => {
          map.getCanvas().style.cursor = '';
        });

        // Click on single project: show popup
        map.on('click', 'unclustered-point', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
          if (!features.length) return;

          const feat = features[0];
          const coords = (feat.geometry as any).coordinates.slice();
          const props = feat.properties as any;

          const detailHref = publicMode ? `/explore/${props.id}` : `/projects/${props.id}`;
          const timeMachineHref = `/projects/${props.id}/time-machine`;
          const amountFormatted = props.approvedAmount
            ? formatCurrency(Number(props.approvedAmount))
            : 'Amount not specified';

          const statusColor = props.color || '#3b82f6';
          const statusText = (props.status || 'UNKNOWN').replace(/_/g, ' ');

          popupRef.current?.remove();
          popupRef.current = new ml.Popup({ offset: 14, maxWidth: '320px', closeButton: true })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px;color:#0f172a">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:6px">
                  <span style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:2px 8px;border-radius:9999px;background-color:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40">
                    ${escapeHtml(statusText)}
                  </span>
                  <span style="font-size:11px;font-weight:700;color:#059669">
                    ${amountFormatted}
                  </span>
                </div>
                <h4 style="font-size:13px;font-weight:700;line-height:1.35;margin:0 0 6px 0;color:#0f172a">
                  ${escapeHtml(props.name)}
                </h4>
                <div style="font-size:11px;color:#64748b;margin-bottom:10px;display:flex;flex-direction:column;gap:2px">
                  ${props.district || props.state ? `<span>📍 ${escapeHtml([props.district, props.state].filter(Boolean).join(', '))}</span>` : ''}
                  ${props.sector ? `<span>📂 Sector: ${escapeHtml(props.sector.replace(/_/g, ' '))}</span>` : ''}
                  ${props.riskLevel ? `<span style="color:${props.riskLevel === 'HIGH' || props.riskLevel === 'CRITICAL' ? '#ef4444' : '#64748b'}">⚠️ Risk: ${escapeHtml(props.riskLevel)}</span>` : ''}
                </div>
                <div style="display:flex;gap:6px;padding-top:6px;border-top:1px solid #e2e8f0">
                  <a href="${detailHref}" style="flex:1;text-align:center;padding:6px 10px;background:#2563eb;color:#ffffff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">
                    View Project
                  </a>
                  <a href="${timeMachineHref}" style="padding:6px 10px;background:#f1f5f9;color:#0f172a;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;border:1px solid #cbd5e1" title="Satellite Time Machine">
                    🛰️ Timeline
                  </a>
                </div>
              </div>
            `)
            .addTo(map);

          if (onSelectProject) {
            const matched = projects.find((p) => p.id === props.id);
            if (matched) onSelectProject(matched);
          }
        });

        setMapLoaded(true);
      });

      mapRef.current = map;
    });

    return () => {
      isMountedRef.current = false;
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update source data when projects or risk filter change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource('projects-source') as any;
    if (source) {
      source.setData(toGeoJSON(validProjects));
    }
  }, [validProjects, mapLoaded, toGeoJSON]);

  // Handle Basemap Switch
  const switchBasemap = useCallback(
    (newMode: BasemapMode) => {
      setBasemap(newMode);
      const map = mapRef.current;
      if (!map) return;

      const style = BASEMAP_CONFIGS[newMode].style;
      map.setStyle(style);

      // Re-add sources and layers after style changes
      map.once('style.load', () => {
        if (!mapRef.current) return;

        map.addSource('projects-source', {
          type: 'geojson',
          data: toGeoJSON(validProjects) as any,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'projects-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#3b82f6',
              10,
              '#8b5cf6',
              50,
              '#f59e0b',
              100,
              '#ef4444',
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              18,
              10,
              22,
              50,
              28,
              100,
              34,
            ],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'projects-source',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });

        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'projects-source',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 1,
            'circle-opacity': 0.95,
          },
        });
      });
    },
    [validProjects, toGeoJSON]
  );

  // Reset India View
  const handleResetView = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: INDIA_CENTER,
      zoom: DEFAULT_ZOOM,
      essential: true,
      duration: 1000,
    });
  }, []);

  // Focus Project if requested
  useEffect(() => {
    const targetId = focusProjectId || selectedProjectId;
    if (!targetId || !mapRef.current || !mapLoaded) return;

    const project = projects.find((p) => p.id === targetId);
    if (project?.latitude && project?.longitude) {
      mapRef.current.flyTo({
        center: [project.longitude, project.latitude],
        zoom: 13,
        duration: 1200,
      });
    }
  }, [focusProjectId, selectedProjectId, projects, mapLoaded]);

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm transition-all',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-none',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Control Bar: Top Left */}
      {showLayerControls && (
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
          {/* Basemap Switcher */}
          <div className="bg-white/90 backdrop-blur-md p-1 rounded-lg shadow-md border border-slate-200/80 flex items-center gap-1 text-xs">
            <button
              onClick={() => switchBasemap('hybrid')}
              className={cn(
                'px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                basemap === 'hybrid'
                  ? 'bg-vojas-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Satellite className="h-3.5 w-3.5" />
              <span>Hybrid</span>
            </button>
            <button
              onClick={() => switchBasemap('satellite')}
              className={cn(
                'px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                basemap === 'satellite'
                  ? 'bg-vojas-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => switchBasemap('streets')}
              className={cn(
                'px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                basemap === 'streets'
                  ? 'bg-vojas-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Streets</span>
            </button>
            <button
              onClick={() => switchBasemap('dark')}
              className={cn(
                'px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                basemap === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <span>Dark</span>
            </button>
          </div>

          {/* High-Risk Quick Toggle */}
          <button
            onClick={() => setOnlyHighRisk(!onlyHighRisk)}
            className={cn(
              'self-start px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md backdrop-blur-md border transition-all flex items-center gap-1.5 cursor-pointer',
              onlyHighRisk
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-white/90 text-slate-700 border-slate-200/80 hover:bg-white'
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            <span>{onlyHighRisk ? 'Showing High Risk Only' : 'Filter High Risk'}</span>
          </button>
        </div>
      )}

      {/* Floating Action Buttons: Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleResetView}
          title="Reset to India View"
          className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-md backdrop-blur-md border border-slate-200/80 transition-all hover:scale-105 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-md backdrop-blur-md border border-slate-200/80 transition-all hover:scale-105 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Floating Legend / Stats Pill: Bottom Right */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200/80 px-3 py-2 text-xs text-slate-700 pointer-events-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>{validProjects.length} Mapped Works</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 pl-3">
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Approved
          </span>
        </div>
      </div>
    </div>
  );
}
