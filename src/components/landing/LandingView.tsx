import React from 'react';
import { 
  ArrowRight, 
  Map, 
  Satellite, 
  Brain, 
  ShieldAlert, 
  Users, 
  Sparkles, 
  FileSearch, 
  CheckCircle2, 
  Play, 
  Layers, 
  Zap,
  ChevronRight
} from 'lucide-react';
import { CinematicMap } from './CinematicMap';
import { ViewType } from '../layout/TacticalSidebar';
import { SystemTelemetry } from '../../types/civicshield';

interface LandingViewProps {
  onNavigate: (view: ViewType) => void;
  telemetry: SystemTelemetry;
  onTriggerDemo: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate, telemetry, onTriggerDemo }) => {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-tactical-950 text-slate-100 overflow-y-auto tactical-grid pb-16">
      
      {/* Background radial atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        
        {/* Top Hackathon Highlight Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-intel-cyan/40 bg-tactical-900/90 backdrop-blur-md mb-10 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-intel-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-intel-cyan" />
            </span>
            <span className="text-xs font-mono font-semibold text-intel-cyan tracking-wider">
              SMART CIVIC INTELLIGENCE PLATFORM
            </span>
            <span className="hidden md:inline text-xs text-slate-400 font-mono">
              Operational Sentinel-2 Pipeline + Epistemic AI Risk Matrix
            </span>
          </div>

          <button
            onClick={onTriggerDemo}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Launch Hackathon Demo Story</span>
          </button>
        </div>

        {/* Hero Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-intel-cyan/30 bg-intel-cyan/10 text-intel-cyan text-xs font-mono">
                <Satellite className="w-3.5 h-3.5" />
                <span>Geospatial Earth Observation &amp; AI Triage</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none font-sans">
                See What Changed.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-intel-cyan via-sky-300 to-blue-400">
                  Know What Matters.
                </span>
              </h1>
              <p className="text-lg sm:text-xl font-mono text-intel-cyan/90 font-medium">
                Act Before It&rsquo;s Too Late.
              </p>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              CivicShield AI transforms multi-spectral satellite imagery, temporal change detection, citizen observations, and explainable AI into actionable civic infrastructure intelligence for municipal authorities, vigilance bodies, and citizens.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-sm font-bold transition-all shadow-intel-glow"
              >
                <span>Explore Civic Intelligence</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('map')}
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-tactical-700 bg-tactical-900/80 hover:bg-tactical-800 hover:border-slate-500 text-slate-200 font-mono text-sm font-medium transition-colors"
              >
                <Map className="w-4 h-4 text-intel-cyan" />
                <span>View Live Map</span>
              </button>
            </div>

            {/* Live Intelligence Telemetry Indicators */}
            <div className="pt-4 border-t border-tactical-800">
              <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2.5">
                Real-Time Operational Indicators
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                <div className="p-2.5 rounded-lg border border-tactical-800 bg-tactical-900/60 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase">SATELLITE FEED</div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-tactical-800 bg-tactical-900/60 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase">AI ANALYSIS</div>
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    <span>ACTIVE</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-tactical-800 bg-tactical-900/60 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase">MONITORED HUBS</div>
                  <div className="text-xs text-white font-bold mt-0.5">
                    {telemetry.monitoredLocationsCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-tactical-800 bg-tactical-900/60 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase">ACTIVE ALERTS</div>
                  <div className="text-xs text-red-400 font-bold mt-0.5">
                    {telemetry.activeAlertsCount} ACTIVE
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Cinematic Interactive Map Visualizer */}
          <div className="lg:col-span-6">
            <CinematicMap
              onSelectHub={(hub) => {
                if (hub === 'Bengaluru') {
                  onNavigate('dashboard');
                } else {
                  onNavigate('map');
                }
              }}
            />
          </div>

        </div>

        {/* 5 Core Pillars Section */}
        <div className="mt-20 pt-10 border-t border-tactical-800">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono text-intel-cyan uppercase tracking-widest font-semibold">
              EPISTEMIC INTELLIGENCE ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Built for Government Authorities, Auditors &amp; Citizens
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-mono">
              Strictly separating observed physical data from statistical AI inference and citizen submissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div 
              onClick={() => onNavigate('compare')}
              className="p-6 rounded-xl border border-tactical-800 bg-tactical-900/70 hover:border-intel-cyan/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-intel-cyan mb-4 group-hover:scale-105 transition-transform">
                <Satellite className="w-5 h-5" />
              </div>
              <h3 className="font-mono text-sm font-semibold text-white group-hover:text-intel-cyan transition-colors">
                Temporal Satellite Comparison
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Sentinel-2 L2A optical and multi-spectral split-screen slider with NDVI difference heatmaps and synchronized pan/zoom.
              </p>
              <div className="flex items-center gap-1 mt-4 text-xs font-mono text-intel-cyan font-medium">
                <span>Launch Compare Suite</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div 
              onClick={() => onNavigate('risks')}
              className="p-6 rounded-xl border border-tactical-800 bg-tactical-900/70 hover:border-purple-500/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-mono text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                Explainable AI Risk Engine
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                No black boxes. Every inference exposes its empirical telemetry: spectral deltas, tender boundary violations, and confidence scores.
              </p>
              <div className="flex items-center gap-1 mt-4 text-xs font-mono text-purple-400 font-medium">
                <span>View Risk Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div 
              onClick={() => onNavigate('investigations')}
              className="p-6 rounded-xl border border-tactical-800 bg-tactical-900/70 hover:border-red-500/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 group-hover:scale-105 transition-transform">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="font-mono text-sm font-semibold text-white group-hover:text-red-300 transition-colors">
                Operational Investigation Dossier
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Seamless case management linking satellite before/after evidence with citizen grievances, field inspection memos, and exportable briefs.
              </p>
              <div className="flex items-center gap-1 mt-4 text-xs font-mono text-red-400 font-medium">
                <span>Open Case CS-1042</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
