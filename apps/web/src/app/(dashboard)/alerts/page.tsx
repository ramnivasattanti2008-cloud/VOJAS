import { AlertsClient } from './AlertsClient';

export const metadata = {
  title: 'Alerts | VOJAS',
  description: 'Active alerts and escalations requiring attention.',
};

export default function AlertsPage() {
  return <AlertsClient />;
}
