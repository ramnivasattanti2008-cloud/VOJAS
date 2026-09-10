import { AdminReportsClient } from './AdminReportsClient';

export const metadata = {
  title: 'Report Moderation | VOJAS',
  description: 'Moderate, triage, and manage citizen reports and whistleblower submissions.',
};

export default function AdminReportsPage() {
  return <AdminReportsClient />;
}
