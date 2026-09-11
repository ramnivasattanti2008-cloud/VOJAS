import React from 'react';
import { 
  Play, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Satellite, 
  SplitSquareVertical, 
  Brain, 
  FileSearch 
} from 'lucide-react';
import { ViewType } from '../layout/TacticalSidebar';

export interface DemoStep {
  step: number;
  title: string;
  description: string;
  targetView: ViewType;
  badge: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: 'Command Center & Live Alerts',
    description: 'Autonomous Sentinel-2 pipeline identifies 7 active critical anomalies across 12,842 monitored Indian civic assets.',
    targetView: 'dashboard',
    badge: 'OPERATIONAL TELEMETRY'
  },
  {
    step: 2,
    title: 'Geospatial GIS Target Location',
    description: 'Zooming into the Bengaluru Outer Ring Road Corridor. BBMP road project tender boundary and 2.84 ha excavation flagged.',
    targetView: 'map',
    badge: 'GIS SENSOR SWATH'
  },
  {
    step: 3,
    title: 'Multi-Epoch Satellite Timeline',
    description: 'Scrubbing 2026 historical passes. Baseline vegetation (NDVI 0.54) drops sharply after 31 August pass.',
    targetView: 'timeline',
    badge: 'TEMPORAL SCRUBBER'
  },
  {
    step: 4,
    title: 'Split-Screen Temporal Comparison',
    description: 'Direct comparison slider: 31 Aug vs 08 Sep. Spectral difference mode reveals 28,400 sq.m stripped surface.',
    targetView: 'compare',
    badge: 'MULTI-SPECTRAL COMPARE'
  },
  {
    step: 5,
    title: 'Change Detection & Spectral Polygon',
    description: 'Classification as Unauthorized Earth Excavation. 94% statistical confidence outside BBMP approved corridor.',
    targetView: 'changes',
    badge: 'SPECTRAL DELTA'
  },
  {
    step: 6,
    title: 'AI Risk Intelligence Matrix',
    description: 'Evaluating flash-flood hazard to 42,000 residents. Strictly distinguishing observed satellite data from AI inference.',
    targetView: 'risks',
    badge: 'EPISTEMIC RISK'
  },
  {
    step: 7,
    title: 'Civic Vigilance Investigation Docket',
    description: 'Case CS-1042: Synthesizing satellite imagery, citizen report #CS-1482, tender specs, and exportable legal brief.',
    targetView: 'investigations',
    badge: 'FORMAL ACTION'
  }
];

interface GuidedDemoWalkthroughProps {
  currentStep: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToStep: (stepIndex: number) => void;
}

export const GuidedDemoWalkthrough: React.FC<GuidedDemoWalkthroughProps> = ({
  currentStep,
  isOpen,
  onClose,
  onNext,
  onPrev,
  onJumpToStep
}) => {
  if (!isOpen) return null;

  const activeStep = DEMO_STEPS[currentStep] || DEMO_STEPS[0];
  const isLast = currentStep === DEMO_STEPS.length - 1;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border-2 border-intel-cyan/60 bg-tactical-950/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3">
        
        {/* Top bar with step tracker */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-intel-cyan animate-pulse" />
            <span className="font-mono text-xs font-bold text-intel-cyan uppercase tracking-wider">
              DEMO SCENARIO · BENGALURU CORRIDOR ANOMALY
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tactical-800 text-slate-300 border border-tactical-700">
              STEP {currentStep + 1} OF {DEMO_STEPS.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-tactical-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="flex items-start gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-intel-cyan/15 border border-intel-cyan/40 flex items-center justify-center text-intel-cyan shrink-0 mt-0.5 shadow-intel-glow">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white font-sans">
                {activeStep.title}
              </h4>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-semibold">
                {activeStep.badge}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
              {activeStep.description}
            </p>
          </div>
        </div>

        {/* Bottom Navigator Buttons & Progress Dots */}
        <div className="flex items-center justify-between pt-2 border-t border-tactical-800">
          
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {DEMO_STEPS.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => onJumpToStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-intel-cyan w-6'
                    : idx < currentStep
                    ? 'bg-emerald-500'
                    : 'bg-tactical-700 hover:bg-slate-500'
                }`}
                title={`Jump to Step ${s.step}: ${s.title}`}
              />
            ))}
          </div>

          {/* Prev / Next controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={onPrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-tactical-750 bg-tactical-850 hover:bg-tactical-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <button
              onClick={onNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-bold transition-all shadow-intel-glow"
            >
              <span>{isLast ? 'Restart Tour' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
