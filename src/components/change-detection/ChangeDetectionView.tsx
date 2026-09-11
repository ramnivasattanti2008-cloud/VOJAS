import React, { useState } from 'react';
import { 
  Sparkles, 
  Filter, 
  MapPin, 
  Calendar, 
  Layers, 
  Brain, 
  FileSearch, 
  ChevronRight, 
  Sliders, 
  AlertTriangle,
  Clock,
  Compass
} from 'lucide-react';
import { ALL_CHANGE_EVENTS, PRIMARY_CHANGE_EVENT } from '../../data/mockData';
import { ChangeCategory, ChangeEvent } from '../../types/civicshield';
import { SeverityBadge } from '../ui/Badges';
import { AiExplainModal } from './AiExplainModal';
import { ViewType } from '../layout/TacticalSidebar';

interface ChangeDetectionViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const ChangeDetectionView: React.FC<ChangeDetectionViewProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [selectedChange, setSelectedChange] = useState<ChangeEvent>(PRIMARY_CHANGE_EVENT);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  const categories = [
    'All',
    'Construction',
    'Road expansion',
    'Vegetation loss',
    'Water change',
    'Land-use change',
    'Infrastructure change'
  ];

  const filteredChanges = ALL_CHANGE_EVENTS.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesConf = item.confidenceScore >= confidenceThreshold;
    return matchesCat && matchesConf;
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none">
      
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SPECTRAL DELTA INTELLIGENCE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Change Detection Intelligence
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Automated land-cover, construction footprint, and vegetative transition analysis
          </p>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex items-center gap-3 bg-tactical-900 border border-tactical-750 px-3 py-1.5 rounded-xl font-mono text-xs">
          <Sliders className="w-3.5 h-3.5 text-intel-cyan" />
          <span className="text-slate-400">Confidence Threshold:</span>
          <input
            type="range"
            min="70"
            max="95"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="w-24 accent-intel-cyan"
          />
          <span className="text-intel-cyan font-bold">{confidenceThreshold}%+</span>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-slate-500 uppercase text-[10px] font-bold px-1 hidden sm:inline">
          Category:
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

      {/* Main Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[420px]">
        
        {/* Left: Change Events Queue & Interactive Map Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          
          {/* Simulated Satellite Vector Map of the Selected Polygon */}
          <div className="h-64 sm:h-72 rounded-xl border border-tactical-800 bg-tactical-900 relative overflow-hidden flex items-center justify-center shadow-lg">
            <div className="absolute inset-0 bg-[#070e1b]" />
            <div className="absolute inset-0 tactical-grid opacity-30" />
            
            {/* Polygon Visualization */}
            <svg viewBox="0 0 500 300" className="w-full h-full relative z-10">
              {/* Reference Gridlines */}
              <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="250" y1="0" x2="250" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Road baseline */}
              <line x1="30" y1="180" x2="470" y2="130" stroke="#475569" strokeWidth="6" />
              <line x1="30" y1="180" x2="470" y2="130" stroke="#00f0ff" strokeWidth="1" strokeDasharray="6 4" />

              {/* Detected Polygon Overlay */}
              <polygon
                points="180,90 340,105 310,210 160,195"
                fill="rgba(239, 68, 68, 0.35)"
                stroke="#ef4444"
                strokeWidth="2.5"
                className="animate-pulse-subtle"
              />

              {/* Coordinates tags */}
              <text x="175" y="85" fill="#fca5a5" fontSize="9" fontFamily="monospace">12.9365°N, 77.6925°E</text>
              <text x="210" y="155" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                {selectedChange.areaHectares} HECTARES
              </text>
            </svg>

            <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-tactical-950/85 border border-tactical-700/80 font-mono text-[11px] text-slate-300">
              <span>Polygon Centroid: {selectedChange.coordinates.lat}° N, {selectedChange.coordinates.lng}° E</span>
            </div>
          </div>

          {/* Filtered Events List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Active Detected Changes ({filteredChanges.length})
            </span>

            {filteredChanges.map((change) => {
              const isSelected = selectedChange.id === change.id;

              return (
                <div
                  key={change.id}
                  onClick={() => setSelectedChange(change)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-intel-cyan/15 border-intel-cyan/40 shadow-sm'
                      : 'bg-tactical-900/80 border-tactical-800 hover:bg-tactical-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        #{change.id}
                      </span>
                      <SeverityBadge severity={change.severity} />
                    </div>

                    <span className="text-xs font-mono font-bold text-intel-cyan">
                      {change.confidenceScore}% CONFIDENCE
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-200 mt-1">
                    {change.title}
                  </h4>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-tactical-800 text-[11px] font-mono text-slate-400">
                    <span>{change.locationName}</span>
                    <span className="text-amber-400 font-medium">{change.areaHectares} ha · {change.category}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right: Change Analysis Detail Card (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-tactical-800 bg-tactical-900/90 p-4 flex flex-col justify-between space-y-4 shadow-xl text-left">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tactical-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">CHANGE EVENT SPECIFICATION</span>
                <h3 className="font-mono text-sm font-bold text-white">#{selectedChange.id}</h3>
              </div>
              <SeverityBadge severity={selectedChange.severity} />
            </div>

            {/* Core Metrics Table */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Location</span>
                <span className="text-white font-medium">{selectedChange.locationName}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Detected Observation</span>
                <span className="text-intel-cyan font-bold">{selectedChange.detectedDate}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Previous Observation</span>
                <span className="text-slate-300 font-medium">{selectedChange.previousObservationDate}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Confidence Rating</span>
                <span className="text-purple-300 font-bold">{selectedChange.confidenceScore}%</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Area Affected</span>
                <span className="text-red-400 font-bold">{selectedChange.areaHectares} hectares</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Classification</span>
                <span className="text-white font-semibold">{selectedChange.category}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-tactical-850 border border-tactical-800">
                <span className="text-slate-400">Severity</span>
                <span className="text-orange-400 font-bold">{selectedChange.severity}</span>
              </div>
            </div>

            {/* Summary narrative */}
            <div className="p-3 rounded-lg bg-tactical-850 border border-tactical-800 text-xs text-slate-300 leading-relaxed">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                Observer Notes
              </span>
              {selectedChange.summary}
            </div>
          </div>

          {/* Action Triggers */}
          <div className="space-y-2 pt-2 border-t border-tactical-800">
            <button
              onClick={() => setIsExplainModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 font-mono text-xs font-bold transition-all shadow-intel-glow"
            >
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Explain Change with AI</span>
            </button>

            <button
              onClick={() => onNavigate('investigations', selectedChange.id)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-mono text-xs transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Create Investigation Docket</span>
            </button>
          </div>

        </div>

      </div>

      {/* AI Explain Modal */}
      <AiExplainModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        changeEvent={selectedChange}
        onOpenInvestigation={(id) => onNavigate('investigations', id)}
      />

    </div>
  );
};
