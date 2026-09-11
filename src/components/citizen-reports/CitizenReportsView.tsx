import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  MapPin, 
  ThumbsUp, 
  CheckCircle2, 
  Satellite, 
  Clock, 
  Search, 
  Filter,
  ShieldCheck
} from 'lucide-react';
import { ALL_CITIZEN_REPORTS } from '../../data/mockData';
import { CitizenReport, ReportStatus } from '../../types/civicshield';
import { ReportStatusBadge } from '../ui/Badges';
import { ReportIssueModal } from './ReportIssueModal';
import { ViewType } from '../layout/TacticalSidebar';

interface CitizenReportsViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const CitizenReportsView: React.FC<CitizenReportsViewProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<CitizenReport[]>(ALL_CITIZEN_REPORTS);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const statuses: ('All' | ReportStatus)[] = ['All', 'New', 'Reviewing', 'Verified', 'Resolved'];

  const filteredReports = reports.filter((r) => {
    const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
    const matchesSearch = !searchQ || r.title.toLowerCase().includes(searchQ.toLowerCase()) || r.id.toLowerCase().includes(searchQ.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r));
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <FileText className="w-3.5 h-3.5" />
            <span>CROWDSOURCED GEOSPATIAL INTELLIGENCE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            Citizen Grievance &amp; Verification Triage
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Ground-level field observations cross-referenced against satellite orbital telemetry
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Report a Civic Issue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Status Pipeline Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <span className="text-[10px] text-slate-500 uppercase font-bold px-1">Pipeline:</span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                selectedStatus === st
                  ? 'bg-amber-500 text-black font-bold border-amber-500 shadow-sm'
                  : 'bg-tactical-900 text-slate-400 hover:text-white border-tactical-750 hover:bg-tactical-850'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-64 flex items-center px-3 py-1.5 rounded-lg bg-tactical-900 border border-tactical-750 text-xs font-mono">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search report ID or keyword..."
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 flex flex-col justify-between space-y-3 shadow-md hover:border-tactical-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-amber-400">
                  {report.id}
                </span>
                <ReportStatusBadge status={report.status} />
              </div>

              <h3 className="font-bold text-sm text-white line-clamp-2">
                {report.title}
              </h3>

              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 mt-1">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{report.locationName}</span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-3 mt-2 font-sans leading-relaxed">
                {report.description}
              </p>
            </div>

            {/* AI Triage Corroboration Note */}
            <div className="p-2.5 rounded-lg bg-tactical-950 border border-tactical-800 text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase text-[9px]">AI Triage Corroboration</span>
                {report.satelliteCorroborated && (
                  <span className="text-intel-cyan text-[10px] flex items-center gap-1">
                    <Satellite className="w-2.5 h-2.5" />
                    Corroborated
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-[10px] leading-snug">
                {report.aiTriageSummary}
              </p>
            </div>

            {/* Footer with Upvotes & Timestamp */}
            <div className="flex items-center justify-between pt-2 border-t border-tactical-800 text-xs font-mono text-slate-400">
              <button
                onClick={(e) => handleUpvote(report.id, e)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-tactical-800 hover:bg-tactical-750 text-slate-300 hover:text-white transition-colors"
                title="Support this community report"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">{report.upvotes}</span>
              </button>

              <span className="text-[11px]">{report.submittedTimeAgo}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReportCreated={(newR) => setReports(prev => [newR, ...prev])}
      />

    </div>
  );
};
