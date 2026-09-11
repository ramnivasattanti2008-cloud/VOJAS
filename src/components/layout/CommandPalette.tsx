import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, FolderGit2, AlertTriangle, FileText, Briefcase, ArrowRight, X, Sparkles } from 'lucide-react';
import { ALL_PROJECTS, ALL_ALERTS, ALL_CITIZEN_REPORTS, ALL_LOCATION_PROFILES, PRIMARY_INVESTIGATION } from '../../data/mockData';
import { ViewType } from './TacticalSidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType, id?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items
  const q = query.toLowerCase().trim();

  const locations = ALL_LOCATION_PROFILES.filter(l => 
    !q || l.name.toLowerCase().includes(q) || l.district.toLowerCase().includes(q)
  );

  const projects = ALL_PROJECTS.filter(p => 
    !q || p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
  );

  const alerts = ALL_ALERTS.filter(a => 
    !q || a.title.toLowerCase().includes(q) || a.location.toLowerCase().includes(q)
  );

  const reports = ALL_CITIZEN_REPORTS.filter(r => 
    !q || r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.locationName.toLowerCase().includes(q)
  );

  const investigations = [PRIMARY_INVESTIGATION].filter(inv =>
    !q || inv.id.toLowerCase().includes(q) || inv.title.toLowerCase().includes(q)
  );

  const allResults = [
    ...locations.map(l => ({ type: 'LOCATION', item: l, label: l.name, sub: `${l.district}, ${l.state}`, view: 'location' as ViewType, id: l.id })),
    ...projects.map(p => ({ type: 'PROJECT', item: p, label: p.name, sub: `${p.location} · Budget: ₹${p.budgetCr} Cr`, view: 'infrastructure' as ViewType, id: p.id })),
    ...alerts.map(a => ({ type: 'ALERT', item: a, label: a.title, sub: `${a.location} · ${a.severity}`, view: 'alerts' as ViewType, id: a.id })),
    ...reports.map(r => ({ type: 'REPORT', item: r, label: `${r.id}: ${r.title}`, sub: `${r.locationName} · ${r.issueType}`, view: 'reports' as ViewType, id: r.id })),
    ...investigations.map(inv => ({ type: 'INVESTIGATION', item: inv, label: `${inv.id}: ${inv.title}`, sub: `${inv.location} · ${inv.status}`, view: 'investigations' as ViewType, id: inv.id }))
  ];

  const handleSelect = (entry: typeof allResults[0]) => {
    onNavigate(entry.view, entry.id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-intel-cyan/40 bg-tactical-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-tactical-700/60 bg-tactical-850">
          <Search className="w-5 h-5 text-intel-cyan mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search locations, projects, alerts, reports, investigations (e.g. Bengaluru, CS-1042)..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-tactical-700 text-slate-400">
            ESC to close
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-tactical-800">
          {allResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-mono text-xs text-slate-300">No telemetry or cases matching &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-500 mt-1">Try searching &ldquo;Bengaluru&rdquo;, &ldquo;ORR&rdquo;, or &ldquo;CS-1042&rdquo;</p>
            </div>
          ) : (
            <div className="space-y-1">
              {allResults.slice(0, 15).map((res, index) => {
                const isSelected = index === selectedIndex;
                let Icon = MapPin;
                let badgeStyle = 'text-intel-cyan bg-cyan-950/40 border-cyan-500/30';
                
                if (res.type === 'PROJECT') {
                  Icon = FolderGit2;
                  badgeStyle = 'text-blue-400 bg-blue-950/40 border-blue-500/30';
                } else if (res.type === 'ALERT') {
                  Icon = AlertTriangle;
                  badgeStyle = 'text-red-400 bg-red-950/40 border-red-500/30';
                } else if (res.type === 'REPORT') {
                  Icon = FileText;
                  badgeStyle = 'text-amber-400 bg-amber-950/40 border-amber-500/30';
                } else if (res.type === 'INVESTIGATION') {
                  Icon = Briefcase;
                  badgeStyle = 'text-purple-400 bg-purple-950/40 border-purple-500/30';
                }

                return (
                  <button
                    key={`${res.type}-${index}`}
                    onClick={() => handleSelect(res)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected 
                        ? 'bg-intel-cyan/10 border border-intel-cyan/30 text-white' 
                        : 'hover:bg-tactical-800/60 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-1.5 rounded border shrink-0 ${badgeStyle}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium font-sans truncate">{res.label}</span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border bg-tactical-800 border-tactical-700 text-slate-400 shrink-0">
                            {res.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{res.sub}</p>
                      </div>
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${isSelected ? 'text-intel-cyan opacity-100' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-tactical-700/60 bg-tactical-950 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Dismiss</span>
          </div>
          <span className="text-intel-cyan/80">CivicShield Unified Spatial Index</span>
        </div>
      </div>
    </div>
  );
};
