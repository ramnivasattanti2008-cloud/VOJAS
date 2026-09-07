import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Force all dashboard pages to render dynamically (not statically).
// These pages are authenticated and interactive — they should never
// be statically prerendered.
export const dynamic = 'force-dynamic';

// Force all dashboard pages to render dynamically (not statically).
// These pages are authenticated and interactive — they should never
// be statically prerendered.
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: {
    template: '%s | VOJAS',
    default: 'Dashboard | VOJAS',
  },
  robots: { index: false, follow: false },
  other: {
    'theme-color': '#1e40af',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VOJAS',
  },
};
import { Header } from '@/components/layout/Header';
import { AuthGate } from '@/components/auth/AuthGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-vojas-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-vojas-400"
      >
        Skip to main content
      </a>
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main id="main-content" className="flex-1 p-6" role="main">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
