import { NotificationsClient } from './NotificationsClient';

export const metadata = {
  title: 'Notifications | VOJAS',
  description: 'Your notification center — anomaly alerts, report updates, and system messages.',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
