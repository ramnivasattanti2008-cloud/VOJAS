'use client';

import { AICopilotDrawer } from '@/components/ai-agent/AICopilotDrawer';
import {
  ArrowRight,
  FileSpreadsheet,
  Satellite,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export interface ShowcaseProjectItem {
  id: string;
  title: string;
  location: string;
  category: 'GHOST_WORK' | 'FINANCIAL_ANOMALY' | 'ONGOING_VERIFIED' | 'COMPLETED_CLEAN';
  badgeLabel: string;
  disbursedPercent: number;
  physicalProgress: number;
  disbursedAmount: string;
  satelliteObservation: string;
  statutoryFlag: string;
  description: string;
}

export const FEATURED_SHOWCASE_PROJECTS: ShowcaseProjectItem[] = [
  {
    id: 'showcase-fraud-1',
    title: 'Integrated Community Hall & Senior Citizen Center (Sector 4)',
    location: 'Bhubaneswar / Kalahandi, Odisha',
    category: 'GHOST_WORK',
    badgeLabel: '🚨 CRITICAL GHOST WORK',
    disbursedPercent: 88,
    physicalProgress: 0,
    disbursedAmount: '₹86,00,000 (88% released)',
    satelliteObservation: 'ISRO NavIC coordinates locked. Sentinel-2 shows persistent barren scrubland; zero structural elevation.',
    statutoryFlag: 'GFR Rule 171 Violation (Excessive advance without physical progress)',
    description: 'High-consequence ghost asset detection. Funds disbursed to contractor without ground execution.',
  },
  {
    id: 'showcase-fin-1',
    title: 'High School Modern Science Lab & Digital Library Complex',
    location: 'Bhubaneswar, Odisha',
    category: 'FINANCIAL_ANOMALY',
    badgeLabel: '⚠️ AUDITED ANOMALY',
    disbursedPercent: 94,
    physicalProgress: 25,
    disbursedAmount: '₹42,50,000 (94% released)',
    satelliteObservation: 'Foundation excavated; rooftop completion falsely logged in administrative books.',
    statutoryFlag: 'CVC Circular 02/05/2022 (Measurement Book reconciliation failure)',
    description: 'Severe fiscal disbursement mismatch. Financial payout severely outpaces physical progress.',
  },
  {
    id: 'showcase-ong-1',
    title: 'Model Anganwadi & Early Child Nutrition Center',
    location: 'Jatni, Khordha, Odisha',
    category: 'ONGOING_VERIFIED',
    badgeLabel: '🏗️ ACTIVE ONGOING',
    disbursedPercent: 65,
    physicalProgress: 60,
    disbursedAmount: '₹18,20,000 (65% released)',
    satelliteObservation: 'Multi-spectral NDBI confirms brickwork and roof slab installation in progress.',
    statutoryFlag: 'Compliant with GFR Rule 157 (Milestone stage vouchers verified)',
    description: 'Normal compliant civic asset. Progress is steady and conforms to verified work orders.',
  },
  {
    id: 'cmtwjxvip000n932octqrfpw7',
    title: 'Model Government High School & Modern Science Wing',
    location: 'Bangalore Urban, Karnataka',
    category: 'COMPLETED_CLEAN',
    badgeLabel: '✅ VERIFIED COMPLETE',
    disbursedPercent: 100,
    physicalProgress: 100,
    disbursedAmount: '₹1,20,00,000 (100% utilized)',
    satelliteObservation: 'Sentinel-2 L2A optical change detection confirms completed two-story structure.',
    statutoryFlag: 'Final Utilization Certificate (UC) & Completion Certificate logged',
    description: 'Exemplary public infrastructure delivery with full multi-temporal satellite confirmation.',
  },
];

export function ShowcaseBanner({ className = '' }: { className?: string }) {
  const [activeCopilotProject, setActiveCopilotProject] = useState<{ id: string; name: string } | null>(null);

  return (
    <div
      className={`rounded-2xl border border-purple-200/80 bg-linear-to-br from-purple-50/90 via-slate-50 to-indigo-50/70 p-5 sm:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-purple-100/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-300" />
              SIH Evaluator Quick-Access
            </span>
            <span className="text-xs text-purple-700 font-semibold hidden sm:inline">
              4 Premier Forensic Demonstrations
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Featured Forensic Showcase Projects
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Test instant AI auditing, ISRO NavIC sovereign positioning, satellite spectral telemetry, and statutory GFR/CVC checks across high-consequence civic cases.
          </p>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-100/50 shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
          <span>Open Judges AI Sandbox</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURED_SHOWCASE_PROJECTS.map((proj) => {
          const isGhost = proj.category === 'GHOST_WORK';
          const isAnomaly = proj.category === 'FINANCIAL_ANOMALY';
          const isOngoing = proj.category === 'ONGOING_VERIFIED';

          const borderStyle = isGhost
            ? 'border-rose-200/90 hover:border-rose-400 bg-linear-to-b from-white to-rose-50/40'
            : isAnomaly
            ? 'border-amber-200/90 hover:border-amber-400 bg-linear-to-b from-white to-amber-50/40'
            : isOngoing
            ? 'border-blue-200/90 hover:border-blue-400 bg-linear-to-b from-white to-blue-50/40'
            : 'border-emerald-200/90 hover:border-emerald-400 bg-linear-to-b from-white to-emerald-50/40';

          const badgeColor = isGhost
            ? 'bg-rose-100 text-rose-800 border-rose-200'
            : isAnomaly
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : isOngoing
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200';

          return (
            <div
              key={proj.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${borderStyle}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${badgeColor}`}
                  >
                    {proj.badgeLabel}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {proj.id.slice(0, 14)}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {proj.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{proj.location}</p>
                </div>

                {/* Progress Comparison Bars */}
                <div className="space-y-1.5 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                      <span>Fund Disbursed:</span>
                      <span className="font-bold text-slate-900">{proj.disbursedPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isGhost
                            ? 'bg-rose-600'
                            : isAnomaly
                            ? 'bg-amber-500'
                            : isOngoing
                            ? 'bg-blue-600'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${proj.disbursedPercent}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                      <span>Physical Ground Progress:</span>
                      <span
                        className={`font-bold ${
                          proj.physicalProgress === 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {proj.physicalProgress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          proj.physicalProgress === 0
                            ? 'bg-slate-300'
                            : isOngoing
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${proj.physicalProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Telemetry snippet */}
                <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60 text-[10px] space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Satellite className="w-3 h-3 text-indigo-600" />
                    <span>ISRO NavIC &amp; Satellite Telemetry</span>
                  </div>
                  <p className="text-slate-600 leading-snug line-clamp-2">
                    {proj.satelliteObservation}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-2">
                <Link
                  href={`/explore/${proj.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition-all shadow-2xs"
                >
                  <span>Dossier</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveCopilotProject({ id: proj.id, name: proj.title })}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all cursor-pointer shrink-0"
                  title="Run AI Copilot Audit"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Audit</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeCopilotProject && (
        <AICopilotDrawer
          isOpen={Boolean(activeCopilotProject)}
          onClose={() => setActiveCopilotProject(null)}
          contextProjectId={activeCopilotProject.id}
          contextProjectName={activeCopilotProject.name}
        />
      )}
    </div>
  );
}

