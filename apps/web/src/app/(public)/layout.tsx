import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicHeaderActions } from '@/components/layout/PublicHeaderActions';
import { PublicMobileNavBar, PublicNavBar } from '@/components/layout/PublicNavBar';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
          <PublicNavBar />

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="button" />
            <PublicHeaderActions />
          </div>
        </div>

        {/* Mobile Quick Links Bar */}
        <PublicMobileNavBar />
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Localized Reactive Public Footer */}
      <PublicFooter />
    </div>
  );
}
