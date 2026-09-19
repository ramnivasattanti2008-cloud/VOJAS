import { HomeClient } from '@/components/home/HomeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VOJAS — Public Infrastructure Intelligence Platform',
  description:
    'Track, analyze & audit India MPLAD development projects with real evidence, ISRO NavIC satellite positioning, and forensic civic auditing.',
};

export default function HomePage() {
  return <HomeClient />;
}
