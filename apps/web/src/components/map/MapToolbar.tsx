'use client';

import React from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  MapPin,
  AlertTriangle,
  Users,
  Satellite,
  Shield,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type BasemapMode = 'satellite' | 'streets' | 'tactical' | 'hybrid';

export interface MapLayerState {
  projects: boolean;
  riskFindings: boolean;
  citizenSignals: boolean;
  satelliteEvidence: boolean;
  boundaries: boolean;
}

interface MapToolbarProps {
  basemap: BasemapMode;
  onBasemapChange: (mode: BasemapMode) => void;
  layers: MapLayerState;
  onToggleLayer: (layer: keyof MapLayerState) => void;
  layerCounts?: Partial<Record<keyof MapLayerState, number>>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  className?: string;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  basemap,
  onBasemapChange,
  layers,
  onToggleLayer,
  layerCounts = {},
  onZoomIn,
  onZoomOut,
  onResetView,
  isFullscreen,
  onToggleFullscreen,
  className
}) => {
  const layerDefs: Array<{
    key: keyof MapLayerState;
    label: string;
    icon: React.ElementType;
    color: string;
    activeBg: string;
  }> = [
    {
      key: 'projects',
      label: 'Projects',
      icon: MapPin,
      color: 'text-blue-500',
      activeBg: 'bg-blue-500/15 border-blue-500/40 text-blue-400'
    },
    {
      key: 'riskFindings',
      label: 'Risk Signals',
      icon: AlertTriangle,
      color: 'text-red-500',
      activeBg: 'bg-red-500/15 border-red-500/40 text-red-400'
    },
    {
      key: 'satelliteEvidence',
      label: 'Satellite Observations',
      icon: Satellite,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
    },
    {
      key: 'citizenSignals',
      label: 'Citizen Grievances',
      icon: Users,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
    },
    {
      key: 'boundaries',
      label: 'Districts',
      icon: Shield,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/15 border-purple-500/40 text-purple-300'
    }
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs shadow-2xl transition-all',
        className
      )}
    >
      {/* Left: Layer Toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400 font-mono text-[11px] font-semibold border-r border-slate-800 pr-3">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>LAYERS</span>
        </div>

        {layerDefs.map(({ key, label, icon: Icon, activeBg }) => {
          const isActive = layers[key];
          const count = layerCounts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleLayer(key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all',
                isActive
                  ? activeBg
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              )}
              title={`Toggle ${label}`}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
              {typeof count === 'number' && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-300 font-sans">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Basemap & View Controls */}
      <div className="flex items-center gap-2">
        {/* Basemap Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onBasemapChange('satellite')}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors',
              basemap === 'satellite'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Globe className="w-3 h-3" />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => onBasemapChange('tactical')}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors',
              basemap === 'tactical'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Moon className="w-3 h-3" />
            <span>Tactical</span>
          </button>
          <button
            type="button"
            onClick={() => onBasemapChange('streets')}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors',
              basemap === 'streets'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Sun className="w-3 h-3" />
            <span>Streets</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetView}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Reset to India View"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
