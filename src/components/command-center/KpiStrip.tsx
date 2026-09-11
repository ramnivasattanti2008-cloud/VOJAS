import React from 'react';
import { TrendingUp, AlertTriangle, Sparkles, FileText, ShieldAlert, MapPin } from 'lucide-react';
import { ViewType } from '../layout/TacticalSidebar';

interface KpiStripProps {
  onSelectKpi: (view: ViewType) => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ onSelectKpi }) => {
  const kpis = [
    {
      id: 'locations',
      title: 'Monitored Hubs',
      value: '12,842',
      trend: '+12 this week',
      trendUp: true,
      sparkline: [12, 14, 13, 16, 15, 18, 22],
      color: 'cyan',
      view: 'map' as ViewType,
      icon: MapPin
    },
    {
      id: 'risks',
      title: 'Active Risks',
      value: '84',
      trend: '5 Critical',
      trendUp: false,
      sparkline: [60, 68, 72, 70, 78, 81, 84],
      color: 'amber',
      view: 'risks' as ViewType,
      icon: AlertTriangle
    },
    {
      id: 'changes',
      title: 'Changes Detected',
      value: '142',
      trend: '+18 in 48h',
      trendUp: true,
      sparkline: [95, 105, 112, 120, 131, 138, 142],
      color: 'purple',
      view: 'changes' as ViewType,
      icon: Sparkles
    },
    {
      id: 'reports',
      title: 'Citizen Reports',
      value: '319',
      trend: '84% Verified',
      trendUp: true,
      sparkline: [210, 230, 255, 270, 290, 305, 319],
      color: 'emerald',
      view: 'reports' as ViewType,
      icon: FileText
    },
    {
      id: 'critical',
      title: 'Critical Alerts',
      value: '07',
      trend: 'Requires Action',
      trendUp: false,
      sparkline: [4, 5, 3, 6, 7, 6, 7],
      color: 'red',
      view: 'alerts' as ViewType,
      icon: ShieldAlert
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        
        let borderClass = 'border-tactical-800 hover:border-tactical-600';
        let valColor = 'text-white';
        let strokeColor = '#38bdf8';

        if (kpi.color === 'red') {
          borderClass = 'border-red-500/30 hover:border-red-500/60 bg-red-950/20';
          valColor = 'text-red-400';
          strokeColor = '#ef4444';
        } else if (kpi.color === 'cyan') {
          borderClass = 'border-intel-cyan/20 hover:border-intel-cyan/50';
          valColor = 'text-intel-cyan';
          strokeColor = '#00f0ff';
        } else if (kpi.color === 'amber') {
          borderClass = 'border-amber-500/20 hover:border-amber-500/50';
          valColor = 'text-amber-400';
          strokeColor = '#f59e0b';
        } else if (kpi.color === 'purple') {
          borderClass = 'border-purple-500/20 hover:border-purple-500/50';
          valColor = 'text-purple-300';
          strokeColor = '#a855f7';
        } else if (kpi.color === 'emerald') {
          borderClass = 'border-emerald-500/20 hover:border-emerald-500/50';
          valColor = 'text-emerald-400';
          strokeColor = '#10b981';
        }

        return (
          <button
            key={kpi.id}
            onClick={() => onSelectKpi(kpi.view)}
            className={`text-left p-3 rounded-xl bg-tactical-900/80 border ${borderClass} transition-all duration-150 flex flex-col justify-between group shadow-sm hover:scale-[1.01]`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 truncate">
                {kpi.title}
              </span>
              <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black font-mono tracking-tight ${valColor}`}>
                {kpi.value}
              </span>

              {/* Tiny Sparkline SVG */}
              <div className="w-16 h-7 shrink-0 ml-2">
                <svg viewBox="0 0 60 25" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={kpi.sparkline.map((val, idx) => {
                      const min = Math.min(...kpi.sparkline);
                      const max = Math.max(...kpi.sparkline);
                      const normY = 22 - ((val - min) / (max - min || 1)) * 18;
                      const normX = (idx / (kpi.sparkline.length - 1)) * 58 + 1;
                      return `${normX},${normY}`;
                    }).join(' ')}
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-400">
              <TrendingUp className="w-3 h-3 text-slate-400" />
              <span className="truncate">{kpi.trend}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
