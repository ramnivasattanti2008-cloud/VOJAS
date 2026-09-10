import MPsClient from './MPsClient';

export const metadata = {
  title: 'Members of Parliament | VOJAS',
  description: 'Browse Lok Sabha and Rajya Sabha MPs with MPLAD project allocations.',
};

export default function MPsPage() {
  return <MPsClient />;
}
