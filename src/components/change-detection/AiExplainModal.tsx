import React from 'react';
import { X, Brain, Sparkles, Satellite, FileCheck, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import { EpistemicBadge } from '../ui/Badges';
import { ChangeEvent } from '../../types/civicshield';

interface AiExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeEvent: ChangeEvent;
  onOpenInvestigation: (id: string) => void;
}

export const AiExplainModal: React.FC<AiExplainModalProps> = ({
  isOpen,
  onClose,
  changeEvent,
  onOpenInvestigation
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-purple-500/40 bg-tactical-900 shadow-2xl p-6 text-left my-8 select-none">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-tactical-750">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-intel-glow">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-purple-400 font-bold uppercase">
                  EXPLAINABLE AI REASONING MODEL
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                  {changeEvent.confidenceScore}% Statistical Confidence
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Change Event #{changeEvent.id}: Physical Evidence Synthesis
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-tactical-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-4">
          
          {/* Detailed Narrative */}
          <div className="p-3.5 rounded-xl bg-tactical-850 border border-tactical-750 text-xs text-slate-200 leading-relaxed font-sans">
            <strong className="text-white block font-mono text-xs uppercase mb-1">
              Automated Synthesis Finding:
            </strong>
            {changeEvent.detailedExplanation}
          </div>

          {/* Epistemic Evidence Breakdown */}
          <div className="space-y-2.5">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block font-semibold">
              Ground-Truth &amp; Sensor Telemetry Chain
            </span>

            <div className="space-y-2">
              {changeEvent.evidenceItems.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-tactical-850/80 border border-tactical-800 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 font-mono">{ev.title}</span>
                    <EpistemicBadge source={ev.type} size="sm" />
                  </div>
                  <p className="text-slate-400 font-mono text-[11px] mt-0.5 leading-normal">
                    {ev.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Epistemic Distinction Disclaimer */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-tactical-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-intel-cyan font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CIVICSHIELD TRUST STANDARD</span>
            </div>
            <p>
              AI inference generates statistical hypotheses based on spectral reflectance deltas. It does not replace sworn municipal surveyor verification.
            </p>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-tactical-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-tactical-700 bg-tactical-800 text-slate-300 hover:text-white font-mono text-xs transition-colors"
          >
            Dismiss
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenInvestigation(changeEvent.id);
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-alert-glow"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Open Formal Investigation Docket</span>
          </button>
        </div>

      </div>
    </div>
  );
};
