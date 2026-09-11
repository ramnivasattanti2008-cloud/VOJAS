import React, { useState } from 'react';
import { Satellite, Shield, Activity, Radio, Eye } from 'lucide-react';

export const CinematicMap: React.FC<{ onSelectHub: (hub: string) => void }> = ({ onSelectHub }) => {
  const [activeHub, setActiveHub] = useState<string | null>('Bengaluru');

  const hubs = [
    { id: 'BLR', name: 'Bengaluru', lat: '12.97°N', lng: '77.59°E', x: 235, y: 395, risk: 'HIGH', label: 'ORR Anomaly Active' },
    { id: 'HYD', name: 'Hyderabad', lat: '17.38°N', lng: '78.48°E', x: 250, y: 335, risk: 'MODERATE', label: 'Musi Riverfront' },
    { id: 'MUM', name: 'Mumbai', lat: '18.94°N', lng: '72.82°E', x: 175, y: 310, risk: 'LOW', label: 'Coastal Road' },
    { id: 'DEL', name: 'Delhi-NCR', lat: '28.61°N', lng: '77.20°E', x: 235, y: 175, risk: 'MODERATE', label: 'Green Corridor' },
    { id: 'CHE', name: 'Chennai', lat: '13.08°N', lng: '80.27°E', x: 265, y: 405, risk: 'CRITICAL', label: 'Culvert Bottleneck' },
    { id: 'NEL', name: 'Nellore', lat: '14.44°N', lng: '79.98°E', x: 260, y: 380, risk: 'MODERATE', label: 'Aquaculture Shift' }
  ];

  return (
    <div className="relative w-full h-[520px] rounded-2xl border border-intel-cyan/30 bg-tactical-950/90 overflow-hidden shadow-2xl p-4 flex flex-col justify-between">
      
      {/* Background Geospatial Grid & Radar Sweeper */}
      <div className="absolute inset-0 tactical-grid-dense opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-intel-cyan/15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-intel-cyan/15 pointer-events-none" />
      
      {/* Radar sweep line */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full overflow-hidden pointer-events-none">
        <div className="w-full h-full origin-center animate-radar-sweep bg-gradient-to-r from-transparent via-transparent to-intel-cyan/10" />
      </div>

      {/* Top telemetry bar overlay */}
      <div className="relative z-10 flex items-center justify-between bg-tactical-900/80 border border-tactical-700/60 backdrop-blur-md px-3.5 py-2 rounded-lg font-mono text-xs">
        <div className="flex items-center gap-2">
          <Satellite className="w-3.5 h-3.5 text-intel-cyan animate-pulse" />
          <span className="text-slate-300">SENTINEL-2B / ORBIT #142</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">SWATH ACTIVE</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>RES: 10m L2A</span>
          <span className="text-intel-cyan">NDVI SYNTHESIZER ON</span>
        </div>
      </div>

      {/* Center SVG India Map Vector Representation */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-2">
        <svg viewBox="0 0 500 520" className="w-full h-full max-h-[380px]">
          <defs>
            <linearGradient id="indiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c182e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#08101f" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Stylized Vector Boundary for India Subcontinent */}
          <path
            d="M 210 90 
               L 260 115 L 290 145 L 320 160 L 370 170 L 410 185 L 430 210 L 390 230 L 350 220 
               L 330 250 L 310 280 L 295 340 L 280 410 L 245 470 L 230 460 L 210 400 L 175 350 
               L 165 300 L 140 260 L 130 210 L 170 170 L 195 130 Z"
            fill="url(#indiaGrad)"
            stroke="rgba(0, 240, 255, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Geospatial Flight Track / Orbit Line */}
          <line
            x1="120"
            y1="60"
            x2="380"
            y2="490"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />

          {/* Inter-hub mesh connections */}
          <line x1="235" y1="175" x2="175" y2="310" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="175" y1="310" x2="235" y2="395" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1" />
          <line x1="250" y1="335" x2="235" y2="395" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="1" />
          <line x1="235" y1="395" x2="265" y2="405" stroke="rgba(239, 68, 68, 0.25)" strokeWidth="1" />
          <line x1="260" y1="380" x2="265" y2="405" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Hub Markers */}
          {hubs.map((hub) => {
            const isSelected = activeHub === hub.name;
            const isCritical = hub.risk === 'CRITICAL';
            const isHigh = hub.risk === 'HIGH';

            return (
              <g
                key={hub.id}
                className="cursor-pointer group"
                onClick={() => {
                  setActiveHub(hub.name);
                  onSelectHub(hub.name);
                }}
              >
                {/* Pulsing ring */}
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r={isSelected ? 16 : 9}
                  className={`transition-all duration-300 ${
                    isCritical
                      ? 'fill-red-500/20 stroke-red-500 animate-ping'
                      : isHigh
                      ? 'fill-orange-500/20 stroke-orange-400'
                      : 'fill-intel-cyan/20 stroke-intel-cyan'
                  }`}
                  strokeWidth="1.5"
                />

                {/* Core dot */}
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r={isSelected ? 5 : 3.5}
                  className={isCritical ? 'fill-red-400' : isHigh ? 'fill-orange-400' : 'fill-intel-cyan'}
                  filter="url(#glow)"
                />

                {/* City Label */}
                <text
                  x={hub.x + 12}
                  y={hub.y + 4}
                  className={`font-mono text-[11px] select-none transition-colors ${
                    isSelected ? 'fill-white font-bold' : 'fill-slate-400 group-hover:fill-slate-200'
                  }`}
                >
                  {hub.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom selected hub quick brief */}
      <div className="relative z-10 bg-tactical-900/90 border border-tactical-700/80 rounded-xl p-3 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-intel-cyan/15 border border-intel-cyan/30 flex items-center justify-center text-intel-cyan">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white uppercase">{activeHub || 'Select Hub'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-500/40 font-semibold">
                ANOMALY DETECTED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Bellandur-ORR Corridor: 2.84 ha ground clearance deviation flagged
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectHub('Bengaluru')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect Node</span>
        </button>
      </div>

    </div>
  );
};
