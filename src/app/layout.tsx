import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CIVICSHIELD AI — Geospatial Civic Intelligence Command Platform',
  description: 'See What Changed. Know What Matters. Act Before It’s Too Late. AI-powered satellite monitoring and civic risk intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-intel-cyan selection:text-black">
        {children}
      </body>
    </html>
  );
}
