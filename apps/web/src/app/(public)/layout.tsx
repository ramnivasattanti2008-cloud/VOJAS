import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Shield, MapPin, Search, BarChart3, Wallet, FileText, Satellite } from 'lucide-react';
import { PublicHeaderActions } from '@/components/layout/PublicHeaderActions';

export const metadata: Metadata = {
  title: 'VOJAS — Public Infrastructure Intelligence Platform',
  description: 'Track India MPLAD development projects, analyze geospatial & satellite evidence, and inspect civic budget accountability.',
  robots: { index: true, follow: true },
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Premium Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-sm group-hover:bg-blue-600 transition-colors">
              V
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">VOJAS</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-md">2.0 LIVE</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 tracking-wide">Civic Intelligence</span>
            </div>
          </Link>

          {/* Core Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Explore Projects
            </Link>

            <Link
              href="/explore/map"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Project Map
            </Link>

            <Link
              href="/budget"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              Budget Tracker
            </Link>

            <Link
              href="/insights"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              Sector Analytics
            </Link>

            <Link
              href="/satellites"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              <Satellite className="w-3.5 h-3.5 text-slate-500" />
              Satellite Engine
            </Link>

            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Report Discrepancy
            </Link>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/report"
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-xs hover:bg-blue-700 transition-colors"
            >
              Submit Report
            </Link>
            <PublicHeaderActions />
          </div>
        </div>

        {/* Mobile Quick Links Bar */}
        <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-slate-100/80 border-t border-slate-200 overflow-x-auto text-xs font-medium text-slate-600 no-scrollbar">
          <Link href="/explore" className="px-2.5 py-1 rounded-md hover:bg-white shrink-0">Explore</Link>
          <Link href="/explore/map" className="px-2.5 py-1 rounded-md hover:bg-white shrink-0">Map</Link>
          <Link href="/budget" className="px-2.5 py-1 rounded-md hover:bg-white shrink-0">Budget</Link>
          <Link href="/insights" className="px-2.5 py-1 rounded-md hover:bg-white shrink-0">Analytics</Link>
          <Link href="/satellites" className="px-2.5 py-1 rounded-md hover:bg-white shrink-0">Satellite</Link>
          <Link href="/report" className="px-2.5 py-1 rounded-md hover:bg-white shrink-0">Report</Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  V
                </div>
                <span className="text-base font-bold text-slate-900">VOJAS</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Public infrastructure intelligence platform for Members of Parliament Local Area Development (MPLADS) monitoring. Sourced from official records and Sentinel-2 satellite observations.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Discovery</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link href="/explore" className="hover:text-blue-600">Browse Projects</Link></li>
                <li><Link href="/explore/map" className="hover:text-blue-600">Interactive Project Map</Link></li>
                <li><Link href="/budget" className="hover:text-blue-600">Financial Budget Tracker</Link></li>
                <li><Link href="/insights" className="hover:text-blue-600">Sector Breakdown</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Evidence & Report</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link href="/satellites" className="hover:text-blue-600">Satellite Change Engine</Link></li>
                <li><Link href="/report" className="hover:text-blue-600">Report Project Discrepancy</Link></li>
                <li><Link href="/citizen/offline-drafts" className="hover:text-blue-600">Offline Drafts</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Platform Integrity</h4>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Zero Fabricated Data
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  VOJAS never invents figures or fake status records. Missing or unverified data is explicitly labeled as source-unavailable.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} VOJAS. Built for Indian Civic Transparency &amp; Public Accountability.</p>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="hover:text-slate-800">Privacy</Link>
              <Link href="/about" className="hover:text-slate-800">About</Link>
              <Link href="/contact" className="hover:text-slate-800">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
