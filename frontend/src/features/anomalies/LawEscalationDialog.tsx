import { useState } from "react";
import { useLawEnforcementAuthorities, useEscalateAnomaly } from "@/hooks/useLawEnforcement";
import type { LawAuthority, EscalationResult } from "@/services/lawEnforcementApi";
import {
  Shield,
  X,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface Props {
  anomalyId: string;
  anomalyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onEscalated?: (result: EscalationResult) => void;
}

// Authority visual styling (color + icon for the picker)
const AUTHORITY_STYLES: Record<LawAuthority, { accent: string; bg: string; border: string; ring: string; icon: string }> = {
  ACB_OFFICE: {
    accent: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    ring: "ring-red-500/50",
    icon: "🛡️",
  },
  POLICE_OFFICE: {
    accent: "text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    ring: "ring-blue-500/50",
    icon: "👮",
  },
  CVC: {
    accent: "text-purple-300",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    ring: "ring-purple-500/50",
    icon: "⚖️",
  },
  LOKAYUKTA: {
    accent: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    ring: "ring-amber-500/50",
    icon: "🏛️",
  },
  VIGILANCE: {
    accent: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/50",
    icon: "🔍",
  },
  COMPTROLLER: {
    accent: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    ring: "ring-cyan-500/50",
    icon: "📊",
  },
};

export default function LawEscalationDialog({
  anomalyId,
  anomalyTitle,
  isOpen,
  onClose,
  onEscalated,
}: Props) {
  const { data: authorities = [] } = useLawEnforcementAuthorities();
  const escalate = useEscalateAnomaly();

  const [selected, setSelected] = useState<LawAuthority | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EscalationResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selected) {
      setError("Please select an authority");
      return;
    }
    setError(null);
    try {
      const result = await escalate.mutateAsync({
        anomalyId,
        authority: selected,
        notes: notes.trim() || undefined,
        notifyAllAdmins: true,
      });
      setSuccess(result);
      onEscalated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Escalation failed");
    }
  };

  const handleClose = () => {
    setSelected(null);
    setNotes("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalation-dialog-title"
    >
      <div
        className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 id="escalation-dialog-title" className="text-base font-bold text-white flex items-center gap-2">
                Escalate to Law Enforcement
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                {anomalyTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          /* ── Success state ────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-300">
                  Escalation successful
                </p>
              </div>
              <p className="text-xs text-emerald-200/80 mb-3">
                {success.notifiedAdmins} admin/officer
                {success.notifiedAdmins === 1 ? "" : "s"} notified.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-t border-emerald-500/20">
                  <span className="text-emerald-200/60 uppercase tracking-wider text-[10px]">
                    Authority
                  </span>
                  <span className="text-emerald-200 font-semibold">
                    {success.authorityLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-t border-emerald-500/20">
                  <span className="text-emerald-200/60 uppercase tracking-wider text-[10px]">
                    Reference No.
                  </span>
                  <span className="text-emerald-200 font-mono font-bold">
                    {success.lawReferenceNo}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-t border-emerald-500/20">
                  <span className="text-emerald-200/60 uppercase tracking-wider text-[10px]">
                    Escalated at
                  </span>
                  <span className="text-emerald-200">
                    {new Date(success.escalatedAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {success.caseId && (
                  <div className="flex items-center justify-between py-1.5 border-t border-emerald-500/20">
                    <span className="text-emerald-200/60 uppercase tracking-wider text-[10px]">
                      Case ID
                    </span>
                    <span className="text-emerald-200 font-mono text-[10px]">
                      {success.caseId}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-electric-500 hover:bg-electric-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form state ──────────────────────────────────────────────── */
          <>
            {/* Warning */}
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                This will formally refer the anomaly to the selected law-enforcement
                authority. A unique reference number will be generated, a case will be
                opened, and all admins/officers will be notified.
              </p>
            </div>

            {/* Authority picker */}
            <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-2 block">
              Select Authority
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {authorities.map((auth) => {
                const style = AUTHORITY_STYLES[auth.code];
                const isSelected = selected === auth.code;
                return (
                  <button
                    key={auth.code}
                    type="button"
                    onClick={() => setSelected(auth.code)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? `${style.bg} ${style.border} ring-1 ${style.ring}`
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="text-2xl shrink-0">{style.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold ${isSelected ? style.accent : "text-slate-200"}`}
                      >
                        {auth.label}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className={`w-4 h-4 ${style.accent} shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notes */}
            <label
              htmlFor="escalation-notes"
              className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-2 block"
            >
              Notes for Authority (optional)
            </label>
            <textarea
              id="escalation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context, evidence, or instructions for the investigating authority..."
              rows={3}
              maxLength={2000}
              className="w-full bg-navy-800/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/30 resize-none"
            />
            <p className="text-[10px] text-slate-500 mt-1 text-right">
              {notes.length} / 2000
            </p>

            {/* Error */}
            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || escalate.isPending}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {escalate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Escalating…
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Escalate
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
