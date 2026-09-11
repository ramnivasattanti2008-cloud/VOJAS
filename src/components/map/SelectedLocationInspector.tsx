import React, { useState } from 'react';
import { 
  X, 
  Satellite, 
  Brain, 
  Clock, 
  SplitSquareVertical, 
  FileSearch, 
  Sparkles, 
  MapPin, 
  AlertTriangle,
  ChevronRight,
  Activity
} from 'lucide-react';
import { SeverityBadge, EpistemicBadge } from '../ui/Badges';

interface SelectedLocationInspectorProps {
  locationName: string;
  district: string;
  state: string;
  coordinates: { lat: number; lng: number };
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  changeDetected: boolean;
  lastSatelliteDate: string;
  previousSatelliteDate: string;
  aiConfidence: number;
  onCompareImages: () => void;
  onRunAiAnalysis: () => void;
  onViewTimeline: () => void;
  onCreateInvestigation: () => void;
  onClose?: () => void;
}

export const SelectedLocationInspector: React.FC<SelectedLocationInspectorProps> = ({
  locationName,
  district,
  state,
  coordinates,
  riskLevel,
  changeDetected,
  lastSatelliteDate,
  previousSatelliteDate,
  aiConfidence,
  onCompareImages,
  onRunAiAnalysis,
  onViewTimeline,
  onCreateInvestigation,
  onClose
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedSuccess, setAnalyzedSuccess] = useState(false);

  const handleAnalysisClick = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzedSuccess(true);
      onRunAiAnalysis();
    }, 800);
  };

  return (
    <div className="w-80 sm:w-88 rounded-xl border border-tactical-700/80 bg-tactical-900/95 backdrop-blur-md shadow-2xl p-4 flex flex-col justify-between text-left select-none animate-in fade-in slide-in-from-right-4 duration-200">
      
      {/* Header */}
      <div>
        <div className="flex items-start justify-between pb-3 border-b border-tactical-800">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-intel-cyan mb-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>GEOSPATIAL INSPECTOR</span>
            </div>
            <h3 className="font-bold text-base text-white leading-tight">
              {locationName}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {district}, {state}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-tactical-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Telemetry Grid */}
        <div className="mt-3 space-y-2.5">
          
          {/* Coordinates readout */}
          <div className="p-2 rounded-lg bg-tactical-950 border border-tactical-800 font-mono text-xs flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">COORDINATES</span>
            <span className="text-slate-200">
              {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E
            </span>
          </div>

          {/* Metric Rows */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            
            <div className="p-2 rounded-lg bg-tactical-850 border border-tactical-800">
              <span className="text-[10px] text-slate-400 block uppercase">Risk Level</span>
              <div className="mt-1">
                <SeverityBadge severity={riskLevel} />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-tactical-850 border border-tactical-800">
              <span className="text-[10px] text-slate-400 block uppercase">Change Detected</span>
              <span className="text-xs font-bold text-red-400 block mt-1">
                {changeDetected ? 'YES (2.84 ha)' : 'NONE'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-tactical-850 border border-tactical-800">
              <span className="text-[10px] text-slate-400 block uppercase">Latest Pass</span>
              <span className="text-xs text-white font-medium block mt-0.5">
                {lastSatelliteDate}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-tactical-850 border border-tactical-800">
              <span className="text-[10px] text-slate-400 block uppercase">Previous Pass</span>
              <span className="text-xs text-slate-400 block mt-0.5">
                {previousSatelliteDate}
              </span>
            </div>

          </div>

          {/* AI Confidence Meter */}
          <div className="p-2.5 rounded-lg bg-tactical-850 border border-intel-cyan/30 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-purple-300">
                <Brain className="w-3.5 h-3.5" />
                <span className="font-semibold">AI Confidence</span>
              </div>
              <span className="text-intel-cyan font-bold">{aiConfidence}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-tactical-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-intel-cyan rounded-full"
                style={{ width: `${aiConfidence}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              Corroborated by 3 ground citizen reports
            </span>
          </div>

        </div>
      </div>

      {/* Action Buttons Matrix */}
      <div className="mt-4 pt-3 border-t border-tactical-800 space-y-2">
        <button
          onClick={onCompareImages}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
        >
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Compare Images</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleAnalysisClick}
          disabled={isAnalyzing}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 font-mono text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAnalyzing ? 'Running Spectral Models...' : 'Run AI Analysis'}</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onViewTimeline}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-tactical-700 bg-tactical-800 hover:bg-tactical-750 text-slate-300 text-xs font-mono transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Timeline</span>
          </button>

          <button
            onClick={onCreateInvestigation}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-mono font-semibold transition-colors"
          >
            <FileSearch className="w-3.5 h-3.5 text-red-400" />
            <span>Investigate</span>
          </button>
        </div>
      </div>

    </div>
  );
};
