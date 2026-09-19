'use client';

import { ShowcaseBanner } from '@/components/transparency/ShowcaseBanner';
import { useLanguage } from '@/i18n/LanguageContext';
import {
    ArrowRight,
    BarChart3,
    FileWarning,
    MapPin,
    Satellite,
    Search,
    ShieldCheck,
    Sparkles,
    Wallet,
} from 'lucide-react';
import Link from 'next/link';

export function HomeClient() {
  const { t } = useLanguage();

  return (
    <div className="space-y-16">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-3xl gradient-civic-hero text-white p-8 sm:p-12 lg:p-16 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            {t('home.heroBadge', 'Public Infrastructure Intelligence')}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
            {t('home.heroTitle', "Track, Analyze & Audit India's MPLAD Projects with Real Evidence")}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            {t(
              'home.heroDesc',
              "VOJAS is an anti-corruption public accountability platform for India's Members of Parliament Local Area Development (MPLADS) scheme. Inspect government project records, track spending, view ISRO NavIC sovereign positioning and satellite observations, and report ground-level discrepancies."
            )}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-md hover:shadow-blue-600/30"
            >
              <Search className="h-4 w-4" />
              {t('home.exploreProjects', 'Explore Projects')}
            </Link>
            <Link
              href="/explore/map"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-100 bg-slate-800/80 border border-slate-700/80 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all"
            >
              <MapPin className="h-4 w-4 text-blue-400" />
              {t('home.openProjectMap', 'Open Project Map')}
            </Link>
          </div>
        </div>

        {/* Real Data Highlights Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-6 text-slate-300 text-xs">
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{t('home.monitoredWorks', '60,000+')}</div>
            <div className="text-slate-400 font-medium mt-0.5">{t('home.monitoredWorksLabel', 'MPLADS Works Monitored')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{t('home.sectorsStat', '16 Sectors')}</div>
            <div className="text-slate-400 font-medium mt-0.5">{t('home.sectorsStatLabel', 'Transport, Water, Health & Edu')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{t('home.isroNavic', 'ISRO NavIC')}</div>
            <div className="text-slate-400 font-medium mt-0.5">{t('home.isroNavicLabel', 'NavIC & Earth Observation')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{t('home.honestData', '100% Honest')}</div>
            <div className="text-slate-400 font-medium mt-0.5">{t('home.honestDataLabel', 'Zero Fabricated Civic Figures')}</div>
          </div>
        </div>
      </section>

      {/* Featured Forensic Showcase Banner for SIH Evaluators */}
      <ShowcaseBanner />

      {/* Core Platform Pillars */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">
              {t('home.capabilitiesTitle', 'Platform Capabilities')}
            </h2>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {t('home.capabilitiesSubtitle', 'Four Pillars of Civic Accountability')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            {t('home.capabilitiesDesc', 'Combining official records, spatial analytics, satellite imagery, and citizen participation.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Search className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{t('home.pillar1Title', 'Project Discovery')}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('home.pillar1Desc', 'Filter official records by state, district, constituency, sector, and sanction status to find local works.')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MapPin className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{t('home.pillar2Title', 'Geospatial Intelligence')}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('home.pillar2Desc', 'Interactive MapLibre vector maps with project markers, constituency bounds, and spatial clustering.')}
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Satellite className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{t('home.pillar3Title', 'ISRO NavIC & Satellite Telemetry')}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('home.pillar3Desc', "Verify works with India's indigenous ISRO NavIC sovereign positioning and multi-spectral satellite surface change detection.")}
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <FileWarning className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{t('home.pillar4Title', 'Citizen Reporting')}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('home.pillar4Desc', 'Submit ground-truth discrepancy reports anonymously. AI risk signals flag anomalies for human verification.')}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Spotlights / Action Cards */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">{t('home.modulesTitle', 'Explore Platform Modules')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Map Spotlight */}
          <Link
            href="/explore/map"
            className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                  <MapPin className="w-3 h-3" /> {t('home.spatialMapTag', 'Spatial Map View')}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {t('home.spatialMapTitle', 'Interactive Project Map')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  {t('home.spatialMapDesc', 'View project markers across India with real coordinates, sector color coding, and quick project popups.')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Budget Spotlight */}
          <Link
            href="/budget"
            className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                  <Wallet className="w-3 h-3" /> {t('home.budgetTag', 'Financial Transparency')}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {t('home.budgetTitle', 'MPLAD Fund Budget Tracker')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  {t('home.budgetDesc', 'Inspect sanctioned vs. spent amounts, expenditure utilization rates, and sector fund distribution.')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Sector Analytics Spotlight */}
          <Link
            href="/insights"
            className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold uppercase tracking-wider">
                  <BarChart3 className="w-3 h-3" /> {t('home.analyticsTag', 'Sector Analytics')}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {t('home.analyticsTitle', '16-Sector Infrastructure Analytics')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  {t('home.analyticsDesc', 'Distribution analysis across Roads, Drinking Water, Education, Health, Irrigation, and Social Welfare.')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Citizen Report Spotlight */}
          <Link
            href="/report"
            className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider">
                  <FileWarning className="w-3 h-3" /> {t('home.reportingTag', 'Public Accountability')}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {t('home.reportingTitle', 'Submit a Discrepancy Report')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  {t('home.reportingDesc', 'Observe incomplete or delayed works? Submit a citizen report with description and ground details.')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Data Integrity Commitment */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> {t('home.guaranteeTag', 'Strict Anti-Fabrication Guarantee')}
            </div>
            <h3 className="text-xl font-bold text-white">{t('home.guaranteeTitle', 'Truthful Civic Data & Honest Empty States')}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t(
                'home.guaranteeDesc',
                'VOJAS strictly enforces source attribution. Missing numbers, satellite imagery, or audit trails are displayed as explicitly unavailable rather than filled with invented or random placeholder values.'
              )}
            </p>
          </div>
          <Link
            href="/about"
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            {t('home.readCharter', 'Read Platform Charter')}
          </Link>
        </div>
      </section>
    </div>
  );
}

