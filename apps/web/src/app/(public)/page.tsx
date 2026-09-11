import Link from 'next/link';
import {
  Search,
  MapPin,
  ShieldCheck,
  Satellite,
  FileWarning,
  ArrowRight,
  Wallet,
  BarChart3,
  Layers,
  Sparkles,
  CheckCircle2,
  Building2,
  Users,
  Landmark,
  HardHat,
} from 'lucide-react';
import { ShowcaseProjectSelector } from '@/components/projects/ShowcaseProjectSelector';

interface PublicSummary {
  totalProjects: number;
  totalSanctioned: number;
  totalSpent: number;
}

/**
 * Returns null when the registry cannot be reached. It must never fall back to
 * a stand-in figure: these numbers are read as national public-spending totals,
 * and a reader cannot tell an invented one from a real one.
 */
async function getSummaryData(): Promise<PublicSummary | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_INTERNAL_URL || 'http://localhost:5000';
    const res = await fetch(`${apiUrl}/api/v1/projects/public/summary`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data as PublicSummary | undefined;
    if (
      !data ||
      typeof data.totalProjects !== 'number' ||
      typeof data.totalSanctioned !== 'number' ||
      typeof data.totalSpent !== 'number'
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const summary = await getSummaryData();

  return (
    <div className="space-y-12">
      {/* Role-Based Authentication Portal Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center font-black text-base shadow-xs shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Select Your Access Portal</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                1-Click Sign In
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Role-specific interfaces for Citizens, Members of Parliament, Vigilance Officers, and Contractors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
          >
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>Citizen</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/30 transition-all"
          >
            <Landmark className="h-3.5 w-3.5 text-purple-300" />
            <span>MP Oversight</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-all"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-rose-300" />
            <span>Vigilance Officer</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 transition-all"
          >
            <HardHat className="h-3.5 w-3.5 text-amber-300" />
            <span>Contractor</span>
          </Link>
        </div>
      </div>
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-3xl gradient-civic-hero text-white p-8 sm:p-12 lg:p-16 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Public Infrastructure Intelligence
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Every Rupee Accounted For. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              Verified from Orbit to Ground.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
            VOJAS connects official Parliamentary MPLADS sanction registries with Sentinel-2 Earth observation satellites, automated audit algorithms, and citizen field reports.
          </p>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5"
            >
              <Search className="h-4 w-4" />
              Explore Real Projects
            </Link>
            <Link
              href="/explore/map"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all"
            >
              <MapPin className="h-4 w-4 text-blue-400" />
              Open Project Map
            </Link>
          </div>
        </div>

        {/* Registry totals — real figures only, or an explicit unavailable state */}
        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-6 text-slate-300 text-xs">
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? summary.totalProjects.toLocaleString('en-IN') : <span className="text-slate-500">—</span>}
            </div>
            <div className="text-slate-400 font-medium mt-0.5">MPLADS Works Monitored</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? `₹${(summary.totalSanctioned / 10000000).toFixed(1)} Cr` : <span className="text-slate-500">—</span>}
            </div>
            <div className="text-slate-400 font-medium mt-0.5">Sanctioned Public Funds</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? `₹${(summary.totalSpent / 10000000).toFixed(1)} Cr` : <span className="text-slate-500">—</span>}
            </div>
            <div className="text-slate-400 font-medium mt-0.5">Reported Fund Utilization</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">Sentinel-2</div>
            <div className="text-slate-400 font-medium mt-0.5">10m Multispectral Verification</div>
          </div>
        </div>

        {!summary && (
          <p className="mt-4 text-xs text-slate-400" role="status" data-unavailable-reason="SOURCE_UNAVAILABLE">
            Registry totals are temporarily unavailable — the project database could not be reached.
            No estimated figures are shown in their place.
          </p>
        )}
      </section>

      {/* 13 Curated Construction Showcase & Weekly Satellite AI Fraud Detector */}
      <section className="p-6 sm:p-8 bg-slate-50 border border-slate-200/90 rounded-3xl shadow-sm">
        <ShowcaseProjectSelector />
      </section>

      {/* Core Platform Pillars */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">Platform Capabilities</h2>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Four Pillars of Civic Accountability</h3>
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            Combining official records, spatial analytics, satellite imagery, and citizen participation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Search className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Project Discovery</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Filter official records by state, district, constituency, sector, and sanction status to find local works.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MapPin className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Geospatial Intelligence</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Interactive MapLibre vector maps with project markers, constituency bounds, and spatial clustering.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Satellite className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Satellite Change Detection</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Compare reported progress against Sentinel-2 L2A optical band observations with transparent fallback states.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <FileWarning className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Citizen Reporting</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submit ground-truth discrepancy reports anonymously. AI risk signals flag anomalies for human verification.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Spotlights / Action Cards */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Explore Platform Modules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Map Spotlight */}
          <Link
            href="/explore/map"
            className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                  <MapPin className="w-3 h-3" /> Spatial Map View
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Interactive Project Map
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  View project markers across India with real coordinates, sector color coding, and quick project popups.
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
                  <Wallet className="w-3 h-3" /> Financial Transparency
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  MPLAD Fund Budget Tracker
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  Inspect sanctioned vs. spent amounts, expenditure utilization rates, and sector fund distribution.
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
                  <BarChart3 className="w-3 h-3" /> Sector Analytics
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  16-Sector Infrastructure Analytics
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  Distribution analysis across Roads, Drinking Water, Education, Health, Irrigation, and Social Welfare.
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
                  <FileWarning className="w-3 h-3" /> Public Accountability
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Submit a Discrepancy Report
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  Observe incomplete or delayed works? Submit a citizen report with description and ground details.
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
              <ShieldCheck className="w-4 h-4" /> Strict Anti-Fabrication Guarantee
            </div>
            <h3 className="text-xl font-bold text-white">Truthful Civic Data &amp; Honest Empty States</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              VOJAS strictly enforces source attribution. Missing numbers, satellite imagery, or audit trails are displayed as explicitly unavailable rather than filled with invented or random placeholder values.
            </p>
          </div>
          <Link
            href="/about"
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            Read Platform Charter
          </Link>
        </div>
      </section>
    </div>
  );
}
