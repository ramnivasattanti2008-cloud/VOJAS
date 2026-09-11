import React from 'react';
import { Layers, Map as MapIcon, Globe, Eye, Maximize2, Compass, Crosshair } from 'lucide-react';

export type BasemapMode = 'satellite' | 'hybrid' | 'street';

export interface LayerState {
  projects: boolean;
  risks: boolean;
  changes: boolean;
  reports: boolean;
  infrastructure: boolean;
  boundaries: boolean;
}

interface MapToolbarProps {
  basemap: BasemapMode;
  onSelectBasemap: (mode: BasemapMode) => void;
  layers: LayerState;
  onToggleLayer: (layer: keyof LayerState) => void;
  onResetView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  basemap,
  onSelectBasemap,
  layers,
  onToggleLayer,
  onResetView,
  isFullscreen,
  onToggleFullscreen
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-tactical-900/90 border border-tactical-750 backdrop-blur-md shadow-xl text-xs font-mono select-none">
      
      {/* Basemap Switcher */}
      <div className="flex items-center gap-1 bg-tactical-950 p-1 rounded-lg border border-tactical-800">
        <span className="text-[10px] text-slate-500 uppercase px-1.5 font-bold">Basemap</span>
        
        <button
          onClick={() => onSelectBasemap('satellite')}
          className={`px-2 py-1 rounded transition-colors ${
            basemap === 'satellite'
              ? 'bg-intel-cyan text-black font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Satellite
        </button>

        <button
          onClick={() => onSelectBasemap('hybrid')}
          className={`px-2 py-1 rounded transition-colors ${
            basemap === 'hybrid'
              ? 'bg-intel-cyan text-black font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hybrid
        </button>

        <button
          onClick={() => onSelectBasemap('street')}
          className={`px-2 py-1 rounded transition-colors ${
            basemap === 'street'
              ? 'bg-intel-cyan text-black font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Street
        </button>
      </div>

      {/* Layer Toggles */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-[10px] text-slate-500 uppercase px-1 font-bold hidden sm:inline">Layers:</span>

        <button
          onClick={() => onToggleLayer('projects')}
          className={`px-2 py-1 rounded border text-[11px] transition-all ${
            layers.projects
              ? 'bg-blue-950 text-blue-300 border-blue-500/50 font-semibold'
              : 'bg-tactical-850 text-slate-500 border-tactical-800 hover:text-slate-300'
          }`}
        >
          Projects
        </button>

        <button
          onClick={() => onToggleLayer('risks')}
          className={`px-2 py-1 rounded border text-[11px] transition-all ${
            layers.risks
              ? 'bg-red-950 text-red-300 border-red-500/50 font-semibold'
              : 'bg-tactical-850 text-slate-500 border-tactical-800 hover:text-slate-300'
          }`}
        >
          Risk Zones
        </button>

        <button
          onClick={() => onToggleLayer('changes')}
          className={`px-2 py-1 rounded border text-[11px] transition-all ${
            layers.changes
              ? 'bg-purple-950 text-purple-300 border-purple-500/50 font-semibold'
              : 'bg-tactical-850 text-slate-500 border-tactical-800 hover:text-slate-300'
          }`}
        >
          Changes
        </button>

        <button
          onClick={() => onToggleLayer('reports')}
          className={`px-2 py-1 rounded border text-[11px] transition-all ${
            layers.reports
              ? 'bg-amber-950 text-amber-300 border-amber-500/50 font-semibold'
              : 'bg-tactical-850 text-slate-500 border-tactical-800 hover:text-slate-300'
          }`}
        >
          Citizen Pins
        </button>

        <button
          onClick={() => onToggleLayer('infrastructure')}
          className={`px-2 py-1 rounded border text-[11px] transition-all hidden md:inline-block ${
            layers.infrastructure
              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 font-semibold'
              : 'bg-tactical-850 text-slate-500 border-tactical-800 hover:text-slate-300'
          }`}
        >
          Infra
        </button>

        <button
          onClick={() => onToggleLayer('boundaries')}
          className={`px-2 py-1 rounded border text-[11px] transition-all hidden lg:inline-block ${
            layers.boundaries
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 font-semibold'
              : 'bg-tactical-850 text-slate-500 border-tactical-800 hover:text-slate-300'
          }`}
        >
          Boundaries
        </button>
      </div>

      {/* Map Tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={onResetView}
          className="p-1.5 rounded bg-tactical-850 border border-tactical-750 text-slate-400 hover:text-intel-cyan"
          title="Reset to center (12.97°N, 77.59°E)"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded bg-tactical-850 border border-tactical-750 text-slate-400 hover:text-white"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
