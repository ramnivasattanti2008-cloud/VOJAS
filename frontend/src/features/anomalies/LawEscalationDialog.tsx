/**
 * LawEscalationDialog — Modal for escalating anomaly to law enforcement
 * IBM Carbon light theme.
 */

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
import { cn } from "@/lib/utils";

interface Props {
  anomalyId: string;
  anomalyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onEscalated?: (result: EscalationResult) => void;
}

// Authority styling (light theme)
const AUTHORITY_STYLES: Record<LawAuthority, { accent: string; text: string; bgSelected: string; borderSelected: string; ring: string; emoji: string }> = {
  ACB_OFFICE:   { accent: "bg-red-50 border-red-200",    text: "text-red-700",    bgSelected: "bg-red-50",     borderSelected: "border-red-300",    ring: "ring-red-200",     emoji: "🛡️" },
  POLICE_OFFICE:{ accent: "bg-blue-50 border-blue-200",  text: "text-blue-700",   bgSelected: "bg-blue-50",    borderSelected: "border-blue-300",   ring: "ring-blue-200",    emoji: "👮" },
  CVC:          { accent: "bg-purple-50 border-purple-200", text: "text-purple-700", bgSelected: "bg-purple-50", borderSelected: "border-purple-300", ring: "ring-purple-200", emoji: "⚖️" },
  LOKAYUKTA:    { accent: "bg-amber-50 border-amber-200", text: "text-amber-700",  bgSelected: "bg-amber-50",   borderSelected: "border-amber-300",  ring: "ring-amber-200",   emoji: "🏛️" },
  VIGILANCE:    { accent: "bg-green-50 border-green-200", text: "text-green-700",  bgSelected: "bg-green-50",   borderSelected: "border-green-300",  ring: "ring-green-200",   emoji: "🔍" },
  COMPTROLLER:  { accent: "bg-cyan-50 border-cyan-200",  text: "text-cyan-700",   bgSelected: "bg-cyan-50",    borderSelected: "border-cyan-300",   ring: "ring-cyan-200",    emoji: "📊" },
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
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalation-dialog-title"
    >
      <div
        className="bg-white border border-gray-200 rounded-md p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 id="escalation-dialog-title" className="text-base font-semibold text-gray-900">
                Escalate to Law Enforcement
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                {anomalyTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          /* Success */
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Escalation successful</p>
              </div>
              <p className="text-xs text-green-700 mb-3">
                {success.notifiedAdmins} admin/officer
                {success.notifiedAdmins === 1 ? "" : "s"} notified.
              </p>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Authority", value: success.authorityLabel },
                  { label: "Reference No.", value: success.lawReferenceNo, mono: true },
                  {
                    label: "Escalated at",
                    value: new Date(success.escalatedAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    }),
                  },
                  ...(success.caseId ? [{ label: "Case ID", value: success.caseId, mono: true }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-t border-green-200">
                    <span className="text-green-600 uppercase tracking-wider text-[10px]">{label}</span>
                    <span className={cn("text-gray-800 font-medium", mono && "font-mono")}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <>
            <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This will formally refer the anomaly to the selected law-enforcement authority.
                A unique reference number will be generated, a case will be opened, and all
                admins/officers will be notified.
              </p>
            </div>

            <label className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2 block">
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
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-md border text-left transition-colors",
                      isSelected
                        ? `${style.bgSelected} ${style.borderSelected} ring-1 ${style.ring}`
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="text-2xl shrink-0">{style.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", isSelected ? style.text : "text-gray-700")}>
                        {auth.label}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className={cn("w-4 h-4 shrink-0", style.text)} />}
                  </button>
                );
              })}
            </div>

            <label
              htmlFor="escalation-notes"
              className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2 block"
            >
              Notes for Authority (optional)
            </label>
            <textarea
              id="escalation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context, evidence, or instructions for the investigating authority…"
              rows={3}
              maxLength={2000}
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">
              {notes.length} / 2000
            </p>

            {error && (
              <div className="mt-3 p-2.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || escalate.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
