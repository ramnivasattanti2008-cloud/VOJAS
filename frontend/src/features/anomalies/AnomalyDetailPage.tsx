import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { anomalyApi } from "@/services/anomaly-api";
import { aiApi } from "@/services/ai-api";
import { ApiError } from "@/services/api";
import {
  type Anomaly,
  type AIExplanation,
  SEVERITY_COLORS,
  getAnomalyCategoryLabel,
  getStatusLabel,
  getRiskLabel,
} from "@/types";
import { LoadingState, ErrorState } from "@/components/ui";
import AIVerdictPanel from "./AIVerdictPanel";
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
} from "lucide-react";

export default function AnomalyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"ack" | "resolve" | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolution, setResolution] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    anomalyApi.get(id)
      .then(setAnomaly)
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAcknowledge = async () => {
    if (!id) return;
    setActionPending("ack");
    try {
      const updated = await anomalyApi.acknowledge(id);
      setAnomaly(updated);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setActionPending(null);
    }
  };

  const handleResolve = async () => {
    if (!id || !resolution.trim()) return;
    setActionPending("resolve");
    try {
      const updated = await anomalyApi.resolve(id, resolution.trim());
      setAnomaly(updated);
      setShowResolveDialog(false);
      setResolution("");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setActionPending(null);
    }
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
      // Merge the new AI data into the local state
      setAnomaly((prev) =>
        prev
          ? {
              ...prev,
              aiExplanation: JSON.stringify(result),
              aiConfidence: result.confidence,
            }
          : prev
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI explanation");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading anomaly..." />;
  if (error && !anomaly) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!anomaly) return <ErrorState message="Anomaly not found" />;

  const sevStyle = SEVERITY_COLORS[anomaly.severity];
  const risk = getRiskLabel(anomaly.riskScore);

  // Parse evidence JSON if present
  let evidence: Record<string, unknown> | null = null;
  if (anomaly.evidence) {
    try {
      evidence = JSON.parse(anomaly.evidence);
    } catch {
      // ignore
    }
  }

  // Parse AI explanation JSON if present
  let aiExplanation: AIExplanation | null = null;
  if (anomaly.aiExplanation) {
    try {
      aiExplanation = JSON.parse(anomaly.aiExplanation) as AIExplanation;
    } catch {
      // ignore
    }
  }

  const isOpen = anomaly.status === "OPEN";
  const isResolved = anomaly.status === "RESOLVED" || anomaly.status === "DISMISSED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* Back button */}
      <button
        onClick={() => navigate("/anomalies")}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
        aria-label="Back to anomalies"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
        Back to Anomalies
      </button>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero header */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />

        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${sevStyle.bg} ${sevStyle.text}`}>
              <span className={`w-2 h-2 rounded-full ${sevStyle.dot}`} />
              {anomaly.severity}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-white/5 text-slate-300 uppercase tracking-wider">
              {getAnomalyCategoryLabel(anomaly.category)}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-500/10 text-blue-400 uppercase tracking-wider">
              {getStatusLabel(anomaly.status)}
            </span>
          </div>

          {/* Risk score */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Risk Score</p>
            <p className={`text-3xl font-bold ${risk.color} leading-none`}>{anomaly.riskScore}</p>
            <p className={`text-[10px] mt-0.5 ${risk.color}`}>{risk.label}</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white leading-tight mb-2">{anomaly.title}</h1>
        <p className="text-sm text-slate-400 leading-relaxed">{anomaly.description}</p>

        {/* Actions */}
        {!isResolved && (
          <div className="mt-5 pt-5 border-t border-white/5 flex items-center gap-3 flex-wrap">
            {isOpen && (
              <button
                onClick={handleAcknowledge}
                disabled={actionPending !== null}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {actionPending === "ack" ? (
                  <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Acknowledge
              </button>
            )}
            <button
              onClick={() => setShowResolveDialog(true)}
              disabled={actionPending !== null}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Resolved
            </button>
          </div>
        )}

        {isResolved && anomaly.resolvedBy && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RESOLVED
              </div>
              <p className="text-xs text-slate-400 mb-1.5">
                By {anomaly.resolvedBy.name} on{" "}
                {anomaly.resolvedAt && new Date(anomaly.resolvedAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {anomaly.resolution && (
                <p className="text-xs text-slate-300 leading-relaxed italic">"{anomaly.resolution}"</p>
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
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-electric-400" />
                Detection Evidence
              </h2>
              <div className="space-y-2 text-xs">
                {Object.entries(evidence).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-slate-200 text-right max-w-[60%]">
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

          {/* AI Verdict — Phase 11 */}
          {aiExplanation ? (
            <AIVerdictPanel
              explanation={aiExplanation}
              severity={anomaly.severity}
              onRegenerate={handleGenerateExplanation}
              loading={aiLoading}
            />
          ) : (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-saffron-400" />
                AI Verdict
                {!aiLoading && (
                  <button
                    onClick={handleGenerateExplanation}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[11px] font-semibold hover:bg-saffron-500/20 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </button>
                )}
                {aiLoading && (
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-saffron-400">
                    <span className="w-3 h-3 border-2 border-saffron-400/30 border-t-saffron-400 rounded-full animate-spin" />
                    Analyzing...
                  </span>
                )}
              </h2>

              {aiError && (
                <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
                  <p className="text-[11px] text-red-300">{aiError}</p>
                </div>
              )}

              {!aiLoading && (
                <p className="text-[11px] text-slate-500 italic">
                  No AI analysis yet. Click "Generate" to run the explainability model on this anomaly.
                </p>
              )}
            </div>
          )}

          {/* Project link */}
          {anomaly.project && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-electric-400" />
                Linked Project
              </h2>
              <button
                onClick={() => navigate(`/projects/${anomaly.project!.id}`)}
                className="w-full text-left p-3 rounded-lg bg-navy-800/40 border border-white/5 hover:border-white/15 hover:bg-navy-800/70 transition-all group"
              >
                <p className="text-sm font-semibold text-slate-200 group-hover:text-electric-300 transition-colors">
                  {anomaly.project.name}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {anomaly.project.district}, {anomaly.project.state}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                    {anomaly.project.status}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>{anomaly.project.sector.replace(/_/g, " ")}</span>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-electric-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Detection Details</h3>
            <div className="space-y-2.5 text-xs">
              {anomaly.ruleCode && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Rule</span>
                  <span className="font-mono text-slate-200 text-[10px]">{anomaly.ruleCode}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Severity</span>
                <span className={sevStyle.text}>{anomaly.severity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Risk Score</span>
                <span className={`font-semibold ${risk.color}`}>{anomaly.riskScore} / 100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-slate-200">{getStatusLabel(anomaly.status)}</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Timeline</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300">Detected</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(anomaly.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {anomaly.acknowledgedAt && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300">Acknowledged by {anomaly.acknowledgedBy?.name ?? "—"}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(anomaly.acknowledgedAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {anomaly.resolvedAt && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300">Resolved by {anomaly.resolvedBy?.name ?? "—"}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(anomaly.resolvedAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-electric-400" />
              Trust Notice
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              This anomaly is a <em>risk indicator</em>, not a fraud conviction. Final verification
              is the responsibility of authorized government officers.
            </p>
          </div>
        </div>
      </div>

      {/* Resolve dialog */}
      {showResolveDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowResolveDialog(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-dialog-title"
        >
          <div
            className="glass rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="resolve-dialog-title" className="text-base font-semibold text-white mb-1">Mark as Resolved</h3>
            <p className="text-xs text-slate-400 mb-4">
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
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all resize-none"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowResolveDialog(false); setResolution(""); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.trim() || actionPending === "resolve"}
                className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-xs font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {actionPending === "resolve" ? "Resolving..." : "Confirm Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
