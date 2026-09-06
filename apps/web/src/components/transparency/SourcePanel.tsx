'use client';

import { Globe, Satellite, Users, Clock } from 'lucide-react';

interface SourceEntry {
  label: string;
  description: string;
  icon?: React.ReactNode;
}

interface SourcePanelProps {
  lastUpdated?: string;
  className?: string;
}

export function SourcePanel({ lastUpdated, className }: SourcePanelProps) {
  const sources: SourceEntry[] = [
    {
      label: 'Official Government Data',
      description: 'Government transparency portals and official datasets',
    },
    {
      label: 'Satellite Imagery',
      description: 'Copernicus Sentinel-2 via European Space Agency / CDSE',
    },
    {
      label: 'Citizen Reports',
      description: 'Community-submitted reports (identities protected)',
    },
    {
      label: 'Field Verification',
      description: 'Officer-verified project status and progress',
    },
  ];

  const getFreshness = (date?: string): { label: string; color: string } | null => {
    if (!date) return null;
    const diffMs = Date.now() - new Date(date).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 7) return { label: 'FRESH', color: 'text-green-600' };
    if (diffDays < 30) return { label: 'AGING', color: 'text-amber-600' };
    if (diffDays < 90) return { label: 'STALE', color: 'text-red-600' };
    return { label: 'UNKNOWN', color: 'text-slate-400' };
  };

  const freshness = getFreshness(lastUpdated);

  return (
    <div className={className}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" />
        Data Sources
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sources.map((source) => (
          <div key={source.label} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="mt-0.5">
              {source.label.includes('Satellite') ? (
                <Satellite className="h-4 w-4 text-slate-400 shrink-0" />
              ) : source.label.includes('Citizen') ? (
                <Users className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <Globe className="h-4 w-4 text-slate-400 shrink-0" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">{source.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{source.description}</p>
            </div>
          </div>
        ))}
      </div>
      {freshness && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Last Updated:</span>
          <span className="font-medium text-slate-600">{lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available'}</span>
          <span className={`font-semibold ${freshness.color}`}>· {freshness.label}</span>
        </div>
      )}
    </div>
  );
}
