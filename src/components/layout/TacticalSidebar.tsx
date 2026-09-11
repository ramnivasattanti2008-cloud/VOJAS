import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Clock, 
  SplitSquareVertical, 
  Sparkles, 
  ShieldAlert, 
  Building2, 
  FileText, 
  Bell, 
  Briefcase, 
  BarChart3, 
  Compass, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Globe2,
  HelpCircle,
  Activity
} from 'lucide-react';

export type ViewType = 
  | 'landing' 
  | 'dashboard' 
  | 'map' 
  | 'timeline' 
  | 'compare' 
  | 'changes' 
  | 'risks' 
  | 'infrastructure' 
  | 'reports' 
  | 'alerts' 
  | 'investigations' 
  | 'analytics' 
  | 'location';

interface TacticalSidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  alertsCount: number;
  reportsCount: number;
}

export const TacticalSidebar: React.FC<TacticalSidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  alertsCount,
  reportsCount
}) => {
  const navItems = [
    { id: 'landing' as ViewType, label: 'Overview / Intro', icon: Globe2, shortcut: null },
    { id: 'dashboard' as ViewType, label: 'Command Center', icon: LayoutDashboard, shortcut: null },
    { id: 'map' as ViewType, label: 'Live GIS Map', icon: Map, shortcut: 'M' },
    { id: 'timeline' as ViewType, label: 'Satellite Timeline', icon: Clock, shortcut: null },
    { id: 'compare' as ViewType, label: 'Temporal Compare', icon: SplitSquareVertical, shortcut: null },
    { id: 'changes' as ViewType, label: 'Change Detection', icon: Sparkles, shortcut: null },
    { id: 'risks' as ViewType, label: 'AI Risk Intelligence', icon: ShieldAlert, shortcut: null },
    { id: 'infrastructure' as ViewType, label: 'Infrastructure', icon: Building2, shortcut: null },
    { id: 'reports' as ViewType, label: 'Citizen Reports', icon: FileText, badge: reportsCount, shortcut: 'R' },
    { id: 'alerts' as ViewType, label: 'Alerts & Watchlist', icon: Bell, badge: alertsCount, badgeCritical: true, shortcut: 'A' },
    { id: 'investigations' as ViewType, label: 'Investigations', icon: Briefcase, shortcut: 'I' },
    { id: 'analytics' as ViewType, label: 'Analytics Hub', icon: BarChart3, shortcut: null },
    { id: 'location' as ViewType, label: 'District Profile', icon: Compass, shortcut: null }
  ];

  return (
    <aside
      className={`relative h-[calc(100vh-3.5rem)] border-r border-tactical-700/60 bg-tactical-950 flex flex-col justify-between transition-all duration-200 z-20 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Scrollable Navigation links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        
        <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold flex items-center justify-between">
          {!isCollapsed && <span>Operational Modules</span>}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-tactical-800 text-slate-400 hover:text-white ml-auto"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}` : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors group relative ${
                isActive
                  ? 'bg-intel-cyan/15 text-intel-cyan font-semibold border border-intel-cyan/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-tactical-850/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-intel-cyan scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
              
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.shortcut && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-tactical-800 text-slate-500 border border-tactical-700">
                        {item.shortcut}
                      </span>
                    )}

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        item.badgeCritical 
                          ? 'bg-red-950 text-red-400 border border-red-500/40 animate-pulse-subtle' 
                          : 'bg-tactical-700 text-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Collapsed Badge Dot */}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${item.badgeCritical ? 'bg-red-500 animate-ping' : 'bg-intel-cyan'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Profile / Utility Strip */}
      <div className="p-2 border-t border-tactical-800 bg-tactical-900/60 space-y-1">
        {!isCollapsed && (
          <div className="px-3 py-2 rounded-lg bg-tactical-850/70 border border-tactical-750 flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                CS
              </div>
              <div className="truncate text-left">
                <p className="text-[11px] font-medium text-slate-200 truncate">Vigilance Cell #4</p>
                <p className="text-[9px] font-mono text-slate-500 truncate">Govt of Karnataka</p>
              </div>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        )}

        <div className="flex items-center justify-around py-1 text-slate-400">
          <button
            onClick={() => onNavigate('landing')}
            className="p-1.5 rounded hover:text-intel-cyan hover:bg-tactical-800"
            title="Overview / Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {!isCollapsed && (
            <span className="text-[10px] font-mono text-slate-500">v2.4-STABLE</span>
          )}
        </div>
      </div>
    </aside>
  );
};
