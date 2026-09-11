import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Compass, 
  Maximize2, 
  Crosshair, 
  Search, 
  Satellite, 
  Layers, 
  MapPin, 
  AlertTriangle, 
  Sparkles, 
  Eye, 
  ShieldAlert,
  Building2,
  FileText
} from 'lucide-react';
import { MapToolbar, BasemapMode, LayerState } from './MapToolbar';
import { SelectedLocationInspector } from './SelectedLocationInspector';
import { ALL_PROJECTS, ALL_ALERTS, ALL_CITIZEN_REPORTS, ALL_CHANGE_EVENTS } from '../../data/mockData';
import { ViewType } from '../layout/TacticalSidebar';

interface InteractiveGisMapProps {
  onNavigate: (view: ViewType, id?: string) => void;
  initialSelectedId?: string;
  heightClass?: string;
  showInspector?: boolean;
}

export const InteractiveGisMap: React.FC<InteractiveGisMapProps> = ({
  onNavigate,
  initialSelectedId = 'CS-1042',
  heightClass = 'h-[calc(100vh-8rem)]',
  showInspector = true
}) => {
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');
  const [zoomLevel, setZoomLevel] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(showInspector);

  // Layers state
  const [layers, setLayers] = useState<LayerState>({
    projects: true,
    risks: true,
    changes: true,
    reports: true,
    infrastructure: true,
    boundaries: true
  });

  // Selected item state (default to Bengaluru Corridor)
  const [selectedEntity, setSelectedEntity] = useState({
    id: 'CS-1042',
    name: 'Bellandur-ORR Corridor Anomaly',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: { lat: 12.9352, lng: 77.6946 },
    riskLevel: 'CRITICAL' as 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW',
    changeDetected: true,
    lastDate: '08 Sep 2026',
    prevDate: '31 Aug 2026',
    confidence: 94
  });

  const toggleLayer = (layerKey: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 1, 8));
  const handleResetView = () => setZoomLevel(14);

  // Determine basemap texture/gradient
  const getBasemapStyle = () => {
    if (basemap === 'satellite') {
      return 'bg-[#060c14] bg-radial-gradient';
    } else if (basemap === 'hybrid') {
      return 'bg-[#09101d]';
    } else {
      return 'bg-[#080d1a]';
    }
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-xl border border-tactical-800 bg-tactical-950 overflow-hidden shadow-2xl flex flex-col justify-between select-none`}>
      
      {/* Basemap Canvas Simulation */}
      <div className={`absolute inset-0 ${getBasemapStyle()} transition-colors duration-500 overflow-hidden`}>
        
        {/* Vector Grid & Coordinate Lines */}
        <div className="absolute inset-0 tactical-grid opacity-50 pointer-events-none" />
        
        {/* Subtle satellite tile texture simulation */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Dynamic Satellite Sensor Footprint Grid / Center Reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-intel-cyan/15 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-intel-cyan/20 pointer-events-none" />
        
        {/* Center Target Crosshairs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
          <div className="w-12 h-px bg-intel-cyan -translate-y-1/2" />
          <div className="h-12 w-px bg-intel-cyan -translate-x-1/2 -mt-6 ml-6" />
        </div>

        {/* GIS Vector Polygons: Detected Change Area #CS-1042 */}
        {layers.changes && (
          <div 
            onClick={() => {
              setSelectedEntity({
                id: 'CS-1042',
                name: 'Bellandur-ORR Corridor Anomaly',
                district: 'Bengaluru Urban',
                state: 'Karnataka',
                coordinates: { lat: 12.9352, lng: 77.6946 },
                riskLevel: 'CRITICAL',
                changeDetected: true,
                lastDate: '08 Sep 2026',
                prevDate: '31 Aug 2026',
                confidence: 94
              });
              setInspectorOpen(true);
            }}
            className="absolute top-[48%] left-[46%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          >
            <svg width="220" height="160" viewBox="0 0 220 160" className="overflow-visible">
              <defs>
                <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" />
                </pattern>
              </defs>
              
              {/* Change Polygon Shape */}
              <polygon
                points="40,30 180,45 155,130 25,115"
                fill="url(#diagonalHatch)"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 2"
                className="group-hover:stroke-intel-cyan transition-colors"
              />

              {/* Centroid Tag */}
              <g transform="translate(100, 80)">
                <rect x="-48" y="-12" width="96" height="22" rx="4" fill="#070b12" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="3" textAnchor="middle" fill="#fca5a5" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  CHANGE 2.84 ha
                </text>
              </g>
            </svg>
          </div>
        )}

        {/* GIS Boundaries Layer: BBMP Master Plan Buffer */}
        {layers.boundaries && (
          <div className="absolute top-[46%] left-[44%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="340" height="220" viewBox="0 0 340 220" className="overflow-visible">
              <polygon
                points="10,15 320,35 290,195 20,170"
                fill="none"
                stroke="rgba(0, 240, 255, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="8 4"
              />
              <text x="35" y="28" fill="rgba(0, 240, 255, 0.6)" fontSize="9" fontFamily="monospace">
                BBMP TENDER #883 STATUTORY BOUNDARY
              </text>
            </svg>
          </div>
        )}

        {/* Project Markers */}
        {layers.projects && (
          <div
            onClick={() => {
              setSelectedEntity({
                id: 'PRJ-BLR-883',
                name: 'ORR Smart Arterial Corridor',
                district: 'Bengaluru Urban',
                state: 'Karnataka',
                coordinates: { lat: 12.9352, lng: 77.6946 },
                riskLevel: 'HIGH',
                changeDetected: true,
                lastDate: '08 Sep 2026',
                prevDate: '31 Aug 2026',
                confidence: 86
              });
              setInspectorOpen(true);
            }}
            className="absolute top-[44%] left-[48%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-blue-950/80 border border-blue-400 flex items-center justify-center text-blue-300 shadow-md group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-tactical-900 border border-blue-500/40 text-[10px] font-mono text-blue-300 px-2 py-0.5 rounded whitespace-nowrap shadow-lg">
                PRJ-BLR-883 (68%)
              </div>
            </div>
          </div>
        )}

        {/* Citizen Report Markers */}
        {layers.reports && (
          <div
            onClick={() => {
              setSelectedEntity({
                id: 'CS-2026-001482',
                name: 'Citizen Grievance #CS-1482 (Night Excavation)',
                district: 'Bengaluru Urban',
                state: 'Karnataka',
                coordinates: { lat: 12.9348, lng: 77.6952 },
                riskLevel: 'CRITICAL',
                changeDetected: true,
                lastDate: '08 Sep 2026',
                prevDate: '31 Aug 2026',
                confidence: 98
              });
              setInspectorOpen(true);
            }}
            className="absolute top-[55%] left-[51%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          >
            <div className="relative">
              <span className="w-3 h-3 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 animate-ping" />
              <div className="w-7 h-7 rounded-full bg-amber-950/90 border border-amber-400 flex items-center justify-center text-amber-300 shadow-md group-hover:scale-110 transition-transform">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-tactical-900 border border-amber-500/40 text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded whitespace-nowrap shadow-lg">
                CS-1482 (Verified)
              </div>
            </div>
          </div>
        )}

        {/* Risk Zone Marker: Bellandur Catchment Wetland */}
        {layers.risks && (
          <div
            onClick={() => {
              setSelectedEntity({
                id: 'RISK-01',
                name: 'Bellandur Lake Catchment Anomaly',
                district: 'Bengaluru Urban',
                state: 'Karnataka',
                coordinates: { lat: 12.9365, lng: 77.6925 },
                riskLevel: 'CRITICAL',
                changeDetected: true,
                lastDate: '08 Sep 2026',
                prevDate: '31 Aug 2026',
                confidence: 94
              });
              setInspectorOpen(true);
            }}
            className="absolute top-[39%] left-[41%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          >
            <div className="relative">
              <span className="w-4 h-4 rounded-full bg-red-500 absolute -top-1 -right-1 animate-ping" />
              <div className="w-8 h-8 rounded-full bg-red-950/90 border border-red-500 flex items-center justify-center text-red-400 shadow-alert-glow group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-tactical-900 border border-red-500/50 text-[10px] font-mono text-red-400 px-2 py-0.5 rounded whitespace-nowrap shadow-lg font-bold">
                CRITICAL BUFFER ANOMALY
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Top Left Search Bar */}
      <div className="absolute top-3 left-3 z-20 w-72 max-w-[calc(100vw-6rem)]">
        <div className="flex items-center px-3 py-2 rounded-xl bg-tactical-900/90 border border-tactical-700/80 backdrop-blur-md shadow-xl text-xs font-mono">
          <Search className="w-4 h-4 text-intel-cyan mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location, district, project..."
            className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Top Map Toolbar Center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 hidden md:block max-w-2xl w-full px-4">
        <MapToolbar
          basemap={basemap}
          onSelectBasemap={setBasemap}
          layers={layers}
          onToggleLayer={toggleLayer}
          onResetView={handleResetView}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />
      </div>

      {/* Floating Right Location Inspector */}
      {inspectorOpen && (
        <div className="absolute top-3 right-3 z-30">
          <SelectedLocationInspector
            locationName={selectedEntity.name}
            district={selectedEntity.district}
            state={selectedEntity.state}
            coordinates={selectedEntity.coordinates}
            riskLevel={selectedEntity.riskLevel}
            changeDetected={selectedEntity.changeDetected}
            lastSatelliteDate={selectedEntity.lastDate}
            previousSatelliteDate={selectedEntity.prevDate}
            aiConfidence={selectedEntity.confidence}
            onCompareImages={() => onNavigate('compare')}
            onRunAiAnalysis={() => onNavigate('risks')}
            onViewTimeline={() => onNavigate('timeline')}
            onCreateInvestigation={() => onNavigate('investigations', 'CS-1042')}
            onClose={() => setInspectorOpen(false)}
          />
        </div>
      )}

      {/* Map Zoom Controls Floating Bottom Right */}
      <div className="absolute bottom-12 right-3 z-20 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg bg-tactical-900/90 border border-tactical-750 hover:bg-tactical-800 text-slate-300 hover:text-white flex items-center justify-center font-mono text-sm shadow-md"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg bg-tactical-900/90 border border-tactical-750 hover:bg-tactical-800 text-slate-300 hover:text-white flex items-center justify-center font-mono text-sm shadow-md"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Telemetry Bar - Strict Prompt Spec */}
      <div className="relative z-20 px-4 py-2 bg-tactical-900/95 border-t border-tactical-800 flex flex-wrap items-center justify-between font-mono text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="text-slate-500">Imagery date:</span>
            <span className="text-intel-cyan font-bold">08 Sep 2026</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Source:</span>
            <span className="text-white font-medium">Sentinel-2B MSI</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">Cloud cover:</span>
            <span className="text-emerald-400 font-semibold">4%</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">Resolution:</span>
            <span className="text-white font-medium">10m GSD</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500 hidden md:inline">Projection: EPSG:3857</span>
          <span className="text-slate-300">
            12.9352° N, 77.6946° E (Zoom: {zoomLevel}x)
          </span>
        </div>
      </div>

    </div>
  );
};
