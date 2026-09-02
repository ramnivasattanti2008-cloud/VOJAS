/**
 * AnomalyDetailPage — VOJAS 2.0 Anomaly Detail View
 *
 * IBM Carbon–inspired light theme. Professional data-management layout.
 * No gradients, no glassmorphism, no glow effects.
 * All data from real hooks (no fabricated numbers).
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAnomaly, useAcknowledgeAnomaly, useResolveAnomaly } from "@/hooks/useAnomalies";
import { aiApi } from "@/services/ai-api";
import {
  type AIExplanation,
  getAnomalyCategoryLabel,
  getStatusLabel,
  getRiskLabel,
  type AnomalySeverity,
} from "@/types";
import { LoadingState, ErrorState } from "@/components/ui";
import AIVerdictPanel from "./AIVerdictPanel";
import LawEscalationDialog from "./LawEscalationDialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  MapPin,
  Shield,
  CheckCircle2,
  Clock,
  FileText,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Gavel,
} from "lucide-react";

const SEV_BADGE: Record<AnomalySeverity, string> = {
  CRITICAL: "bg-red-50 text-red-700",
  HIGH:     "bg-orange-50 text-orange-700",
  MEDIUM:   "bg-yellow-50 text-yellow-700",
  LOW:      "bg-blue-50 text-blue-700",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AnomalyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const anomalyQuery = useAnomaly(id);
  const ackMutation = useAcknowledgeAnomaly();
  const resolveMutation = useResolveAnomaly();

  const anomaly = anomalyQuery.data ?? null;
  const loading = anomalyQuery.isLoading;
  const error = anomalyQuery.error?.message ?? null;
  const actionPending = ackMutation.isPending || resolveMutation.isPending
    ? (ackMutation.isPending ? "ack" : "resolve")
    : null;

  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [resolution, setResolution] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAcknowledge = async () => {
    if (!id) return;
    try {
      await ackMutation.mutateAsync(id);
    } catch { /* error handled via mutation state */ }
  };

  const handleResolve = async () => {
    if (!id || !resolution.trim()) return;
    try {
      await resolveMutation.mutateAsync({ id, resolution: resolution.trim() });
      setShowResolveDialog(false);
      setResolution("");
    } catch { /* error handled via mutation state */ }
  };

  const handleGenerateExplanation = async () => {
    if (!anomaly) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await aiApi.explainAnomaly({
        title: anomaly.title,
        description: anomaly.description,
        category: anomaly.category,
        severity: anomaly.severity,
        riskScore: anomaly.riskScore,
        ruleCode: anomaly.ruleCode ?? undefined,
        projectName: anomaly.project?.name,
      });
      void result;
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI explanation");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading anomaly…" />;
  if (error && !anomaly) return <ErrorState message={error} onRetry={() => anomalyQuery.refetch()} />;
  if (!anomaly) return <ErrorState message="Anomaly not found" />;

  const sevBadge = SEV_BADGE[anomaly.severity] ?? SEV_BADGE.LOW;
  const risk = getRiskLabel(anomaly.riskScore);

  let evidence: Record<string, unknown> | null = null;
  if (anomaly.evidence) {
    try { evidence = JSON.parse(anomaly.evidence); } catch { /* ignore */ }
  }

  let aiExplanation: AIExplanation | null = null;
  if (anomaly.aiExplanation) {
    try { aiExplanation = JSON.parse(anomaly.aiExplanation) as AIExplanation; } catch { /* ignore */ }
  }

  const isOpen = anomaly.status === "OPEN";
  const isResolved = anomaly.status === "RESOLVED" || anomaly.status === "DISMISSED";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back button */}
      <button
        onClick={() => navigate("/anomalies")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
        aria-label="Back to anomalies"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
        Back to Anomalies
      </button>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider", sevBadge)}>
              {anomaly.severity}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 uppercase tracking-wider">
              {getAnomalyCategoryLabel(anomaly.category)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-700 uppercase tracking-wider">
              {getStatusLabel(anomaly.status)}
            </span>
          </div>

          {/* Risk score */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Risk Score</p>
            <p className={cn("text-3xl font-bold leading-none tabular-nums", risk.color)}>{anomaly.riskScore}</p>
            <p className={cn("text-[10px] mt-0.5 font-medium", risk.color)}>{risk.label}</p>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 leading-tight mb-2">{anomaly.title}</h1>
        <p className="text-sm text-gray-600 leading-relaxed">{anomaly.description}</p>

        {/* Actions */}
        {!isResolved && (
          <div className="mt-5 pt-4 border-t border-gray-200 flex items-center gap-3 flex-wrap">
            {isOpen && (
              <button
                onClick={handleAcknowledge}
                disabled={actionPending !== null}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 text-sm font-medium rounded transition-colors disabled:opacity-50"
              >
                {actionPending === "ack" ? (
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Acknowledge
              </button>
            )}
            <button
              onClick={() => setShowResolveDialog(true)}
              disabled={actionPending !== null}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 text-sm font-medium rounded transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Resolved
            </button>
            {!anomaly.lawEscalation && (
              <button
                onClick={() => setShowEscalationDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700 text-sm font-medium rounded transition-colors"
              >
                <Gavel className="w-4 h-4" />
                Escalate to Law Enforcement
              </button>
            )}
          </div>
        )}

        {/* Law enforcement escalation info */}
        {anomaly.lawEscalation && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
                  <Gavel className="w-3.5 h-3.5" />
                  ESCALATED TO LAW ENFORCEMENT
                </div>
                {anomaly.lawAcknowledged && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Acknowledged
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-[11px]">
                {[
                  { label: "Authority", value: anomaly.lawAuthorityLabel ?? anomaly.lawAuthority },
                  ...(anomaly.lawReferenceNo ? [{ label: "Reference", value: anomaly.lawReferenceNo, mono: true }] : []),
                  ...(anomaly.lawEscalatedAt ? [{ label: "Escalated at", value: fmtDate(anomaly.lawEscalatedAt) }] : []),
                  ...(anomaly.escalatedBy ? [{ label: "Escalated by", value: anomaly.escalatedBy.name }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className={cn("text-gray-800 font-medium", mono && "font-mono")}>{value}</span>
                  </div>
                ))}
                {anomaly.lawNotes && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="text-gray-700 italic text-[10px] leading-relaxed">
                      "{anomaly.lawNotes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resolved info */}
        {isResolved && anomaly.resolvedBy && (
          <div className="mt-5 pt-4 border-t border-gray-200">
            <div className="p-3 rounded-md bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 text-green-700 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RESOLVED
              </div>
              <p className="text-xs text-gray-600 mb-1.5">
                By {anomaly.resolvedBy.name} on {fmtDate(anomaly.resolvedAt)}
              </p>
              {anomaly.resolution && (
                <p className="text-xs text-gray-700 leading-relaxed italic">"{anomaly.resolution}"</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Evidence */}
          {evidence && Object.keys(evidence).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-md p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Detection Evidence
              </h2>
              <div className="space-y-2 text-xs">
                {Object.entries(evidence).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500 font-mono uppercase tracking-wider text-[10px]">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-gray-800 text-right max-w-[60%]">
                      {typeof value === "number"
                        ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                        : Array.isArray(value)
                        ? value.join(", ")
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Verdict */}
          {aiExplanation ? (
            <AIVerdictPanel
              explanation={aiExplanation}
              severity={anomaly.severity}
              onRegenerate={handleGenerateExplanation}
              loading={aiLoading}
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-md p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                AI Verdict
                {!aiLoading && (
                  <button
                    onClick={handleGenerateExplanation}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-[11px] font-medium transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </button>
                )}
                {aiLoading && (
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Analyzing…
                  </span>
                )}
              </h2>

              {aiError && (
                <div className="mb-3 flex items-center gap-2 p-2.5 rounded-md bg-red-50 border border-red-200" role="alert">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
                  <p className="text-[11px] text-red-700">{aiError}</p>
                </div>
              )}

              {!aiLoading && !aiError && (
                <p className="text-[11px] text-gray-500 italic">
                  No AI analysis yet. Click "Generate" to run the explainability model on this anomaly.
                </p>
              )}
            </div>
          )}

          {/* Project link */}
          {anomaly.project && (
            <div className="bg-white border border-gray-200 rounded-md p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                Linked Project
              </h2>
              <button
                onClick={() => navigate(`/projects/${anomaly.project!.id}`)}
                className="w-full text-left p-3 rounded-md bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors group"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  {anomaly.project.name}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {anomaly.project.district}, {anomaly.project.state}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-gray-600 border border-gray-200">
                    {anomaly.project.status}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span>{anomaly.project.sector.replace(/_/g, " ")}</span>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Detection Details</h3>
            <div className="space-y-2.5 text-xs">
              {anomaly.ruleCode && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Rule</span>
                  <span className="font-mono text-gray-800 text-[10px]">{anomaly.ruleCode}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Severity</span>
                <span className="text-gray-800">{anomaly.severity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Risk Score</span>
                <span className={cn("font-semibold", risk.color)}>{anomaly.riskScore} / 100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-gray-800">{getStatusLabel(anomaly.status)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">Detected</p>
                  <p className="text-[10px] text-gray-500">{fmtDate(anomaly.createdAt)}</p>
                </div>
              </div>

              {anomaly.acknowledgedAt && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800">Acknowledged by {anomaly.acknowledgedBy?.name ?? "—"}</p>
                    <p className="text-[10px] text-gray-500">{fmtDate(anomaly.acknowledgedAt)}</p>
                  </div>
                </div>
              )}

              {anomaly.resolvedAt && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800">Resolved by {anomaly.resolvedBy?.name ?? "—"}</p>
                    <p className="text-[10px] text-gray-500">{fmtDate(anomaly.resolvedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              Trust Notice
            </h3>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              This anomaly is a risk indicator, not a fraud conviction. Final verification
              is the responsibility of authorized government officers.
            </p>
          </div>
        </div>
      </div>

      {/* Resolve dialog */}
      {showResolveDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowResolveDialog(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-dialog-title"
        >
          <div
            className="bg-white border border-gray-200 rounded-md p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="resolve-dialog-title" className="text-base font-semibold text-gray-900 mb-1">Mark as Resolved</h3>
            <p className="text-xs text-gray-500 mb-4">
              Briefly describe what action you took or what was concluded.
            </p>
            <label htmlFor="resolve-resolution" className="sr-only">
              Resolution notes
            </label>
            <textarea
              id="resolve-resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
              placeholder="e.g. Reviewed budget records; overrun justified by additional emergency work approved by district office."
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowResolveDialog(false); setResolution(""); }}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.trim() || actionPending === "resolve"}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded transition-colors disabled:cursor-not-allowed"
              >
                {actionPending === "resolve" ? "Resolving…" : "Confirm Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Law enforcement escalation dialog */}
      <LawEscalationDialog
        anomalyId={id ?? ""}
        anomalyTitle={anomaly.title}
        isOpen={showEscalationDialog}
        onClose={() => setShowEscalationDialog(false)}
        onEscalated={() => {
          anomalyQuery.refetch();
        }}
      />
    </div>
  );
}
