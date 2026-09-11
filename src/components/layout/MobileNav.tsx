import React from 'react';
import { LayoutDashboard, Map, Bell, FileText, Compass, Globe2 } from 'lucide-react';
import { ViewType } from './TacticalSidebar';

interface MobileNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  alertsCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, alertsCount }) => {
  const tabs = [
    { id: 'dashboard' as ViewType, label: 'Command', icon: LayoutDashboard },
    { id: 'map' as ViewType, label: 'Live Map', icon: Map },
    { id: 'alerts' as ViewType, label: 'Alerts', icon: Bell, badge: alertsCount },
    { id: 'reports' as ViewType, label: 'Reports', icon: FileText },
    { id: 'location' as ViewType, label: 'Profile', icon: Compass },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-tactical-950/95 backdrop-blur-md border-t border-tactical-800 flex items-center justify-around px-2 z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center w-14 py-1 relative ${
              isActive ? 'text-intel-cyan' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-mono px-1 rounded-full font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-mono mt-1 font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
