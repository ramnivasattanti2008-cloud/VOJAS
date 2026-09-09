import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExploreClient } from './ExploreClient';

export const metadata: Metadata = {
  title: 'Explore Projects | VOJAS',
  description: 'Search and filter MPLAD projects by state, district, sector, and status.',
};

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreClient />
    </Suspense>
  );
}
