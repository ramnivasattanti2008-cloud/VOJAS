import React, { useState } from 'react';
import { SeverityBadge, EpistemicBadge } from '../ui/Badges';
import { Radio, ArrowRight, Filter, AlertCircle, Clock, MapPin } from 'lucide-react';
import { RiskLevel, EpistemicSource } from '../../types/civicshield';

export interface FeedEventItem {
  id: string;
  title: string;
  location: string;
  timeAgo: string;
  severity: RiskLevel;
  source: EpistemicSource;
  summary: string;
  caseId?: string;
}

interface IntelligenceFeedProps {
  onSelectEvent: (event: FeedEventItem) => void;
  selectedEventId?: string;
}

export const IntelligenceFeed: React.FC<IntelligenceFeedProps> = ({ onSelectEvent, selectedEventId }) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'VERIFIED'>('ALL');

  const feedEvents: FeedEventItem[] = [
    {
      id: 'EVT-01',
      title: 'Road construction anomaly & grading detected',
      location: 'Karnataka · Bengaluru',
      timeAgo: '8 min ago',
      severity: 'CRITICAL',
      source: 'SATELLITE_OBSERVATION',
      summary: '2.84 ha surface excavation identified beyond BBMP road widening boundary.',
      caseId: 'CS-1042'
    },
    {
      id: 'EVT-02',
      title: 'Rapid aquaculture wetland encroachment',
      location: 'Andhra Pradesh · Nellore',
      timeAgo: '24 min ago',
      severity: 'MODERATE',
      source: 'SATELLITE_OBSERVATION',
      summary: 'Mangrove clear-felling into artificial prawn cultivation pond bunds.',
      caseId: 'CS-1043'
    },
    {
      id: 'EVT-03',
      title: 'Citizen grievance #CS-1482 confirmed by satellite',
      location: 'Karnataka · Bengaluru',
      timeAgo: '41 min ago',
      severity: 'VERIFIED',
      source: 'CITIZEN_REPORT',
      summary: 'Night dump truck convoy report verified with Sentinel-2 spectral shifts.',
      caseId: 'CS-1042'
    },
    {
      id: 'EVT-04',
      title: 'Riverbank floodplain debris fill elevation',
      location: 'Telangana · Hyderabad',
      timeAgo: '1 hr ago',
      severity: 'HIGH',
      source: 'GOVERNMENT_DATA',
      summary: 'Artificial embankment creation inside 50-year maximum high-flood contour.',
      caseId: 'CS-1044'
    },
    {
      id: 'EVT-05',
      title: 'Monsoon drainage culvert physical blockage',
      location: 'Tamil Nadu · Chennai',
      timeAgo: '2 hrs ago',
      severity: 'CRITICAL',
      source: 'SATELLITE_OBSERVATION',
      summary: 'Severe runoff impedance flagged prior to 72h precipitation storm window.',
      caseId: 'CS-1046'
    }
  ];

  const filtered = feedEvents.filter((item) => {
    if (filter === 'CRITICAL') return item.severity === 'CRITICAL' || item.severity === 'HIGH';
    if (filter === 'VERIFIED') return item.severity === 'VERIFIED';
    return true;
  });

  return (
    <div className="h-full flex flex-col rounded-xl border border-tactical-800 bg-tactical-900/90 overflow-hidden shadow-lg">
      
      {/* Header */}
      <div className="p-3.5 border-b border-tactical-700/60 flex items-center justify-between bg-tactical-850">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-intel-cyan animate-pulse" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
            INTELLIGENCE FEED
          </h3>
        </div>

        {/* Quick Filter tabs */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 rounded transition-colors ${filter === 'ALL' ? 'bg-intel-cyan text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-2 py-0.5 rounded transition-colors ${filter === 'CRITICAL' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Critical
          </button>
          <button
            onClick={() => setFilter('VERIFIED')}
            className={`px-2 py-0.5 rounded transition-colors ${filter === 'VERIFIED' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Verified
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-tactical-800/60">
        {filtered.map((item) => {
          const isSelected = selectedEventId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => onSelectEvent(item)}
              className={`pt-2 first:pt-0 p-2.5 rounded-lg text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-intel-cyan/15 border border-intel-cyan/40 shadow-sm'
                  : 'hover:bg-tactical-800/70 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <SeverityBadge severity={item.severity} />
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{item.timeAgo}</span>
                </div>
              </div>

              <h4 className="text-xs font-medium text-slate-100 line-clamp-1 group-hover:text-intel-cyan transition-colors">
                {item.title}
              </h4>

              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                {item.summary}
              </p>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-tactical-800/80">
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{item.location}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-intel-cyan font-medium">
                  <span>Inspect</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer live status */}
      <div className="p-2 border-t border-tactical-800 bg-tactical-950 text-[10px] font-mono text-slate-500 flex items-center justify-between px-3">
        <span>Sentinel-2 L2A ingestion stream</span>
        <span className="text-emerald-400">0.4s sync</span>
      </div>

    </div>
  );
};
