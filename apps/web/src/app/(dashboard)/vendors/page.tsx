import VendorsClient from './VendorsClient';

export const metadata = {
  title: 'Vendors | VOJAS',
  description: 'Browse and manage vendors and contractors associated with MPLAD projects.',
};

export default function VendorsPage() {
  return <VendorsClient />;
}
