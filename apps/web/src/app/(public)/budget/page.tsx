import type { Metadata } from 'next';
import { BudgetTrackerClient } from './BudgetTrackerClient';

export const metadata: Metadata = {
  title: 'Budget Tracker | VOJAS',
  description: 'MPLAD fund sanctioned and spent amounts by state, sector, and project.',
};

export default function BudgetPage() {
  return <BudgetTrackerClient />;
}
