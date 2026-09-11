import React, { useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  FileSearch, 
  Check, 
  Eye, 
  X, 
  Filter,
  MapPin
} from 'lucide-react';
import { ALL_ALERTS } from '../../data/mockData';
import { AlertItem, AlertSeverity } from '../../types/civicshield';
import { SeverityBadge } from '../ui/Badges';
import { ViewType } from '../layout/TacticalSidebar';

interface AlertCenterViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const AlertCenterView: React.FC<AlertCenterViewProps> = ({ onNavigate }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>(ALL_ALERTS);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const filteredAlerts = alerts.filter(a => severityFilter === 'ALL' || a.severity === severityFilter);

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'DISMISSED' } : a));
  };

  const handleWatch = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'WATCHING' } : a));
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-red-400">
            <Bell className="w-3.5 h-3.5" />
            <span>OPERATIONAL EARLY WARNING SYSTEM</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Tactical Alert Center &amp; Watchlist
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Automated sensor anomaly triggers requiring civic vigilance and administrative action
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Active Critical Triggers:</span>
          <span className="text-red-400 font-bold px-2 py-0.5 rounded bg-red-950 border border-red-500/40">
            02 Immediate Action Required
          </span>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
        <span className="text-[10px] text-slate-500 uppercase font-bold px-1">Severity:</span>
        {severities.map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-3 py-1 rounded-lg border transition-colors ${
              severityFilter === sev
                ? 'bg-red-600 text-white font-bold border-red-500 shadow-sm'
                : 'bg-tactical-900 text-slate-400 hover:text-white border-tactical-750 hover:bg-tactical-850'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {filteredAlerts.map((alert) => {
          const isDismissed = alert.status === 'DISMISSED';
          const isWatching = alert.status === 'WATCHING';

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                alert.severity === 'CRITICAL'
                  ? 'bg-red-950/25 border-red-500/40 shadow-alert-glow'
                  : 'bg-tactical-900/85 border-tactical-800'
              } ${isDismissed ? 'opacity-40' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white uppercase">
                      #{alert.id}
                    </span>
                    <SeverityBadge severity={alert.severity} />
                  </div>

                  <span className="text-xs font-mono text-intel-cyan font-bold">
                    {alert.confidence}% Confidence
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white">
                  {alert.title}
                </h3>

                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 mt-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{alert.location} · {alert.detectedTimeAgo}</span>
                </div>

                <p className="text-xs text-slate-300 mt-2 font-sans leading-relaxed">
                  {alert.description}
                </p>
              </div>

              {/* Status flag */}
              {isWatching && (
                <div className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 inline-block w-fit">
                  ● ADDED TO WATCHLIST
                </div>
              )}

              {/* Action Buttons: Investigate, Dismiss, Watch */}
              <div className="flex items-center justify-between pt-3 border-t border-tactical-800 font-mono text-xs">
                <button
                  onClick={() => onNavigate('investigations', 'CS-1042')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-sm"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>Investigate</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWatch(alert.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-tactical-700 bg-tactical-800 hover:bg-tactical-750 text-slate-300 hover:text-white transition-colors"
                  >
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>Watch</span>
                  </button>

                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="p-1.5 rounded-lg border border-tactical-800 hover:bg-tactical-800 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
