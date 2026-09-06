import { ReportsClient } from './ReportsClient';
export const metadata = {
  title: 'Citizen Reports | VOJAS',
  description: 'Public citizen reports and whistleblower submissions for MPLAD projects.',
};
export default function ReportsPage() {
  return <ReportsClient />;
}
