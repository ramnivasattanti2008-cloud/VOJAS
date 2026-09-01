/**
 * GlobeHero — full-bleed cinematic dashboard hero
 *
 * Immersive 3D globe with floating HUD panels:
 *  - Top-left: real-time status ticker
 *  - Top-right: mission metadata (FPS, coords, threat level)
 *  - Bottom-left: live intelligence feed
 *  - Bottom-right: mission controls
 *  - Center: full-bleed globe with corner brackets
 *
 * Performance: lazy-loads Globe3D, shows animated fallback
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapOverview } from '@/hooks/useMap';
import { cn } from '@/lib/utils';
import type { GlobeMarker, GlobeArc } from './Globe3D';
import {
  Radio, Cpu, Shield,
  Eye,
} from 'lucide-react';

interface GlobeHeroProps {
  height?: number;
  className?: string;
}

const STATUS_FLOW = [
  "ACQUIRING SATELLITE LOCK",
  "CALIBRATING GEODETIC FRAME",
  "STREAMING MPLAD TELEMETRY",
  "CROSS-REFERENCING ANOMALIES",
  "AGGREGATING CITIZEN FEEDBACK",
  "UPDATING THREAT GRID",
  "SYNCHRONIZING DISTRICTS",
];

function statusToMarkerStatus(status: string): GlobeMarker['status'] {
  const s = status.toUpperCase();
  if (s.includes('COMPLETE') || s.includes('VERIFIED')) return 'success';
  if (s.includes('PROGRESS')) return 'warning';
  if (s.includes('CANCEL') || s.includes('FAIL')) return 'danger';
  if (s.includes('PROPOSE') || s.includes('PENDING')) return 'info';
  return 'neutral';
}

export default function GlobeHero({ height = 520, className }: GlobeHeroProps) {
  const { data: overview, isLoading } = useMapOverview();
  const [statusIdx, setStatusIdx] = useState(0);
  const [fps, setFps] = useState(60);
  const [coords, setCoords] = useState({ lat: 20.5937, lng: 78.9629 }); // India center
  const [threatLevel, setThreatLevel] = useState(2); // 0-4

  // Cycle status text
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_FLOW.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Simulated FPS counter
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(58 + Math.floor(Math.random() * 4));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Simulated live coordinate drift
  useEffect(() => {
    const interval = setInterval(() => {
      setCoords(() => ({
        lat: 20.5937 + Math.sin(Date.now() / 8000) * 2,
        lng: 78.9629 + Math.cos(Date.now() / 10000) * 3,
      }));
      setThreatLevel((l) => Math.max(1, Math.min(4, l + (Math.random() > 0.7 ? 1 : -1))));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Build markers from project locations
  const markers: GlobeMarker[] = useMemo(() => {
    if (!overview?.markers) return [];
    return overview.markers
      .filter((m) => m.latitude != null && m.longitude != null)
      .slice(0, 80)
      .map((m) => ({
        id: m.id,
        lat: m.latitude!,
        lng: m.longitude!,
        status: statusToMarkerStatus(m.project?.status || ''),
        label: m.project?.name || m.label || 'Project',
        value: m.project?.approvedAmount,
      }));
  }, [overview]);

  // Build arcs between top 3 markers (strategic data flow)
  const arcs: GlobeArc[] = useMemo(() => {
    if (markers.length < 2) return [];
    const result: GlobeArc[] = [];
    const top = markers.slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const status = top[i].status;
        const color =
          status === 'success' ? '#22c55e' :
          status === 'warning' ? '#fbbf24' :
          status === 'danger'  ? '#ef4444' :
          status === 'info'    ? '#a78bfa' :
          '#3b82f6';
        result.push({
          from: { lat: top[i].lat, lng: top[i].lng },
          to:   { lat: top[j].lat, lng: top[j].lng },
          color,
        });
      }
    }
    return result;
  }, [markers]);

  const threatColors = ['#22c55e', '#84cc16', '#fbbf24', '#f97316', '#ef4444'];
  const threatLabels = ['NOMINAL', 'LOW', 'ELEVATED', 'HIGH', 'CRITICAL'];

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-2xl', className)}
      style={{
        height,
        background: 'radial-gradient(ellipse at center, #050810 0%, #000000 100%)',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
      }}
    >
      {/* The globe itself — full bleed */}
      <div className="absolute inset-0">
        {isLoading ? (
          <GlobeLoadingState />
        ) : (
          <Globe3DLoader markers={markers} arcs={arcs} />
        )}
      </div>

      {/* HUD Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-left: System status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute top-4 left-4 pointer-events-auto"
        >
          <HUDPanel label="SYSTEM STATUS" icon={Radio} accent="green">
            <AnimatePresence mode="wait">
              <motion.div
                key={statusIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-[11px] font-mono text-electric-300 tracking-wider"
              >
                <span className="text-green-400">●</span> {STATUS_FLOW[statusIdx]}
              </motion.div>
            </AnimatePresence>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
              <span>{markers.length} ACTIVE NODES</span>
              <span className="text-slate-700">·</span>
              <span>{arcs.length} DATA STREAMS</span>
            </div>
          </HUDPanel>
        </motion.div>

        {/* Top-right: Telemetry */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute top-4 right-4 pointer-events-auto"
        >
          <HUDPanel label="TELEMETRY" icon={Cpu} accent="electric">
            <div className="space-y-1.5 text-[10px] font-mono">
              <TelemetryRow label="FPS"     value={String(fps).padStart(2, '0')} accent="electric" />
              <TelemetryRow label="LAT"     value={coords.lat.toFixed(4) + '°'} />
              <TelemetryRow label="LNG"     value={coords.lng.toFixed(4) + '°'} />
              <TelemetryRow
                label="THREAT"
                value={threatLabels[threatLevel]}
                accent={
                  threatLevel <= 1 ? 'green' :
                  threatLevel === 2 ? 'saffron' :
                  'red'
                }
              />
            </div>
          </HUDPanel>
        </motion.div>

        {/* Bottom-left: Mission summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute bottom-4 left-4 pointer-events-auto"
        >
          <HUDPanel label="MISSION" icon={Eye} accent="blue" wide>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              <div className="text-white font-semibold text-xs mb-1 tracking-wide">STRATEGIC OVERVIEW</div>
              Real-time visualization of MPLAD project activity across the
              Republic of India. Click any marker to drill into regional intelligence.
            </div>
          </HUDPanel>
        </motion.div>

        {/* Bottom-right: Threat gauge + control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="absolute bottom-4 right-4 pointer-events-auto"
        >
          <HUDPanel label="THREAT GRID" icon={Shield} accent="red">
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: i <= threatLevel ? 1 : 0.15,
                    scale: i === threatLevel ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 0.3, scale: { repeat: i === threatLevel ? Infinity : 0, duration: 1.5 } }}
                  className="h-6 w-3 rounded-sm"
                  style={{
                    background: i <= threatLevel ? threatColors[i] : 'rgba(255,255,255,0.05)',
                    boxShadow: i === threatLevel ? `0 0 8px ${threatColors[i]}` : 'none',
                  }}
                />
              ))}
            </div>
            <div className="mt-2 text-[10px] font-mono text-slate-500">
              {threatLabels[threatLevel]} · {markers.filter(m => m.status === 'danger').length} critical
            </div>
          </HUDPanel>
        </motion.div>

        {/* Center bottom: title overlay (only when no large UI below) */}
        {height > 400 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center pointer-events-none"
          >
            <div className="text-[10px] text-slate-500 font-mono tracking-[0.4em] uppercase">
              Live MPLAD Intelligence
            </div>
          </motion.div>
        )}
      </div>

      {/* Outer corner brackets for cinematic frame */}
      <CornerBrackets />
    </div>
  );
}

// ── HUD Panel Component ───────────────────────────────────────────────────

function HUDPanel({
  label,
  icon: Icon,
  accent,
  children,
  wide = false,
}: {
  label: string;
  icon: any;
  accent: 'green' | 'electric' | 'saffron' | 'red' | 'blue';
  children: React.ReactNode;
  wide?: boolean;
}) {
  const accentMap = {
    green:    { bar: '#22c55e', glow: 'rgba(34,197,94,0.15)',  text: 'text-green-400' },
    electric: { bar: '#3b82f6', glow: 'rgba(59,130,246,0.15)', text: 'text-electric-400' },
    saffron:  { bar: '#fbbf24', glow: 'rgba(251,191,36,0.15)', text: 'text-saffron-400' },
    red:      { bar: '#ef4444', glow: 'rgba(239,68,68,0.15)',  text: 'text-red-400' },
    blue:     { bar: '#60a5fa', glow: 'rgba(96,165,250,0.15)', text: 'text-blue-400' },
  };
  const s = accentMap[accent];

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden',
        wide ? 'min-w-[260px] max-w-[320px]' : 'min-w-[180px] max-w-[240px]'
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(8,12,24,0.85) 0%, rgba(8,12,24,0.7) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 24px ${s.glow}`,
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${s.bar} 50%, transparent)` }}
      />
      {/* Label */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <Icon className={cn('w-3 h-3', s.text)} />
        <span className={cn('text-[9px] font-mono font-bold tracking-[0.2em] uppercase', s.text)}>
          {label}
        </span>
      </div>
      {/* Content */}
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}

function TelemetryRow({ label, value, accent }: { label: string; value: string; accent?: 'electric' | 'green' | 'saffron' | 'red' }) {
  const accentClass =
    accent === 'green'    ? 'text-green-400' :
    accent === 'saffron'  ? 'text-saffron-400' :
    accent === 'red'      ? 'text-red-400' :
    accent === 'electric' ? 'text-electric-400' :
    'text-white';
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn('font-semibold tabular-nums', accentClass)}>{value}</span>
    </div>
  );
}

function CornerBrackets() {
  return (
    <>
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-electric-400/60" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-electric-400/60" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-electric-400/60" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-electric-400/60" />
    </>
  );
}

function GlobeLoadingState() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #1a4a7a 0%, #040810 100%)',
            boxShadow: '0 0 60px 20px rgba(59,130,246,0.3)',
            animation: 'pulseSoft 2s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite' }}
        />
      </div>
      <p className="mt-4 text-[10px] text-slate-500 font-semibold tracking-[0.3em] uppercase">
        Acquiring strategic data
      </p>
    </div>
  );
}

// Lazy import wrapper for code splitting
function Globe3DLoader({ markers, arcs }: { markers: GlobeMarker[]; arcs: GlobeArc[] }) {
  const [Globe3D, setGlobe3D] = useState<any>(null);
  useEffect(() => {
    import('./Globe3D').then((mod) => setGlobe3D(() => mod.default));
  }, []);
  if (!Globe3D) return <GlobeLoadingState />;
  return <Globe3D markers={markers} arcs={arcs} showArcs showAtmosphere showOrbitRing showStars quality="high" />;
}
