import { MapViewClient } from './MapViewClient';

export const metadata = {
  title: 'Map View | VOJAS',
  description: 'Interactive India map showing MPLAD project locations and clusters.',
};

export default function MapViewPage() {
  return <MapViewClient />;
}
