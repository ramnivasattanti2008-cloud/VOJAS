/**
 * GlobeHero — 3D globe dashboard hero
 *
 * Loads MapMarkers from useMapOverview and transforms them into
 * GlobeMarker format for the Globe3D component.
 *
 * Fits into the "Project Constellation" section of OfficerDashboard.
 * Shows all geolocated projects as interactive markers on a 3D globe.
 */

import { lazy, Suspense } from 'react';
import { useMapOverview } from '@/hooks/useMap';
import { Globe } from 'lucide-react';
import type { MapMarker } from '@/types';
import type { GlobeMarker } from './Globe3D';

// ── Map status → Globe marker status ──────────────────────────────────────
function toMarkerStatus(marker: MapMarker): GlobeMarker['status'] {
  const s = marker.project.status;
  if (s === 'COMPLETED' || s === 'VERIFIED') return 'success';
  if (s === 'IN_PROGRESS') return 'warning';
  if (s === 'CANCELLED') return 'danger';
  return 'neutral';
}

// ── Globe fallback while loading ───────────────────────────────────────────
function GlobeFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#04060a]">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #1a4a7a 0%, #040810 100%)',
            boxShadow: '0 0 40px 10px rgba(59,130,246,0.15)',
            animation: 'pulseSoft 2s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#3b82f6' }}
        />
      </div>
      <p className="mt-4 text-xs text-[#4a5374] font-medium tracking-widest uppercase">
        Loading globe
      </p>
    </div>
  );
}

// ── Main GlobeHero ──────────────────────────────────────────────────────────

interface GlobeHeroProps {
  height?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
  selectedId?: string | null;
}

const Globe3D = lazy(() => import('./Globe3D'));

export default function GlobeHero({
  height = 420,
  className = '',
  onMarkerClick,
  selectedId,
}: GlobeHeroProps) {
  const { data, isLoading, isError } = useMapOverview();

  // Transform MapMarkers → GlobeMarkers
  const markers: GlobeMarker[] = (data?.markers ?? [])
    .filter((m) => m.latitude && m.longitude)
    .map((m) => ({
      id: m.id,
      lat: m.latitude,
      lng: m.longitude,
      status: toMarkerStatus(m),
      label: m.label ?? m.project.name,
      value: Math.round((m.project.approvedAmount / 1_00_00_000) * 100) / 100, // Cr value
    }));

  if (isError || (!isLoading && markers.length === 0)) {
    return (
      <div
        className={`flex items-center justify-center bg-[#04060a] border border-[#1c2236] rounded-xl ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <Globe className="w-8 h-8 text-[#2e3652] mx-auto mb-2" />
          <p className="text-xs text-[#4a5374]">
            {isError ? 'Globe unavailable' : 'No geolocated projects yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <Suspense fallback={<GlobeFallback />}>
        <Globe3D
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={onMarkerClick}
          autoRotate
          showAtmosphere
          showStars
          quality="medium"
          ariaLabel="Interactive 3D globe showing MPLAD project locations across India"
          className="w-full h-full"
        />
      </Suspense>

      {/* Project count badge */}
      {markers.length > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-[#070a10]/90 border border-[#252c44] backdrop-blur-sm">
            <span className="text-[10px] text-[#9ba3bf] font-mono tabular-nums">
              {markers.length} sites
            </span>
          </div>
        </div>
      )}

      {/* Quality toggle */}
      <button
        onClick={() => {}}
        className="absolute bottom-3 right-3 text-[9px] text-[#4a5374] hover:text-[#6c7595] transition-colors px-2 py-1 rounded bg-[#070a10]/80 border border-[#252c44]"
        aria-label="Toggle globe quality"
      >
        3D Globe · {data?.total ?? 0} projects
      </button>
    </div>
  );
}
