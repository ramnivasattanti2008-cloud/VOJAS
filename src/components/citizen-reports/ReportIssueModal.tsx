import React, { useState } from 'react';
import { X, Upload, MapPin, CheckCircle2, Shield, Camera, FileText, Send } from 'lucide-react';
import { CitizenReport } from '../../types/civicshield';
import { submitCitizenReport } from '../../services/api';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: (report: CitizenReport) => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  onReportCreated
}) => {
  const [title, setTitle] = useState('');
  const [issueType, setIssueType] = useState<CitizenReport['issueType']>('Construction');
  const [locationName, setLocationName] = useState('Bellandur Lake Southern Swale, Bengaluru');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<CitizenReport | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      const result = await submitCitizenReport({
        title,
        issueType,
        locationName,
        coordinates: { lat: 12.9348, lng: 77.6952 },
        description,
        evidenceName: 'evidence_camera_01.jpg'
      });
      setSubmittedReport(result);
      onReportCreated(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-tactical-750 bg-tactical-900 shadow-2xl p-6 text-left my-8 select-none">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-tactical-750">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400 font-bold mb-0.5">
              <Camera className="w-3.5 h-3.5" />
              <span>COMMUNITY SURVEILLANCE DESK</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Report a Civic or Environmental Anomaly
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-tactical-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Post-submission receipt view */}
        {submittedReport ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-mono text-sm font-bold text-emerald-300 uppercase tracking-wider">
                CIVIC REPORT REGISTERED
              </h4>
              <p className="font-mono text-xs text-slate-300">
                Case Tracking ID: <span className="text-white font-bold">{submittedReport.id}</span>
              </p>
            </div>

            {/* Telemetry verification indicators */}
            <div className="p-3 rounded-lg bg-tactical-850 border border-tactical-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Location Geotag Verified:</span>
                <span className="text-emerald-400 font-bold">✓ 12.9348° N, 77.6952° E</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Photographic Evidence Received:</span>
                <span className="text-emerald-400 font-bold">✓ EXIF Validated</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>AI Sensor Cross-Corroboration:</span>
                <span className="text-intel-cyan font-bold">In Progress (Sentinel-2)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-intel-cyan hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors"
            >
              Done &amp; View on Live Map
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 font-mono text-xs">
            
            {/* Title */}
            <div>
              <label className="text-slate-300 block mb-1 uppercase text-[11px] font-semibold">
                Issue Summary / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Heavy night earth-moving encroaching lake wetland..."
                className="w-full p-2.5 rounded-lg bg-tactical-850 border border-tactical-700 text-white placeholder-slate-500 focus:outline-none focus:border-intel-cyan font-sans"
              />
            </div>

            {/* Issue Category & Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 uppercase text-[11px] font-semibold">
                  Category
                </label>
                <select
                  value={issueType}
                  onChange={(e: any) => setIssueType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-tactical-850 border border-tactical-700 text-white focus:outline-none focus:border-intel-cyan"
                >
                  <option value="Construction">Construction</option>
                  <option value="Drainage">Drainage</option>
                  <option value="Waste">Waste Dumping</option>
                  <option value="Road">Road Damage</option>
                  <option value="Flooding">Flooding</option>
                  <option value="Encroachment">Encroachment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 uppercase text-[11px] font-semibold">
                  Location Name
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-tactical-850 border border-tactical-700 text-white focus:outline-none focus:border-intel-cyan truncate"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-slate-300 block mb-1 uppercase text-[11px] font-semibold">
                Detailed Field Description
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the machinery observed, timeline, visible waterlogging, or buffer boundary displacement..."
                className="w-full p-2.5 rounded-lg bg-tactical-850 border border-tactical-700 text-white placeholder-slate-500 focus:outline-none focus:border-intel-cyan font-sans resize-none"
              />
            </div>

            {/* Simulated Evidence Upload Dropzone */}
            <div className="p-4 rounded-xl border border-dashed border-tactical-700 bg-tactical-950/60 text-center hover:border-intel-cyan/50 transition-colors cursor-pointer">
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <span className="text-slate-300 font-bold block text-[11px]">
                Drop geotagged photos or flight video clips
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                PNG, JPG, MP4 with GPS metadata (Max 50MB)
              </span>
            </div>

            {/* Submit Actions */}
            <div className="pt-3 border-t border-tactical-750 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-tactical-700 bg-tactical-800 text-slate-300 hover:text-white font-mono text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Registering Docket...' : 'Submit Official Report'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
