import type { Metadata } from 'next';
import { SatellitesClient } from './SatellitesClient';

export const metadata: Metadata = {
  title: 'ISRO NavIC & Satellite Earth Observation Engine | VOJAS',
  description:
    'Indigenous ISRO NavIC satellite positioning and Sentinel-2 / Bhuvan optical change detection engine for physical observation of MPLAD projects.',
};

export default function SatellitesPage() {
  return <SatellitesClient />;
}
