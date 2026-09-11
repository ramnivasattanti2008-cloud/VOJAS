import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Satellite, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { ALL_PROJECTS } from '../../data/mockData';
import { InfrastructureProject } from '../../types/civicshield';
import { ProjectStatusBadge } from '../ui/Badges';
import { ViewType } from '../layout/TacticalSidebar';

interface InfrastructureMonitoringViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const InfrastructureMonitoringView: React.FC<InfrastructureMonitoringViewProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<InfrastructureProject>(ALL_PROJECTS[0]);

  const categories = [
    'All',
    'Roads',
    'Drainage',
    'Water',
    'Schools',
    'Bridges',
    'Hospitals'
  ];

  const filteredProjects = ALL_PROJECTS.filter((p) => {
    return selectedCategory === 'All' || p.category === selectedCategory;
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <Building2 className="w-3.5 h-3.5" />
            <span>CIVIC INFRASTRUCTURE AUDITING &amp; SURVEILLANCE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Infrastructure Project Monitoring
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Government tender compliance cross-referenced against high-resolution satellite progression
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Total Capital Monitored:</span>
          <span className="text-emerald-400 font-bold">₹2,586.1 Cr</span>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-slate-500 uppercase text-[10px] font-bold px-1 hidden sm:inline">
          Asset Type:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg border whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-intel-cyan text-black font-bold border-intel-cyan shadow-sm'
                : 'bg-tactical-900 text-slate-400 hover:text-white border-tactical-750 hover:bg-tactical-850'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid: Project Cards & Inspection Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[420px]">
        
        {/* Left: Project Cards List (7 cols) */}
        <div className="lg:col-span-7 space-y-3 overflow-y-auto pr-1">
          {filteredProjects.map((project) => {
            const isSelected = selectedProject.id === project.id;
            const hasLag = project.officialProgressPct - (project.aiSatelliteProgressEstimatePct || 0) > 10;

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all shadow-md ${
                  isSelected
                    ? 'bg-intel-cyan/15 border-intel-cyan/40 shadow-intel-glow'
                    : 'bg-tactical-900/85 border-tactical-800 hover:bg-tactical-850'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-intel-cyan">
                        #{project.id}
                      </span>
                      <ProjectStatusBadge status={project.status} />
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-tactical-800 text-slate-400 border border-tactical-700">
                        {project.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {project.location} · {project.district}, {project.state}
                    </p>
                  </div>

                  <div className="text-right font-mono text-xs shrink-0">
                    <span className="text-slate-400 text-[10px] block uppercase">Budget</span>
                    <span className="text-white font-bold">₹{project.budgetCr} Cr</span>
                  </div>
                </div>

                {/* Progress Comparison Bars */}
                <div className="mt-3 space-y-2 font-mono text-xs bg-tactical-950/70 p-3 rounded-lg border border-tactical-800">
                  
                  {/* Official Progress */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Official Claimed Milestone</span>
                      <span className="text-white font-bold">{project.officialProgressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-tactical-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${project.officialProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* AI Satellite Estimate (or Awaiting analysis) */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <Satellite className="w-3 h-3 text-intel-cyan" />
                        <span className="text-slate-400">Satellite Ground Truth Verification</span>
                      </div>
                      
                      {project.aiSatelliteProgressEstimatePct !== null ? (
                        <span className={`font-bold ${hasLag ? 'text-red-400' : 'text-emerald-400'}`}>
                          {project.aiSatelliteProgressEstimatePct}% (Conf: {project.confidenceScore}%)
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Awaiting analysis</span>
                      )}
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-tactical-800 overflow-hidden">
                      {project.aiSatelliteProgressEstimatePct !== null ? (
                        <div
                          className={`h-full rounded-full ${hasLag ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${project.aiSatelliteProgressEstimatePct}%` }}
                        />
                      ) : (
                        <div className="h-full bg-slate-700 w-1/4 animate-pulse" />
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer notes */}
                <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-slate-400 pt-1">
                  <span>Contractor: {project.contractor}</span>
                  <span className="text-slate-300 font-medium">Due: {project.expectedCompletion}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Project Inspection Dossier (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-tactical-800 bg-tactical-900/95 p-4 flex flex-col justify-between space-y-4 shadow-xl text-left">
          
          <div className="space-y-4">
            
            <div className="pb-3 border-b border-tactical-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase">
                  INFRASTRUCTURE AUDIT DOSSIER
                </span>
                <ProjectStatusBadge status={selectedProject.status} />
              </div>
              <h3 className="font-bold text-base text-white">
                {selectedProject.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedProject.location}
              </p>
            </div>

            {/* Specifications Matrix */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Contractor</span>
                <span className="text-white font-medium truncate max-w-[200px]">{selectedProject.contractor}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Approved Budget</span>
                <span className="text-emerald-400 font-bold">₹{selectedProject.budgetCr} Crores</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Commencement Date</span>
                <span className="text-slate-300">{selectedProject.startDate}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Scheduled Completion</span>
                <span className="text-white font-semibold">{selectedProject.expectedCompletion}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Satellite Sensor Status</span>
                <span className={`font-semibold ${
                  selectedProject.satelliteObservationStatus === 'Anomaly detected' ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {selectedProject.satelliteObservationStatus}
                </span>
              </div>
            </div>

            {/* Auditor Analysis Box */}
            <div className="p-3 rounded-lg border border-tactical-750 bg-tactical-850 text-xs font-sans text-slate-200 leading-relaxed">
              <span className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                Field Audit &amp; Earth Observation Telemetry:
              </span>
              {selectedProject.notes}
            </div>

            {/* Lag warning if applicable */}
            {selectedProject.delayMonths ? (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-xs font-mono text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Progress Milestone Deviation:</strong>
                  Estimated {selectedProject.delayMonths} month delay behind baseline schedule.
                </div>
              </div>
            ) : null}

          </div>

          {/* Action Trigger */}
          <div className="pt-2 border-t border-tactical-800 space-y-2">
            <button
              onClick={() => onNavigate('map')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Locate on Live GIS Map</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
