import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';
import { InstallPrompt } from '@/components/ui/InstallPrompt';

export const metadata: Metadata = {
  title: 'VOJAS — Accountability',
  description: 'MPLAD accountability platform — VOJAS 2.0',
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VOJAS',
  },
  openGraph: {
    title: 'VOJAS — MPLAD Accountability Platform',
    description: 'Track MPLAD projects, report anomalies, monitor spending.',
    type: 'website',
    siteName: 'VOJAS',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VOJAS" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <InstallPrompt />
      </body>
    </html>
  );
}
