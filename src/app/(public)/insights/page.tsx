import type { Metadata } from 'next';
import { AnalyticsClient } from './AnalyticsClient';

export const metadata: Metadata = {
  title: 'Analytics | VOJAS',
  description: 'MPLAD project counts and status by sector.',
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
