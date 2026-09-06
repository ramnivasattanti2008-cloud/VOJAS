import type { Metadata } from 'next';
import { ReportForm } from '@/components/citizenReports/ReportForm';

export const metadata: Metadata = {
  title: 'Submit a Report | VOJAS',
  description:
    'Submit a citizen report about public project issues. Help ensure MPLAD projects are built correctly and on time. Anonymous submissions welcome.',
  openGraph: {
    title: 'Submit a Report | VOJAS',
    description: 'Report what you observed. Help ensure accountability for public projects.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function ReportPage() {
  return <ReportForm />;
}
