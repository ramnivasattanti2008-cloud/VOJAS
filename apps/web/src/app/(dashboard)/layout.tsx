import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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
};
import { Header } from '@/components/layout/Header';
import { AuthGate } from '@/components/auth/AuthGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6" role="main">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
