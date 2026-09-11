import React from 'react';
import { X, CheckCircle2, AlertTriangle, Activity, Satellite, Brain, Layers, Database, ShieldCheck } from 'lucide-react';
import { SystemTelemetry } from '../../types/civicshield';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SystemTelemetry;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ isOpen, onClose, telemetry }) => {
  if (!isOpen) return null;

  const services = [
    {
      name: 'Copernicus Sentinel Hub API',
      status: telemetry.satelliteFeedStatus,
      latency: '142 ms',
      uptime: '99.94%',
      icon: Satellite,
      description: 'L2A Bottom-of-Atmosphere surface reflectance pipeline & tile cache'
    },
    {
      name: 'CivicShield AI Inference Engine',
      status: telemetry.aiEngineStatus,
      latency: '310 ms',
      uptime: '99.88%',
      icon: Brain,
      description: 'ResNet Land-Cover Classifier v4.2 + Spectral Change Matrix'
    },
    {
      name: 'GIS Vector & Raster Tile Engine',
      status: telemetry.gisTileServices,
      latency: '45 ms',
      uptime: '100.0%',
      icon: Layers,
      description: 'CartoDB Dark Vector base, EPSG:3857 Web Mercator tile server'
    },
    {
      name: 'Geospatial Investigation Store',
      status: telemetry.databaseSync,
      latency: '22 ms',
      uptime: '99.99%',
      icon: Database,
      description: 'PostGIS spatial cluster with real-time WebSocket pub/sub'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-xl border border-intel-cyan/30 bg-tactical-900 shadow-2xl p-6 overflow-hidden">
        {/* Radar background aura */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-intel-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-tactical-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-100 uppercase">
                  CIVICSHIELD SYSTEMS OPERATIONAL
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Telemetry synchronized: {telemetry.lastSatelliteSync}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-tactical-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {services.map((svc, i) => {
            const Icon = svc.icon;
            const isOk = svc.status === 'ONLINE' || svc.status === 'OPERATIONAL' || svc.status === 'SYNCHRONIZED';
            return (
              <div
                key={i}
                className="p-3 rounded-lg border border-tactical-800 bg-tactical-850 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-tactical-800 flex items-center justify-center text-intel-cyan">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{svc.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-tactical-700/60 text-slate-400">
                        {svc.latency}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{svc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">{svc.uptime}</span>
                  <span className={`inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    isOk 
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                  }`}>
                    {isOk ? <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-400" /> : <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
                    {svc.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-tactical-700/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Clusters: South-Asia-IN-1 (Mumbai)</span>
          <span className="text-intel-cyan">Protocol: TLS 1.3 / E2E Encrypted</span>
        </div>
      </div>
    </div>
  );
};
