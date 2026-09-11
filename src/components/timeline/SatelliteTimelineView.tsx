import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Satellite, 
  Cloud, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  SplitSquareVertical, 
  Layers, 
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { SATELLITE_TIMELINE_BENGALURU } from '../../data/mockData';
import { ViewType } from '../layout/TacticalSidebar';

interface SatelliteTimelineViewProps {
  onNavigate: (view: ViewType) => void;
}

export const SatelliteTimelineView: React.FC<SatelliteTimelineViewProps> = ({ onNavigate }) => {
  const observations = SATELLITE_TIMELINE_BENGALURU;
  const [selectedIndex, setSelectedIndex] = useState(observations.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1200); // ms per step

  const current = observations[selectedIndex];
  const previous = selectedIndex > 0 ? observations[selectedIndex - 1] : observations[0];
  const intervalDays = selectedIndex > 0 ? 8 : 0;

  // Automated playback effect
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setSelectedIndex((prev) => {
          if (prev >= observations.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, observations.length]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <Clock className="w-3.5 h-3.5" />
            <span>TEMPORAL SATELLITE HISTORICAL ANALYSIS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Bengaluru ORR Corridor Temporal Series
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Sentinel-2 MSI Level-2A BOA Surface Reflectance Archive (Jan 2026 – Sep 2026)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('compare')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all shadow-intel-glow"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Launch Split Comparison</span>
          </button>
        </div>
      </div>

      {/* Main Imagery Canvas & Telemetry Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[380px]">
        
        {/* Left Simulated Multi-Spectral Earth View (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-tactical-800 bg-tactical-900 relative overflow-hidden flex flex-col justify-between p-4 shadow-xl">
          
          {/* Simulated Satellite Image Raster with Dynamic Changes */}
          <div className="absolute inset-0 bg-[#070e18] transition-all duration-300 overflow-hidden">
            
            {/* Grid texture */}
            <div className="absolute inset-0 tactical-grid opacity-40" />

            {/* Simulated False Color / NDVI Vegetation Layer Changing by Date */}
            <div 
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                background: selectedIndex >= 5 
                  ? 'radial-gradient(ellipse at 48% 46%, rgba(239, 68, 68, 0.25) 0%, rgba(30, 58, 138, 0.4) 60%, transparent 90%)'
                  : 'radial-gradient(ellipse at 48% 46%, rgba(16, 185, 129, 0.25) 0%, rgba(30, 58, 138, 0.4) 60%, transparent 90%)'
              }}
            />

            {/* Vector Roads & Parcels */}
            <svg className="w-full h-full absolute inset-0 opacity-60">
              {/* Arterial Road Axis */}
              <line x1="0" y1="280" x2="800" y2="240" stroke="#94a3b8" strokeWidth="4" />
              <line x1="0" y1="280" x2="800" y2="240" stroke="#00f0ff" strokeWidth="1" strokeDasharray="8 4" />

              {/* Canal Stream Line */}
              <path d="M 120 0 Q 300 200 480 400 T 700 600" fill="none" stroke="#0284c7" strokeWidth="3" opacity="0.7" />

              {/* Progressively appearing grading boundary on latest observation */}
              {selectedIndex >= 5 && (
                <g>
                  <polygon
                    points="320,180 500,195 470,290 300,270"
                    fill="rgba(239, 68, 68, 0.3)"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <text x="360" y="240" fill="#ef4444" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    UNAUTHORIZED EXCAVATION (2.84 ha)
                  </text>
                </g>
              )}
            </svg>

            {/* Orbit scanning line animation during playback */}
            {isPlaying && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-intel-cyan/10 to-transparent h-16 w-full animate-scan-line pointer-events-none" />
            )}
          </div>

          {/* Overlay Top Bar inside map */}
          <div className="relative z-10 flex items-center justify-between bg-tactical-950/80 border border-tactical-700/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">{current.date}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{current.timeIst}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <span>NDVI: {current.ndviAverage}</span>
              <span className="text-intel-cyan">L2A MSI</span>
            </div>
          </div>

          {/* Overlay Bottom Status banner */}
          <div className="relative z-10 flex items-center justify-between bg-tactical-950/90 border border-tactical-700/60 backdrop-blur-md px-4 py-2.5 rounded-xl font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">SURFACE ANOMALY STATUS</div>
              <div className="text-sm font-bold mt-0.5">
                {selectedIndex >= 5 ? (
                  <span className="text-red-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Vegetation Loss &amp; Soil Exposure Detected (-0.31 NDVI)
                  </span>
                ) : (
                  <span className="text-emerald-400">Normal Baseline Vegetation State</span>
                )}
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              <span>Cloud: {current.cloudCoveragePercent}%</span>
              <span className="mx-2">·</span>
              <span>10m Band 4/3/2</span>
            </div>
          </div>

        </div>

        {/* Right Observation Details & Metadata (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-tactical-800 bg-tactical-900/90 p-4 flex flex-col justify-between space-y-4">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tactical-800">
              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-semibold">
                OBSERVATION METADATA
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-tactical-800 text-intel-cyan border border-intel-cyan/30">
                {current.sensor}
              </span>
            </div>

            {/* Current vs Previous comparison stats */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-800">
                <span className="text-[10px] text-slate-400 block uppercase">CURRENT IMAGE</span>
                <span className="text-white font-bold block mt-0.5">{current.date}</span>
                <span className="text-[10px] text-slate-500">{current.timeIst}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-800">
                <span className="text-[10px] text-slate-400 block uppercase">PREVIOUS IMAGE</span>
                <span className="text-slate-300 font-bold block mt-0.5">{previous.date}</span>
                <span className="text-[10px] text-slate-500">{previous.timeIst}</span>
              </div>
            </div>

            {/* Interval & Quality */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Observation Interval</span>
                <span className="text-intel-cyan font-bold">{intervalDays} days</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Cloud Cover</span>
                <span className="text-emerald-400 font-bold">{current.cloudCoveragePercent}% (Clear Sky)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Spatial Resolution</span>
                <span className="text-white font-bold">{current.resolutionMeters}m Multi-Spectral</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Processing Level</span>
                <span className="text-slate-300 font-medium">Copernicus Level-2A (BOA)</span>
              </div>
            </div>

            {/* AI Temporal Analysis Insight */}
            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-950/20 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-purple-300 font-bold uppercase mb-1">
                <Sparkles className="w-3 h-3" />
                <span>AI TEMPORAL SYNTHESIS</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Vegetation index remained stable at 0.52 ± 0.06 through Jun 2026. Surface disturbance initiated abruptly between 31 Aug and 08 Sep 2026.
              </p>
            </div>
          </div>

          {/* Quick Action */}
          <button
            onClick={() => onNavigate('changes')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-tactical-800 hover:bg-tactical-750 border border-tactical-700 text-intel-cyan font-mono text-xs font-semibold transition-colors"
          >
            <span>Analyze Change Polygon Bounds</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* Bottom Horizontal Timeline Scrubber & Playback Controls */}
      <div className="p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-xl space-y-4">
        
        {/* Playback Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
              <span>{isPlaying ? 'Pause Playback' : '▶ Play Timeline'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setSelectedIndex(0);
              }}
              className="p-1.5 rounded-lg border border-tactical-700 bg-tactical-800 hover:bg-tactical-750 text-slate-300"
              title="Restart from Jan 2026"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              Speed: {playbackSpeed}ms / step
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">Year 2026 Epochs:</span>
            <span className="text-intel-cyan font-bold">{selectedIndex + 1} of {observations.length} Passes</span>
          </div>
        </div>

        {/* Horizontal Timeline Scrubber Line */}
        <div className="relative pt-6 pb-2 px-4">
          
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-tactical-800 -translate-y-1/2 rounded" />
          
          {/* Progress fill */}
          <div 
            className="absolute top-1/2 left-8 h-1 bg-gradient-to-r from-cyan-500 to-intel-cyan -translate-y-1/2 rounded transition-all duration-300"
            style={{
              width: `calc(${(selectedIndex / (observations.length - 1)) * 100}% - 16px)`
            }}
          />

          {/* Node capture points */}
          <div className="relative flex items-center justify-between">
            {observations.map((obs, idx) => {
              const isSelected = idx === selectedIndex;
              const hasAnomaly = idx >= 5;

              return (
                <button
                  key={obs.id}
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedIndex(idx);
                  }}
                  className="flex flex-col items-center group focus:outline-none"
                >
                  {/* Node Circle */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-intel-cyan ring-4 ring-intel-cyan/30 scale-125'
                      : hasAnomaly
                      ? 'bg-red-500/80 hover:bg-red-400'
                      : 'bg-tactical-700 hover:bg-slate-500'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-tactical-950" />
                  </div>

                  {/* Date label */}
                  <span className={`font-mono text-[11px] mt-2 whitespace-nowrap transition-colors ${
                    isSelected ? 'text-intel-cyan font-bold' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {obs.date.split(' ')[0]} {obs.date.split(' ')[1]}
                  </span>

                  {/* Anomaly tag */}
                  {hasAnomaly && (
                    <span className="text-[9px] font-mono text-red-400 uppercase font-bold mt-0.5">
                      Delta
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};
