import React, { useState, useEffect } from 'react';
import { Search, Shield, Activity, Bell, Play, Terminal, ChevronRight, Compass } from 'lucide-react';
import { SystemTelemetry } from '../../types/civicshield';

interface TacticalHeaderProps {
  onOpenSearch: () => void;
  onOpenStatus: () => void;
  onTriggerDemo: () => void;
  telemetry: SystemTelemetry;
  activeViewTitle: string;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  onOpenSearch,
  onOpenStatus,
  onTriggerDemo,
  telemetry,
  activeViewTitle
}) => {
  const [timeStr, setTimeStr] = useState('13:45:12 IST');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-tactical-700/60 bg-tactical-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-intel-cyan/10 border border-intel-cyan/40 flex items-center justify-center text-intel-cyan shadow-intel-glow">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-mono text-xs font-black tracking-widest text-white">CIVICSHIELD</span>
              <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-intel-cyan text-black">AI</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5 tracking-tight hidden sm:block">
              Geospatial Civic Intelligence
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-tactical-700 mx-1 hidden md:block" />

        {/* Breadcrumb current view */}
        <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-400">
          <span className="text-slate-500">Node</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-intel-cyan font-medium">{activeViewTitle}</span>
        </div>
      </div>

      {/* Center Search Bar trigger */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-tactical-700 bg-tactical-850/80 hover:bg-tactical-800 hover:border-intel-cyan/40 transition-colors text-xs font-mono text-slate-400 group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-intel-cyan transition-colors" />
            <span>Search location, project, district...</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-tactical-750 text-slate-400 border border-tactical-600">
            Ctrl + K
          </span>
        </button>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Guided Hackathon Demo Trigger */}
        <button
          onClick={onTriggerDemo}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-intel-cyan/15 hover:bg-intel-cyan/25 border border-intel-cyan/40 text-intel-cyan text-xs font-mono font-medium transition-colors shadow-sm"
          title="Run guided walkthrough: Bengaluru ORR Corridor Anomaly"
        >
          <Play className="w-3 h-3 fill-intel-cyan" />
          <span className="tracking-wide">Demo Walkthrough</span>
        </button>

        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded lg:hidden text-slate-300 hover:text-white hover:bg-tactical-800"
          title="Open Search (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live System Operational Pill */}
        <button
          onClick={onOpenStatus}
          className="flex items-center gap-2 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-950/60 transition-colors"
          title="Click to view full subsystem health matrix"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[11px] font-mono tracking-wider text-emerald-300 font-semibold hidden sm:inline">
            SYSTEM OPERATIONAL
          </span>
        </button>

        {/* IST Clock */}
        <div className="hidden xl:flex flex-col text-right font-mono text-[11px] leading-tight">
          <span className="text-slate-200 font-medium">{timeStr}</span>
          <span className="text-[9px] text-slate-500">Sentinel-2 Sync OK</span>
        </div>
      </div>
    </header>
  );
};
