import { AnomaliesClient } from './AnomaliesClient';
export const metadata = {
  title: 'Anomalies | VOJAS',
  description: 'View and manage flagged anomalies detected across MPLAD projects.',
};
export default function AnomaliesPage() {
  return <AnomaliesClient />;
}
