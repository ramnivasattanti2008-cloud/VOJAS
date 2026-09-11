import React from 'react';
import { Satellite, Brain, AlertTriangle, RefreshCw, Layers, ShieldAlert, History } from 'lucide-react';

export const SatelliteLoadingState: React.FC<{ message?: string }> = ({ 
  message = "Acquiring multi-spectral Sentinel-2 imagery..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-tactical-700/60 bg-tactical-900/80 backdrop-blur-md">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-full border-2 border-intel-cyan/30 border-t-intel-cyan animate-spin" />
        <Satellite className="w-6 h-6 text-intel-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-intel-cyan mb-1 font-semibold">
        {message}
      </p>
      <p className="text-xs text-slate-400 font-mono">
        Processing geospatial layers · Tile coordinate bounds resolution · 10m L2A
      </p>
    </div>
  );
};

export const AiAnalysisLoadingState: React.FC<{ stage?: string }> = ({ 
  stage = "Analyzing observations & spectral indices..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-purple-500/30 bg-tactical-900/80 backdrop-blur-md">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        <Brain className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-purple-300 mb-1 font-semibold">
        {stage}
      </p>
      <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
        <span>Synthesizing satellite delta + municipal tender boundaries</span>
      </div>
    </div>
  );
};

export const EmptySatelliteObservation: React.FC<{ onHistoricalClick?: () => void }> = ({ onHistoricalClick }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-tactical-800 bg-tactical-900/60">
      <div className="w-12 h-12 rounded-full bg-tactical-800 flex items-center justify-center mb-3 text-slate-400">
        <Satellite className="w-6 h-6" />
      </div>
      <h4 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-semibold mb-1">
        NO CLOUD-FREE OBSERVATION CURRENTLY AVAILABLE
      </h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">
        Dense cloud coverage (&gt;85%) over current coordinate footprint. Next scheduled Sentinel-2 pass: ~3 days.
      </p>
      {onHistoricalClick && (
        <button
          onClick={onHistoricalClick}
          className="inline-flex items-center gap-2 text-xs font-mono text-intel-cyan hover:text-cyan-300 border border-intel-cyan/40 px-3 py-1.5 rounded bg-tactical-800/80 hover:bg-tactical-800 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>View Historical Imagery Archive</span>
        </button>
      )}
    </div>
  );
};

export const OperationalErrorState: React.FC<{ 
  title?: string; 
  description?: string; 
  onRetry?: () => void 
}> = ({
  title = "SATELLITE DATA FEED TIMEOUT",
  description = "Could not retrieve the latest imagery layer for this tile footprint. Cached observation remains available.",
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-red-500/30 bg-red-950/20">
      <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center mb-3 text-red-400">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h4 className="font-mono text-xs uppercase tracking-wider text-red-300 font-semibold mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-200 hover:text-white border border-tactical-600 px-3 py-1.5 rounded bg-tactical-800 hover:bg-tactical-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Geospatial Query</span>
        </button>
      )}
    </div>
  );
};
