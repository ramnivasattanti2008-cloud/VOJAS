import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';
import { InstallPrompt } from '@/components/ui/InstallPrompt';

export const metadata: Metadata = {
  title: 'VOJAS — Accountability',
  description: 'MPLAD accountability platform — VOJAS 2.0',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        {/*
          Typeface pairing:
          - IBM Plex Sans: UI / display face. Built by IBM for enterprise and
            engineering products — carries real character (distinctive "a",
            "l", "G") without reading as a generic "AI startup" sans like
            Inter/Poppins/Manrope.
          - IBM Plex Mono: data / tabular face, used via `font-mono` for
            reference IDs, coordinates, timestamps and ledger figures —
            already the pattern used across the app.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <InstallPrompt />
      </body>
    </html>
  );
}
