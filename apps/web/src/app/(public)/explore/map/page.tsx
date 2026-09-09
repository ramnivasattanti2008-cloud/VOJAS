import type { Metadata } from 'next';
import { ExploreMapClient } from './ExploreMapClient';

export const metadata: Metadata = {
  title: 'Map | VOJAS',
  description: 'MPLAD project locations on a map, using real recorded coordinates only.',
};

export default function ExploreMapPage() {
  return <ExploreMapClient />;
}
