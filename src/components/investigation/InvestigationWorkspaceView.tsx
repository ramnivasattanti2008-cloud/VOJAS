import React, { useState } from 'react';
import { 
  Briefcase, 
  Clock, 
  Satellite, 
  FileText, 
  Download, 
  Share2, 
  CheckCircle2, 
  Plus, 
  AlertTriangle, 
  Brain, 
  UserCheck,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { PRIMARY_INVESTIGATION } from '../../data/mockData';
import { EpistemicBadge, SeverityBadge } from '../ui/Badges';
import { ViewType } from '../layout/TacticalSidebar';

interface InvestigationWorkspaceViewProps {
  onNavigate: (view: ViewType, id?: string) => void;
  caseId?: string;
}

export const InvestigationWorkspaceView: React.FC<InvestigationWorkspaceViewProps> = ({ onNavigate, caseId = 'CS-1042' }) => {
  const [investigation, setInvestigation] = useState(PRIMARY_INVESTIGATION);
  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline' | 'ai' | 'notes'>('evidence');
  const [newNote, setNewNote] = useState('');
  const [isVerified, setIsVerified] = useState(investigation.status === 'VERIFIED');
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const note = {
      author: 'Current User (Vigilance)',
      time: 'Just now',
      content: newNote.trim()
    };
    setInvestigation(prev => ({ ...prev, notes: [note, ...prev.notes] }));
    setNewNote('');
  };

  const handleMarkVerified = () => {
    setIsVerified(true);
    setInvestigation(prev => ({ ...prev, status: 'VERIFIED' }));
  };

  const handleExport = () => {
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4 overflow-y-auto bg-tactical-950 text-slate-100 select-none text-left">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tactical-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-intel-cyan">
            <Briefcase className="w-3.5 h-3.5" />
            <span>CIVIC VIGILANCE INVESTIGATION DOSSIER</span>
            <span className="text-slate-600">|</span>
            <span className="text-white font-bold">CASE #{investigation.id}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans text-white mt-0.5">
            {investigation.title}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {investigation.location} · Opened {investigation.openedAt} · Assigned: {investigation.assignedOfficer}
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tactical-700 bg-tactical-850 hover:bg-tactical-800 text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Brief (PDF)</span>
          </button>

          {!isVerified ? (
            <button
              onClick={handleMarkVerified}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold transition-all shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Ground Verified</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>VERIFIED CASE</span>
            </span>
          )}
        </div>
      </div>

      {showExportSuccess && (
        <div className="p-3 rounded-lg bg-intel-cyan/15 border border-intel-cyan/40 text-intel-cyan font-mono text-xs flex items-center justify-between animate-in fade-in">
          <span>✓ Dossier report generated: CivicShield-Investigation-CS1042.pdf</span>
          <span className="text-slate-400">Cryptographic Hash: 9e4f2a...c01</span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-tactical-800 text-xs font-mono">
        <button
          onClick={() => setActiveTab('evidence')}
          className={`pb-2 px-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'evidence'
              ? 'border-intel-cyan text-intel-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Evidence Gallery ({investigation.evidenceFiles.length})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-2 px-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'timeline'
              ? 'border-intel-cyan text-intel-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Event Chronology ({investigation.timeline.length})
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-2 px-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'ai'
              ? 'border-intel-cyan text-intel-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Structured AI Analysis
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-2 px-3 border-b-2 font-semibold transition-colors ${
            activeTab === 'notes'
              ? 'border-intel-cyan text-intel-cyan'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Field Notes ({investigation.notes.length})
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 min-h-[400px]">
        
        {/* EVIDENCE GALLERY TAB */}
        {activeTab === 'evidence' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investigation.evidenceFiles.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 flex flex-col justify-between space-y-3 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-intel-cyan font-bold">#{ev.id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tactical-800 text-slate-300 border border-tactical-700">
                      {ev.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white">{ev.title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Timestamp: {ev.timestamp}</p>
                </div>

                <div className="pt-2 border-t border-tactical-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (ev.type.includes('Satellite')) onNavigate('compare');
                      else if (ev.type.includes('Citizen')) onNavigate('reports');
                    }}
                    className="flex items-center gap-1.5 text-xs font-mono text-intel-cyan hover:underline font-semibold"
                  >
                    <span>View Evidence Asset</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-emerald-400">Cryptographically Signed</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="p-4 rounded-xl border border-tactical-800 bg-tactical-900/90 shadow-md">
            <div className="space-y-4">
              {investigation.timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 text-xs font-mono">
                  <div className="text-right w-24 shrink-0">
                    <span className="text-white font-bold block">{item.time}</span>
                    <span className="text-slate-500 text-[10px]">{item.date}</span>
                  </div>

                  <div className="w-2 h-2 rounded-full bg-intel-cyan mt-1 shrink-0 ring-4 ring-intel-cyan/20" />

                  <div className="flex-1 pb-4 border-b border-tactical-800 last:border-none">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-200">{item.event}</span>
                      <EpistemicBadge source={item.source} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STRUCTURED AI ANALYSIS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            
            {/* Observed Data vs Inferred Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-tactical-900 text-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-tactical-800">
                  <span className="font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    OBSERVED EMPIRICAL DATA
                  </span>
                  <EpistemicBadge source="SATELLITE_OBSERVATION" size="sm" />
                </div>
                <ul className="space-y-2 list-disc list-inside text-slate-200">
                  {investigation.observedData.map((d, i) => (
                    <li key={i} className="leading-relaxed">{d}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-tactical-900 text-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-tactical-800">
                  <span className="font-mono text-purple-300 font-bold uppercase tracking-wider">
                    STATISTICAL AI INFERENCES
                  </span>
                  <EpistemicBadge source="AI_INFERENCE" size="sm" />
                </div>
                <ul className="space-y-2 list-disc list-inside text-slate-200">
                  {investigation.aiInferences.map((inf, i) => (
                    <li key={i} className="leading-relaxed">{inf}</li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Potential Explanations & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-xl border border-amber-500/30 bg-tactical-900 text-xs">
                <span className="font-mono text-amber-300 font-bold uppercase tracking-wider block mb-2">
                  Potential Explanations &amp; Hypotheses
                </span>
                <ul className="space-y-2 text-slate-300 font-mono text-[11px]">
                  {investigation.potentialExplanations.map((exp, i) => (
                    <li key={i} className="p-2 rounded bg-tactical-850 border border-tactical-800">
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-red-500/30 bg-tactical-900 text-xs">
                <span className="font-mono text-red-400 font-bold uppercase tracking-wider block mb-2">
                  Recommended Verification Protocols
                </span>
                <ul className="space-y-2 text-slate-300 font-mono text-[11px]">
                  {investigation.recommendedVerification.map((rec, i) => (
                    <li key={i} className="p-2 rounded bg-tactical-850 border border-tactical-800">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Add note form */}
            <form onSubmit={handleAddNote} className="p-3 rounded-xl border border-tactical-750 bg-tactical-900 flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log an official vigilance note or field finding..."
                className="flex-1 bg-tactical-850 border border-tactical-700 px-3 py-2 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-intel-cyan"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
              >
                Add Note
              </button>
            </form>

            {/* Existing notes */}
            <div className="space-y-2">
              {investigation.notes.map((note, i) => (
                <div key={i} className="p-3 rounded-xl border border-tactical-800 bg-tactical-900/80 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-intel-cyan font-bold">{note.author}</span>
                    <span className="text-[10px]">{note.time}</span>
                  </div>
                  <p className="text-slate-200 font-sans mt-1">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
