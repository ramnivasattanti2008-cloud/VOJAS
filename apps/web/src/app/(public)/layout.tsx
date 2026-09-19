import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicHeaderActions } from '@/components/layout/PublicHeaderActions';
import { PublicMobileNavBar, PublicNavBar } from '@/components/layout/PublicNavBar';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { LogoMark } from '@/components/ui/Logo';
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
    <div className="min-h-screen flex flex-col bg-[#F2F2F7] text-[#1C1C1E] selection:bg-[#007AFF] selection:text-white">
      {/* Premium Sticky Navigation Header */}
      <header className="sticky top-0 z-50 ios-material-thick ios-hairline-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0 active:scale-[0.97] transition-transform">
            <LogoMark size={36} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-[#1C1C1E]">VOJAS</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] rounded-[6px]">2.0 Live</span>
              </div>
              <span className="text-[10px] font-medium text-[#8E8E93] tracking-wide">Civic Intelligence</span>
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
