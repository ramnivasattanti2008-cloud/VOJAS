import React from 'react';
import { 
  Compass, 
  MapPin, 
  ShieldAlert, 
  Sparkles, 
  FileText, 
  Building2, 
  Clock, 
  Brain, 
  Satellite,
  ArrowRight
} from 'lucide-react';
import { BENGALURU_LOCATION_PROFILE, ALL_CHANGE_EVENTS, ALL_RISKS, ALL_PROJECTS } from '../../data/mockData';
import { SeverityBadge } from '../ui/Badges';
import { ViewType } from '../layout/TacticalSidebar';

interface LocationProfileViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const LocationProfileView: React.FC<LocationProfileViewProps> = ({ onNavigate }) => {
  const profile = BENGALURU_LOCATION_PROFILE;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header Profile Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <Compass className="w-3.5 h-3.5" />
            <span>DISTRICT CIVIC INTELLIGENCE DOSSIER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-sans text-white tracking-tight uppercase mt-0.5">
            {profile.name}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            State: {profile.state} · Centroid: {profile.coordinates.lat}° N, {profile.coordinates.lng}° E · Last Orbit: {profile.lastSatellitePass}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl border border-intel-cyan/30 bg-tactical-900 font-mono text-right">
            <span className="text-[10px] text-slate-400 block uppercase">Civic Health Index</span>
            <span className="text-xl font-black text-intel-cyan">{profile.aiCivicHealthScore} / 100</span>
          </div>
        </div>
      </div>

      {/* Top KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        
        <div className="p-3 rounded-xl border border-tactical-800 bg-tactical-900">
          <span className="text-[10px] text-slate-400 uppercase block">Risk Level</span>
          <div className="mt-1">
            <SeverityBadge severity={profile.riskLevel} />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-tactical-800 bg-tactical-900">
          <span className="text-[10px] text-slate-400 uppercase block">Active Alerts</span>
          <span className="text-xl font-bold text-red-400 block mt-0.5">{profile.activeAlertsCount}</span>
        </div>

        <div className="p-3 rounded-xl border border-tactical-800 bg-tactical-900">
          <span className="text-[10px] text-slate-400 uppercase block">Changes Detected</span>
          <span className="text-xl font-bold text-intel-cyan block mt-0.5">{profile.changesDetectedCount}</span>
        </div>

        <div className="p-3 rounded-xl border border-tactical-800 bg-tactical-900">
          <span className="text-[10px] text-slate-400 uppercase block">Citizen Reports</span>
          <span className="text-xl font-bold text-amber-400 block mt-0.5">{profile.citizenReportsCount}</span>
        </div>

        <div className="p-3 rounded-xl border border-tactical-800 bg-tactical-900">
          <span className="text-[10px] text-slate-400 uppercase block">Projects Monitored</span>
          <span className="text-xl font-bold text-emerald-400 block mt-0.5">{profile.projectsMonitoredCount}</span>
        </div>

      </div>

      {/* Overview Narrative & AI Summary */}
      <div className="p-4 rounded-xl border border-tactical-800 bg-tactical-900/80 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs text-intel-cyan font-bold">
          <Brain className="w-4 h-4" />
          <span>SYNTHESIZED DISTRICT EXECUTIVE SUMMARY</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {profile.overviewSummary}
        </p>
      </div>

      {/* Grid of Section Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Recent Changes in Bengaluru */}
        <div className="p-4 rounded-xl border border-tactical-800 bg-tactical-900 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-tactical-800">
            <span className="font-mono text-xs font-bold text-slate-200 uppercase">Recent Satellite Changes</span>
            <button onClick={() => onNavigate('changes')} className="text-xs font-mono text-intel-cyan hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {ALL_CHANGE_EVENTS.slice(0, 2).map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold block">{c.title}</span>
                  <span className="text-[11px] text-slate-400">{c.areaHectares} ha · {c.detectedDate}</span>
                </div>
                <SeverityBadge severity={c.severity} />
              </div>
            ))}
          </div>
        </div>

        {/* Active Infrastructure in Bengaluru */}
        <div className="p-4 rounded-xl border border-tactical-800 bg-tactical-900 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-tactical-800">
            <span className="font-mono text-xs font-bold text-slate-200 uppercase">Key Municipal Projects</span>
            <button onClick={() => onNavigate('infrastructure')} className="text-xs font-mono text-intel-cyan hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {ALL_PROJECTS.slice(0, 2).map(p => (
              <div key={p.id} className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold block">{p.name}</span>
                  <span className="text-[11px] text-slate-400">Budget: ₹{p.budgetCr} Cr · {p.officialProgressPct}%</span>
                </div>
                <span className="text-intel-cyan font-bold">{p.status}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
