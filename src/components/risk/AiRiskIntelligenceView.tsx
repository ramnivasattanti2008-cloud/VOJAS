import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  FileSearch, 
  CheckCircle2, 
  Users, 
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ALL_RISKS } from '../../data/mockData';
import { RiskItem, RiskLevel } from '../../types/civicshield';
import { SeverityBadge, EpistemicBadge } from '../ui/Badges';
import { ViewType } from '../layout/TacticalSidebar';

interface AiRiskIntelligenceViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const AiRiskIntelligenceView: React.FC<AiRiskIntelligenceViewProps> = ({ onNavigate }) => {
  const [selectedRisk, setSelectedRisk] = useState<RiskItem>(ALL_RISKS[0]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
            <Brain className="w-3.5 h-3.5" />
            <span>EXPLAINABLE EPISTEMIC RISK MATRIX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            AI Risk Intelligence &amp; Assessment
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Ground-truth corroborated geospatial hazard matrix with empirical evidence separation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('investigations', 'CS-1042')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-alert-glow"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Open Case CS-1042</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry KPI Trio - Exact prompt spec */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-tactical-800 bg-tactical-900/90 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Overall Civic Risk</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-amber-400">MODERATE</span>
            <SeverityBadge severity="MODERATE" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Weighted composite vulnerability index</span>
        </div>

        <div className="p-3.5 rounded-xl border border-intel-cyan/30 bg-tactical-900/90 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">AI Confidence</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-intel-cyan">91.4%</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              High Precision
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Cross-validated by 10m L2A spectral delta</span>
        </div>

        <div className="p-3.5 rounded-xl border border-tactical-800 bg-tactical-900/90 font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Regions Analyzed</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-white">128</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Active Wards</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Sentinel-2 orbital footprint coverage</span>
        </div>
      </div>

      {/* Main Grid: Risk Matrix Table + Detailed Evidence Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[420px]">
        
        {/* Left: Risk Matrix Table & Cards (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          
          <div className="p-3 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-md">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-3">
              Geospatial Hazard Matrix
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-tactical-800 text-slate-500 uppercase text-[10px]">
                    <th className="pb-2">Risk Category</th>
                    <th className="pb-2">Severity</th>
                    <th className="pb-2">Confidence</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tactical-800">
                  {ALL_RISKS.map((risk) => {
                    const isSelected = selectedRisk.id === risk.id;

                    return (
                      <tr
                        key={risk.id}
                        onClick={() => setSelectedRisk(risk)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-intel-cyan/15 text-white' : 'hover:bg-tactical-850 text-slate-300'
                        }`}
                      >
                        <td className="py-2.5 pr-2 font-medium">
                          <div className="truncate max-w-[200px]">{risk.title}</div>
                          <div className="text-[10px] text-slate-500 truncate">{risk.location}</div>
                        </td>
                        <td className="py-2.5">
                          <SeverityBadge severity={risk.severity} />
                        </td>
                        <td className="py-2.5 text-intel-cyan font-bold">
                          {risk.confidenceScore}%
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`text-[10px] underline ${isSelected ? 'text-intel-cyan font-bold' : 'text-slate-500'}`}>
                            Inspect
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Epistemic Trust Legend Card */}
          <div className="p-3.5 rounded-xl border border-tactical-800 bg-tactical-900/60 text-xs font-mono space-y-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              Epistemic Trust Standard
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>OBSERVED DATA = Physical Satellite Pixels</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>AI INFERENCE = Statistical Hypothesis</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>CITIZEN REPORT = Crowdsourced Ground Grievance</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>GOVERNMENT DATA = Tender Specs / Cadastral Maps</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Detailed Analysis Breakdown (6 cols) */}
        <div className="lg:col-span-6 rounded-xl border border-tactical-800 bg-tactical-900/95 p-4 flex flex-col justify-between space-y-4 shadow-xl">
          
          <div className="space-y-4">
            
            {/* Title & Badges */}
            <div className="pb-3 border-b border-tactical-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  RISK ASSESSMENT DETAIL
                </span>
                <SeverityBadge severity={selectedRisk.severity} />
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                {selectedRisk.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedRisk.location} · {selectedRisk.regionType} · {selectedRisk.detectedTimeAgo}
              </p>
            </div>

            {/* WHY THIS MATTERS */}
            <div className="space-y-1">
              <span className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider block">
                WHY THIS MATTERS
              </span>
              <p className="text-xs text-slate-200 leading-relaxed p-3 rounded-lg bg-tactical-850 border border-tactical-750">
                {selectedRisk.whyItMatters}
              </p>
            </div>

            {/* EVIDENCE - Strictly Separated */}
            <div className="space-y-2">
              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider block font-bold">
                EPISTEMIC EVIDENCE CHAIN
              </span>

              <div className="space-y-2">
                {selectedRisk.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-tactical-850 border border-tactical-750 flex flex-col gap-1 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <EpistemicBadge source={ev.type} size="sm" />
                      <span className="text-[10px] text-emerald-400">Veracity Check: OK</span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5">{ev.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI ASSESSMENT */}
            <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-purple-300 font-bold uppercase">
                  AI ASSESSMENT CONCLUSION
                </span>
                <span className="font-mono text-intel-cyan font-bold">
                  {selectedRisk.confidenceScore}% Confidence
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans mt-1">
                {selectedRisk.aiAssessment}
              </p>
            </div>

            {/* RECOMMENDED ACTION */}
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-xs font-mono">
              <span className="text-[10px] text-red-400 font-bold uppercase block mb-1">
                RECOMMENDED OPERATIONAL ACTION
              </span>
              <p className="text-slate-200">
                {selectedRisk.recommendedAction}
              </p>
            </div>

          </div>

          {/* Action Trigger */}
          <div className="pt-2 border-t border-tactical-800">
            <button
              onClick={() => onNavigate('investigations', 'CS-1042')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-alert-glow"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Escalate to Formal Investigation Docket</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
