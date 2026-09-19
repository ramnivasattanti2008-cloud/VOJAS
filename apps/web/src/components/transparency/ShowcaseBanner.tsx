'use client';

import { AICopilotDrawer } from '@/components/ai-agent/AICopilotDrawer';
import { useLanguage } from '@/i18n/LanguageContext';
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
  const { t } = useLanguage();
  const [activeCopilotProject, setActiveCopilotProject] = useState<{ id: string; name: string } | null>(null);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-slate-100 ${className}`}
    >
      {/* Subtle tactical ambient illumination */}
      <div className="absolute top-0 right-1/4 -mt-12 w-96 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-96 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {t('showcase.quickAccess', 'SIH Evaluator Quick-Access')}
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {t('showcase.premierDemos', '4 Premier Forensic Demonstrations')}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-1.5">
            {t('showcase.title', 'Featured Forensic Showcase Projects')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {t(
              'showcase.subtitle',
              'Test instant AI auditing, ISRO NavIC sovereign positioning, satellite spectral telemetry, and statutory GFR/CVC checks across high-consequence civic cases.'
            )}
          </p>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/90 shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0 group"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
          <span>{t('showcase.openSandbox', 'Open Judges AI Sandbox')}</span>
          <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURED_SHOWCASE_PROJECTS.map((proj) => {
          const isGhost = proj.category === 'GHOST_WORK';
          const isAnomaly = proj.category === 'FINANCIAL_ANOMALY';
          const isOngoing = proj.category === 'ONGOING_VERIFIED';

          const cardBorder = isGhost
            ? 'border-rose-900/70 hover:border-rose-500/80 bg-linear-to-b from-slate-900/95 to-rose-950/20'
            : isAnomaly
            ? 'border-amber-900/70 hover:border-amber-500/80 bg-linear-to-b from-slate-900/95 to-amber-950/20'
            : isOngoing
            ? 'border-sky-900/70 hover:border-sky-500/80 bg-linear-to-b from-slate-900/95 to-sky-950/20'
            : 'border-emerald-900/70 hover:border-emerald-500/80 bg-linear-to-b from-slate-900/95 to-emerald-950/20';

          const badgeClass = isGhost
            ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
            : isAnomaly
            ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
            : isOngoing
            ? 'bg-sky-950/80 text-sky-300 border-sky-800/80'
            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';

          const localizedBadge = isGhost
            ? `🚨 ${t('showcase.ghostWork', 'CRITICAL GHOST WORK')}`
            : isAnomaly
            ? `⚠️ ${t('showcase.auditedAnomaly', 'AUDITED ANOMALY')}`
            : isOngoing
            ? `🏗️ ${t('showcase.activeOngoing', 'ACTIVE ONGOING')}`
            : `✅ ${t('showcase.verifiedCompleted', 'VERIFIED COMPLETED')}`;

          return (
            <div
              key={proj.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${cardBorder}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${badgeClass}`}
                  >
                    {localizedBadge}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {proj.id.slice(0, 14)}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {proj.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{proj.location}</p>
                </div>

                {/* High-Contrast Disparity Telemetry */}
                <div className="rounded-lg bg-black/40 border border-slate-800/80 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{t('showcase.disbursed', 'Disbursed:')}</span>
                    <span className="font-mono font-bold text-white">{proj.disbursedPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isGhost
                          ? 'bg-rose-500'
                          : isAnomaly
                          ? 'bg-amber-400'
                          : isOngoing
                          ? 'bg-sky-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${proj.disbursedPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">{t('showcase.physicalExecution', 'Ground Progress:')}</span>
                    <span
                      className={`font-mono font-bold ${
                        proj.physicalProgress === 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {proj.physicalProgress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        proj.physicalProgress === 0
                          ? 'bg-slate-700'
                          : isOngoing
                          ? 'bg-sky-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${proj.physicalProgress}%` }}
                    />
                  </div>
                </div>

                {/* Telemetry snippet */}
                <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 text-[10px] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-orange-400 font-mono">
                    <Satellite className="w-3 h-3 text-orange-400 shrink-0" />
                    <span>{t('home.pillar3Title', 'ISRO NavIC & Satellite')}</span>
                  </div>
                  <p className="text-slate-300 leading-snug line-clamp-2">
                    {proj.satelliteObservation}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center gap-2">
                <Link
                  href={`/explore/${proj.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs"
                >
                  <span>{t('projects.projectDetails', 'Dossier')}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveCopilotProject({ id: proj.id, name: proj.title })}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
                  title={t('showcase.auditCopilot', 'Audit with AI Copilot')}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t('showcase.auditCopilot', 'AI Audit')}</span>
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

