'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertTriangle, Crosshair, Sparkles } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapToolbar, BasemapMode, MapLayerState } from './MapToolbar';
import { SelectedLocationInspector, InspectedEntity } from './SelectedLocationInspector';

let MapLibre: typeof import('maplibre-gl') | null = null;

async function loadMapLibre() {
  if (MapLibre) return MapLibre;
  MapLibre = await import('maplibre-gl');
  return MapLibre;
}

const BASEMAP_TILES: Record<BasemapMode, { tiles: string[]; attribution: string }> = {
  satellite: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© Esri, Maxar, Earthstar Geographics'
  },
  tactical: {
    tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap, © CARTO'
  },
  streets: {
    tiles: [
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
    ],
    attribution: '© OpenStreetMap contributors'
  },
  hybrid: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© Esri, Maxar'
  }
};

export interface MapProjectItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  district?: string;
  state?: string;
  constituency?: string;
  sanctionedAmount?: number;
  expenditure?: number;
  status?: string;
  contractorName?: string;
}

export interface MapRiskFindingItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  district?: string;
  description?: string;
  projectId?: string;
}

export interface MapCitizenSignalItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  status: string;
  district?: string;
  description?: string;
}

export interface MapSatelliteObservationItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  observationDate?: string;
  ndvi?: number;
  ndbi?: number;
  changeScore?: number;
  district?: string;
}

export interface InteractiveGisMapProps {
  projects?: MapProjectItem[];
  riskFindings?: MapRiskFindingItem[];
  citizenSignals?: MapCitizenSignalItem[];
  satelliteObservations?: MapSatelliteObservationItem[];
  initialSelectedId?: string;
  heightClass?: string;
  className?: string;
  onOpenAiExplain?: (entity: InspectedEntity) => void;
}

export const InteractiveGisMap: React.FC<InteractiveGisMapProps> = ({
  projects = [],
  riskFindings = [],
  citizenSignals = [],
  satelliteObservations = [],
  initialSelectedId,
  heightClass = 'h-[620px]',
  className = '',
  onOpenAiExplain
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  const rootContainerRef = useRef<HTMLDivElement>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<InspectedEntity | null>(null);

  const [layers, setLayers] = useState<MapLayerState>({
    projects: true,
    riskFindings: true,
    satelliteEvidence: true,
    citizenSignals: false,
    boundaries: true
  });

  const toggleLayer = useCallback((layerKey: keyof MapLayerState) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadMapLibre()
      .then((ml) => {
        if (cancelled || !containerRef.current) return;

        const tileConfig = BASEMAP_TILES[basemap];
        const map = new ml.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              basemap: {
                type: 'raster',
                tiles: tileConfig.tiles,
                tileSize: 256,
                attribution: tileConfig.attribution
              }
            },
            layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
          },
          center: [78.9629, 22.5937], // Center of India
          zoom: 4.5,
          minZoom: 3,
          maxZoom: 18
        });

        map.addControl(new ml.NavigationControl({ showCompass: true }), 'bottom-right');

        map.once('load', () => {
          if (!cancelled) setMapReady(true);
        });

        map.on('error', (e) => {
          if (!cancelled) setLoadError(e.error?.message ?? 'Map load error');
        });

        mapRef.current = map;
      })
      .catch((err) => {
        if (!cancelled) setLoadError('Could not load WebGL map engine');
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Switch basemaps dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const tileConfig = BASEMAP_TILES[basemap];
    const source = map.getSource('basemap') as import('maplibre-gl').RasterTileSource | undefined;

    if (source) {
      map.setStyle({
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: tileConfig.tiles,
            tileSize: 256,
            attribution: tileConfig.attribution
          }
        },
        layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
      });
    }
  }, [basemap, mapReady]);

  // Sync Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !MapLibre) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const newMarkers: import('maplibre-gl').Marker[] = [];

    // 1. Projects Markers
    if (layers.projects) {
      projects.forEach((p) => {
        if (p.latitude == null || p.longitude == null || isNaN(p.latitude) || isNaN(p.longitude)) return;

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer';
        el.innerHTML = `
          <div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center transition-transform hover:scale-150 hover:z-30">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        `;

        el.addEventListener('click', () => {
          const inspected: InspectedEntity = {
            id: p.id,
            type: 'project',
            title: p.title,
            district: p.district,
            state: p.state,
            constituency: p.constituency,
            coordinates: { lat: p.latitude, lng: p.longitude },
            sanctionedAmount: p.sanctionedAmount,
            expenditure: p.expenditure,
            status: p.status,
            contractorName: p.contractorName
          };
          setSelectedEntity(inspected);
          map.flyTo({ center: [p.longitude, p.latitude], zoom: Math.max(map.getZoom(), 12) });
        });

        const marker = new MapLibre!.Marker({ element: el })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map);

        newMarkers.push(marker);
      });
    }

    // 2. Risk Findings Markers
    if (layers.riskFindings) {
      riskFindings.forEach((rf) => {
        if (rf.latitude == null || rf.longitude == null || isNaN(rf.latitude) || isNaN(rf.longitude)) return;

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer';
        const color = rf.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-amber-500';
        el.innerHTML = `
          <div class="relative w-5 h-5 flex items-center justify-center transition-transform hover:scale-150 hover:z-40">
            <div class="absolute inset-0 rounded-full ${color} opacity-40 animate-ping"></div>
            <div class="w-4 h-4 rounded-full ${color} border-2 border-white shadow-xl flex items-center justify-center text-white">
              <span style="font-size: 8px; font-weight: bold;">!</span>
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          const inspected: InspectedEntity = {
            id: rf.id,
            type: 'riskFinding',
            title: rf.title,
            district: rf.district,
            coordinates: { lat: rf.latitude, lng: rf.longitude },
            riskLevel: rf.severity,
            description: rf.description
          };
          setSelectedEntity(inspected);
          map.flyTo({ center: [rf.longitude, rf.latitude], zoom: Math.max(map.getZoom(), 13) });
        });

        const marker = new MapLibre!.Marker({ element: el })
          .setLngLat([rf.longitude, rf.latitude])
          .addTo(map);

        newMarkers.push(marker);
      });
    }

    // 3. Satellite Observation Markers
    if (layers.satelliteEvidence) {
      satelliteObservations.forEach((so) => {
        if (so.latitude == null || so.longitude == null || isNaN(so.latitude) || isNaN(so.longitude)) return;

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer';
        el.innerHTML = `
          <div class="w-4 h-4 rounded-lg bg-cyan-500 border-2 border-slate-900 shadow-lg flex items-center justify-center transition-transform hover:scale-150 hover:z-30">
            <div class="w-1.5 h-1.5 rounded-sm bg-white"></div>
          </div>
        `;

        el.addEventListener('click', () => {
          const inspected: InspectedEntity = {
            id: so.id,
            type: 'satelliteObservation',
            title: so.title,
            district: so.district,
            coordinates: { lat: so.latitude, lng: so.longitude },
            spectralMetrics: {
              ndvi: so.ndvi,
              ndbi: so.ndbi,
              changeScore: so.changeScore,
              observationDate: so.observationDate
            }
          };
          setSelectedEntity(inspected);
          map.flyTo({ center: [so.longitude, so.latitude], zoom: Math.max(map.getZoom(), 13) });
        });

        const marker = new MapLibre!.Marker({ element: el })
          .setLngLat([so.longitude, so.latitude])
          .addTo(map);

        newMarkers.push(marker);
      });
    }

    // 4. Citizen Signals Markers
    if (layers.citizenSignals) {
      citizenSignals.forEach((cs) => {
        if (cs.latitude == null || cs.longitude == null || isNaN(cs.latitude) || isNaN(cs.longitude)) return;

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer';
        el.innerHTML = `
          <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-lg transition-transform hover:scale-150 hover:z-30"></div>
        `;

        el.addEventListener('click', () => {
          const inspected: InspectedEntity = {
            id: cs.id,
            type: 'citizenSignal',
            title: cs.title,
            district: cs.district,
            coordinates: { lat: cs.latitude, lng: cs.longitude },
            description: cs.description,
            status: cs.status
          };
          setSelectedEntity(inspected);
          map.flyTo({ center: [cs.longitude, cs.latitude], zoom: Math.max(map.getZoom(), 13) });
        });

        const marker = new MapLibre!.Marker({ element: el })
          .setLngLat([cs.longitude, cs.latitude])
          .addTo(map);

        newMarkers.push(marker);
      });
    }

    markersRef.current = newMarkers;

    // Focus on initialSelectedId if provided
    if (initialSelectedId) {
      const targetProject = projects.find((p) => p.id === initialSelectedId);
      if (targetProject && targetProject.latitude != null && targetProject.longitude != null) {
        map.flyTo({ center: [targetProject.longitude, targetProject.latitude], zoom: 14 });
      }
    }
  }, [layers, projects, riskFindings, citizenSignals, satelliteObservations, mapReady, initialSelectedId]);

  // View controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetView = () => {
    mapRef.current?.flyTo({ center: [78.9629, 22.5937], zoom: 4.5 });
  };

  const handleToggleFullscreen = () => {
    if (!rootContainerRef.current) return;
    if (!document.fullscreenElement) {
      rootContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={rootContainerRef}
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col ${className}`}
    >
      {/* Floating Tactical Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-auto">
        <MapToolbar
          basemap={basemap}
          onBasemapChange={setBasemap}
          layers={layers}
          onToggleLayer={toggleLayer}
          layerCounts={{
            projects: projects.length,
            riskFindings: riskFindings.length,
            satelliteEvidence: satelliteObservations.length,
            citizenSignals: citizenSignals.length
          }}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>

      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapReady && !loadError && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="font-mono text-xs text-slate-300">INITIALIZING TACTICAL GIS ENGINE...</p>
        </div>
      )}

      {/* Error Overlay */}
      {loadError && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-2 z-20 p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="font-semibold text-sm text-red-300">Geospatial Canvas Error</p>
          <p className="font-mono text-xs text-slate-400">{loadError}</p>
        </div>
      )}

      {/* Selected Location Inspector Overlay */}
      {selectedEntity && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-auto max-w-full">
          <SelectedLocationInspector
            entity={selectedEntity}
            onClose={() => setSelectedEntity(null)}
            onOpenAiExplain={onOpenAiExplain}
          />
        </div>
      )}
    </div>
  );
};
