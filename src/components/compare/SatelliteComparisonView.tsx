import React, { useState, useRef, useEffect } from 'react';
import { 
  SplitSquareVertical, 
  Layers, 
  Eye, 
  Sparkles, 
  FileSearch, 
  RotateCcw, 
  ArrowRight, 
  Calendar,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { EpistemicBadge, SeverityBadge } from '../ui/Badges';
import { ViewType } from '../layout/TacticalSidebar';

type CompareMode = 'swipe' | 'opacity' | 'blink' | 'difference';

interface SatelliteComparisonViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const SatelliteComparisonView: React.FC<SatelliteComparisonViewProps> = ({ onNavigate }) => {
  const [mode, setMode] = useState<CompareMode>('swipe');
  const [sliderPos, setSliderPos] = useState(50); // percentage (0 to 100)
  const [opacityVal, setOpacityVal] = useState(50);
  const [blinkState, setBlinkState] = useState<'before' | 'after'>('after');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Blink mode interval
  useEffect(() => {
    let interval: any;
    if (mode === 'blink') {
      interval = setInterval(() => {
        setBlinkState(prev => prev === 'before' ? 'after' : 'before');
      }, 700);
    }
    return () => clearInterval(interval);
  }, [mode]);

  const handlePointerDown = () => setIsDragging(true);
  const handlePointerUp = () => setIsDragging(false);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clampedPct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(clampedPct);
  };

  return (
    <div 
      className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none"
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>MULTI-TEMPORAL SATELLITE COMPARISON SUITE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Bellandur Outer Ring Road: 31 Aug 2026 vs 08 Sep 2026
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Synchronized Sentinel-2 MSI Multi-Spectral Analysis · Ground Surface Change Detection
          </p>
        </div>

        {/* Comparison Mode Selector */}
        <div className="flex items-center gap-1 bg-tactical-900 border border-tactical-750 p-1 rounded-xl text-xs font-mono">
          <span className="text-[10px] text-slate-500 uppercase px-2 font-bold hidden sm:inline">Mode:</span>

          <button
            onClick={() => setMode('swipe')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'swipe' ? 'bg-intel-cyan text-black font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Swipe Slider
          </button>

          <button
            onClick={() => setMode('opacity')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'opacity' ? 'bg-intel-cyan text-black font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Opacity Fade
          </button>

          <button
            onClick={() => setMode('blink')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'blink' ? 'bg-intel-cyan text-black font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Blink Alternator
          </button>

          <button
            onClick={() => setMode('difference')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'difference' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Difference Heatmap
          </button>
        </div>
      </div>

      {/* Main Comparison Canvas & Right AI Change Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[420px]">
        
        {/* Left Interactive Comparison Canvas (8 cols) */}
        <div 
          ref={containerRef}
          className="lg:col-span-8 rounded-xl border border-tactical-800 bg-tactical-900 relative overflow-hidden flex flex-col justify-between shadow-2xl cursor-ew-resize"
        >
          {/* SATELLITE CANVAS CONTAINER */}
          <div className="absolute inset-0 overflow-hidden bg-[#070d17]">
            
            {/* BASE/BEFORE IMAGE LAYER (31 Aug 2026 - Intact Vegetation) */}
            <div className="absolute inset-0 bg-[#081220]">
              <div className="absolute inset-0 tactical-grid opacity-30" />
              {/* Healthy vegetation glow in green */}
              <div className="absolute top-1/4 left-1/4 w-[380px] h-[280px] rounded-full bg-emerald-600/25 blur-3xl" />
              
              {/* Vector Road Axis */}
              <svg className="w-full h-full absolute inset-0">
                <line x1="0" y1="280" x2="900" y2="240" stroke="#64748b" strokeWidth="4" />
                <path d="M 120 0 Q 300 200 480 400 T 700 600" fill="none" stroke="#0284c7" strokeWidth="2.5" opacity="0.6" />
                <polygon points="320,180 500,195 470,290 300,270" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="1.5" />
                <text x="350" y="235" fill="#6ee7b7" fontSize="11" fontFamily="monospace">
                  INTACT GREEN BUFFER (31 Aug)
                </text>
              </svg>
            </div>

            {/* AFTER IMAGE LAYER (08 Sep 2026 - Disturbed Earth) */}
            {mode === 'swipe' && (
              <div 
                className="absolute inset-0 bg-[#090e17] overflow-hidden border-l-2 border-intel-cyan"
                style={{ left: `${sliderPos}%` }}
              >
                <div 
                  className="absolute inset-0 bg-[#090e17]"
                  style={{ width: '100%', marginLeft: `-${sliderPos}%` }}
                >
                  <div className="absolute inset-0 tactical-grid opacity-30" />
                  {/* Excavated soil glow in red/amber */}
                  <div className="absolute top-1/4 left-1/4 w-[380px] h-[280px] rounded-full bg-red-600/30 blur-3xl" />
                  
                  {/* Vector roads + Excavation polygon */}
                  <svg className="w-full h-full absolute inset-0">
                    <line x1="0" y1="280" x2="900" y2="240" stroke="#94a3b8" strokeWidth="4" />
                    <line x1="0" y1="280" x2="900" y2="240" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" />
                    <path d="M 120 0 Q 300 200 480 400 T 700 600" fill="none" stroke="#0284c7" strokeWidth="2.5" opacity="0.6" />
                    
                    {/* Anomaly Footprint */}
                    <polygon points="320,180 500,195 470,290 300,270" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" strokeWidth="2.5" />
                    <text x="340" y="240" fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      EXCAVATION 2.84 ha (08 Sep)
                    </text>
                  </svg>
                </div>
              </div>
            )}

            {/* OPACITY FADE MODE */}
            {mode === 'opacity' && (
              <div 
                className="absolute inset-0 bg-[#090e17] transition-opacity duration-150"
                style={{ opacity: opacityVal / 100 }}
              >
                <div className="absolute top-1/4 left-1/4 w-[380px] h-[280px] rounded-full bg-red-600/35 blur-3xl" />
                <svg className="w-full h-full absolute inset-0">
                  <line x1="0" y1="280" x2="900" y2="240" stroke="#94a3b8" strokeWidth="4" />
                  <polygon points="320,180 500,195 470,290 300,270" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" strokeWidth="2.5" />
                </svg>
              </div>
            )}

            {/* BLINK MODE */}
            {mode === 'blink' && blinkState === 'after' && (
              <div className="absolute inset-0 bg-[#090e17]">
                <div className="absolute top-1/4 left-1/4 w-[380px] h-[280px] rounded-full bg-red-600/35 blur-3xl" />
                <svg className="w-full h-full absolute inset-0">
                  <line x1="0" y1="280" x2="900" y2="240" stroke="#94a3b8" strokeWidth="4" />
                  <polygon points="320,180 500,195 470,290 300,270" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" strokeWidth="2.5" />
                </svg>
              </div>
            )}

            {/* DIFFERENCE HEATMAP MODE */}
            {mode === 'difference' && (
              <div className="absolute inset-0 bg-[#050912]">
                <div className="absolute inset-0 tactical-grid opacity-20" />
                <div className="absolute top-1/4 left-1/4 w-[420px] h-[300px] rounded-full bg-purple-600/30 blur-2xl" />
                <svg className="w-full h-full absolute inset-0">
                  <polygon 
                    points="320,180 500,195 470,290 300,270" 
                    fill="rgba(236, 72, 153, 0.6)" 
                    stroke="#00f0ff" 
                    strokeWidth="3"
                    className="animate-pulse"
                  />
                  <text x="330" y="240" fill="#00f0ff" fontSize="12" fontFamily="monospace" fontWeight="bold">
                    SPECTRAL DELTA (NDVI -0.31)
                  </text>
                </svg>
              </div>
            )}

            {/* Center Draggable Divider Bar (for Swipe mode) */}
            {mode === 'swipe' && (
              <div 
                className="absolute top-0 bottom-0 w-1 bg-intel-cyan cursor-ew-resize z-20"
                style={{ left: `${sliderPos}%` }}
                onPointerDown={handlePointerDown}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-intel-cyan text-black shadow-intel-glow flex items-center justify-center font-mono text-xs font-bold pointer-events-auto cursor-grab active:cursor-grabbing">
                  ↔
                </div>
              </div>
            )}
          </div>

          {/* Top Labels */}
          <div className="relative z-10 flex items-center justify-between p-3 pointer-events-none">
            <div className="bg-tactical-950/90 border border-tactical-700/80 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-slate-400 block text-[10px] uppercase">BEFORE</span>
              <span className="text-emerald-400 font-bold">31 Aug 2026 · Sentinel-2A</span>
            </div>

            <div className="bg-tactical-950/90 border border-tactical-700/80 px-3 py-1.5 rounded-lg text-xs font-mono text-right">
              <span className="text-slate-400 block text-[10px] uppercase">AFTER</span>
              <span className="text-red-400 font-bold">08 Sep 2026 · Sentinel-2B</span>
            </div>
          </div>

          {/* Bottom Controls / Sliders */}
          <div className="relative z-10 p-3 bg-tactical-950/90 border-t border-tactical-800 flex items-center justify-between font-mono text-xs">
            {mode === 'swipe' && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <span>Drag slider to compare</span>
                <span className="text-intel-cyan font-bold">{Math.round(sliderPos)}%</span>
              </div>
            )}

            {mode === 'opacity' && (
              <div className="flex items-center gap-3 w-full max-w-sm">
                <span className="text-slate-400 text-xs">Fade Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacityVal}
                  onChange={(e) => setOpacityVal(Number(e.target.value))}
                  className="w-full accent-intel-cyan"
                />
                <span className="text-intel-cyan font-bold">{opacityVal}%</span>
              </div>
            )}

            {mode === 'blink' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Current Flash:</span>
                <span className={`font-bold ${blinkState === 'after' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {blinkState === 'after' ? '08 Sep 2026 (AFTER)' : '31 Aug 2026 (BEFORE)'}
                </span>
              </div>
            )}

            {mode === 'difference' && (
              <div className="flex items-center gap-2 text-xs text-purple-300">
                <Sparkles className="w-4 h-4" />
                <span>Pixel-Level NDVI Radiometric Subtraction</span>
              </div>
            )}

            <div className="text-slate-500 text-[11px] hidden sm:inline">
              Synchronized 10m Multi-Spectral Grid
            </div>
          </div>

        </div>

        {/* Right AI Change Summary (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-tactical-800 bg-tactical-900/90 p-4 flex flex-col justify-between space-y-4 shadow-xl">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tactical-800">
              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-semibold">
                AI CHANGE SUMMARY
              </span>
              <SeverityBadge severity="HIGH" />
            </div>

            {/* Detected Changes List */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Detected Physical Changes
              </span>

              <div className="p-3 rounded-lg bg-tactical-850 border border-tactical-800 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span>New ground excavation footprint</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Increased compacted soil / gravel</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span>Road corridor edge expansion (+45m)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Vegetation reduction: -2.84 hectares</span>
                </div>
              </div>
            </div>

            {/* AI Confidence & Metrics */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-800">
                <span className="text-[10px] text-slate-400 block uppercase">Confidence</span>
                <span className="text-intel-cyan font-black text-lg block mt-0.5">94%</span>
                <span className="text-[10px] text-slate-500">ResNet-50 v4.2</span>
              </div>

              <div className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-800">
                <span className="text-[10px] text-slate-400 block uppercase">Significance</span>
                <span className="text-orange-400 font-black text-lg block mt-0.5">MODERATE-HIGH</span>
                <span className="text-[10px] text-slate-500">Ecological Buffer</span>
              </div>
            </div>

            {/* Ground Corroboration */}
            <div className="p-3 rounded-lg border border-intel-cyan/30 bg-intel-cyan/5 text-xs font-mono">
              <span className="text-[10px] text-intel-cyan font-bold uppercase block mb-1">
                Citizen Corroboration
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Report #CS-2026-001482 confirmed night dump truck transits across this exact 2.84 ha footprint.
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="space-y-2 pt-2 border-t border-tactical-800">
            <button
              onClick={() => onNavigate('changes')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
            >
              <span>View Change Detection Polygon</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('investigations', 'CS-1042')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-mono text-xs transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Escalate to Case #CS-1042</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
