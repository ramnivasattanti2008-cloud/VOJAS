import React from 'react';
import { Brain, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, FileSearch } from 'lucide-react';
import { EpistemicBadge } from '../ui/Badges';

interface AiSituationBriefProps {
  onInvestigate: (caseId: string) => void;
  onCompare: () => void;
}

export const AiSituationBrief: React.FC<AiSituationBriefProps> = ({ onInvestigate, onCompare }) => {
  return (
    <div className="h-full flex flex-col rounded-xl border border-intel-cyan/30 bg-tactical-900/90 overflow-hidden shadow-intel-glow">
      
      {/* Header */}
      <div className="p-3.5 border-b border-tactical-700/60 flex items-center justify-between bg-tactical-850">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
              AI SITUATION BRIEF
            </h3>
            <span className="text-[10px] font-mono text-purple-300">
              Corridor Anomaly Synthesis #CS-1042
            </span>
          </div>
        </div>

        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-intel-cyan/15 text-intel-cyan border border-intel-cyan/30 font-semibold">
          94% CONFIDENCE
        </span>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-left">
        
        {/* Region context pill */}
        <div className="p-2.5 rounded-lg border border-tactical-750 bg-tactical-850/60 font-mono text-xs">
          <div className="text-[10px] uppercase text-slate-400">Monitoring Region</div>
          <div className="text-white font-medium mt-0.5 flex items-center justify-between">
            <span>Bengaluru Outer Ring Road Corridor</span>
            <span className="text-red-400 font-bold">3 Anomalies</span>
          </div>
        </div>

        {/* Structured Findings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Highest Priority Finding
            </span>
            <EpistemicBadge source="AI_INFERENCE" size="sm" />
          </div>
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-xs text-slate-200 leading-relaxed font-sans">
            <strong className="text-red-300 font-semibold block mb-1">
              Infrastructure Progress Anomaly &amp; Buffer Intrusion
            </strong>
            Observed construction footprint has expanded 45 meters outside BBMP Tender #BBMP-883 bounds, encroaching into the Bellandur lake secondary retention swale.
          </div>
        </div>

        {/* Confidence breakdown bar */}
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">AI Model Statistical Confidence</span>
            <span className="text-intel-cyan font-bold">94.2%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-tactical-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-intel-cyan rounded-full w-[94%]" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>ResNet-50 Land-Cover v4.2</span>
            <span>p &lt; 0.001</span>
          </div>
        </div>

        {/* Evidence Chain */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
            Synthesized Evidence Chain
          </span>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="p-2 rounded bg-tactical-850 border border-tactical-750 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <div>
                <span className="text-slate-200 font-semibold">Satellite:</span>
                <span className="text-slate-400 ml-1">Sentinel-2 multi-spectral 8-day NDVI delta (-0.31)</span>
              </div>
            </div>

            <div className="p-2 rounded bg-tactical-850 border border-tactical-750 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <span className="text-slate-200 font-semibold">Tender Spec:</span>
                <span className="text-slate-400 ml-1">BBMP approved road ROW width: 32m vs actual 78.5m</span>
              </div>
            </div>

            <div className="p-2 rounded bg-tactical-850 border border-tactical-750 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <div>
                <span className="text-slate-200 font-semibold">Citizen Report:</span>
                <span className="text-slate-400 ml-1">CS-1482 geotagged night trucking photographic log</span>
              </div>
            </div>
          </div>
        </div>

        {/* Potential Issue */}
        <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-950/20 text-xs">
          <span className="font-mono text-[10px] uppercase text-amber-300 font-bold block mb-1">
            Potential Issue
          </span>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Observed heavy earth-moving is inconsistent with public arterial project timeline. Severe risk of flash-flood ponding on ORR during upcoming monsoon.
          </p>
        </div>

      </div>

      {/* Action Triggers Footer */}
      <div className="p-3 border-t border-tactical-700/60 bg-tactical-850 space-y-2">
        <button
          onClick={() => onInvestigate('CS-1042')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-colors shadow-alert-glow"
        >
          <FileSearch className="w-3.5 h-3.5" />
          <span>Launch Investigation Dossier #CS-1042</span>
        </button>

        <button
          onClick={onCompare}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-tactical-700 hover:border-intel-cyan/40 bg-tactical-800 text-slate-300 hover:text-white font-mono text-xs transition-colors"
        >
          <span>Open Split-Screen Comparison</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

    </div>
  );
};
