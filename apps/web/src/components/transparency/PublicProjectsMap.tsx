'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicProjectListItem } from '@vojas/api-client';
// Bundled locally rather than fetched from a CDN at runtime — the CDN
// approach used elsewhere in this codebase (see components/satellite/
// SatelliteMap.tsx) hardcodes a maplibre-gl version that doesn't match the
// installed one and is a single point of failure for the public map.
import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre's JS is still loaded dynamically to avoid pulling WebGL/canvas
// code into the SSR bundle.
let MapLibre: typeof import('maplibre-gl') | null = null;

async function loadMapLibre() {
  if (MapLibre) return MapLibre;
  MapLibre = await import('maplibre-gl');
  return MapLibre;
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#10b981',
  VERIFIED: '#10b981',
  IN_PROGRESS: '#3b82f6',
  APPROVED: '#6366f1',
  SANCTIONED: '#6366f1',
  CANCELLED: '#ef4444',
  UNSANCTIONED: '#94a3b8',
  PROPOSED: '#94a3b8',
};

interface PublicProjectsMapProps {
  projects: PublicProjectListItem[];
  className?: string;
  /** Project id to center on and open the popup for, once its marker exists. */
  focusProjectId?: string;
}

/**
 * Plots only projects with real latitude/longitude on an OpenStreetMap
 * basemap. Projects without coordinates are never guessed at — see the
 * caller for the "N without a mapped location" count.
 */
export function PublicProjectsMap({ projects, className, focusProjectId }: PublicProjectsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<Map<string, import('maplibre-gl').Marker>>(new Map());
  const focusedRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Drives the marker-sync effect below. Without this, that effect (keyed
  // only on `projects`) can run once before the map's own async load
  // resolves, see the map as not-ready, and never run again since
  // `projects` doesn't change afterward — leaving zero markers rendered.
  const [mapReady, setMapReady] = useState(false);

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;

    loadMapLibre()
      .then((ml) => {
        if (destroyed || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                // Standard OpenStreetMap tile servers — no API key required,
                // unlike CARTO's basemap CDN which now gates its raster
                // endpoints behind a key and watermarks unauthenticated
                // requests. Three subdomains for basic load spreading, per
                // OSM's tile usage guidance.
                tiles: [
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                ],
                tileSize: 256,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          },
          center: [78.9629, 22.5937], // Geographic center of India
          zoom: 4,
        });
        map.addControl(new ml.NavigationControl(), 'top-right');
        map.on('error', (e) => {
          // A tile/style load failure after init — surface it honestly
          // rather than leaving a silently blank map.
          setError(e.error?.message ?? 'Map failed to load.');
        });
        map.once('load', () => setMapReady(true));
        mapRef.current = map;
      })
      .catch(() => setError('Map could not be loaded.'));

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers whenever the project list changes, or once the map
  // finishes its own async load (whichever happens later).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !MapLibre) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const withCoords = projects.filter((p) => p.latitude != null && p.longitude != null);
    for (const p of withCoords) {
      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
      el.style.backgroundColor = STATUS_COLOR[p.status] ?? '#6366f1';
      el.style.cursor = 'pointer';

      const popup = new MapLibre.Popup({ offset: 12, closeButton: false }).setHTML(
        `<div style="font-size:12px;max-width:200px">
          <strong>${escapeHtml(p.name)}</strong><br/>
          ${escapeHtml([p.district, p.state].filter(Boolean).join(', '))}<br/>
          <a href="/explore/${p.id}" style="color:#4f46e5">View project →</a>
        </div>`
      );

      const marker = new MapLibre.Marker({ element: el })
        .setLngLat([p.longitude as number, p.latitude as number])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.set(p.id, marker);
    }
  }, [projects, mapReady]);

  // Center on and open the popup for a project passed in via ?focus=<id>
  // (e.g. from a project detail page's "View on Map" link), once and only
  // once per focusProjectId.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusProjectId || focusedRef.current === focusProjectId) return;
    const marker = markersRef.current.get(focusProjectId);
    if (!marker) return;

    focusedRef.current = focusProjectId;
    map.flyTo({ center: marker.getLngLat(), zoom: 10 });
    marker.togglePopup();
  }, [focusProjectId, mapReady, projects]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-sm text-slate-400 ${className ?? ''}`} style={{ minHeight: 480 }}>
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={{ minHeight: 480 }} role="img" aria-label="Map of MPLAD project locations" />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
