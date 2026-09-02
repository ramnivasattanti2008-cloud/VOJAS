/**
 * ReportDetailPage — VOJAS Reports
 *
 * IBM Carbon-inspired light theme. No glassmorphism, no gradients,
 * no glow effects, no decorative animations. All functionality preserved.
 */

import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Clock,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  FileText,
  Shield,
  ShieldOff,
  Paperclip,
  Upload,
  Trash2,
  Download,
  File,
  Lock,
  Eye,
  Satellite,
} from "lucide-react";
import {
  useReport,
  useTransitionReport,
  useUploadReportAttachment,
  useRemoveReportAttachment,
} from "@/hooks/useReports";
import { ApiError } from "@/services/report-api";
import { useAuth } from "@/hooks/useAuth";
import SatelliteTimeline from "@/components/satellite/SatelliteTimeline";
import type {
  ReportStatus,
  ReportAttachment,
  ReportSeverity,
} from "@/types/report-types";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  STATUS_TRANSITIONS,
} from "@/types/report-types";
import { LoadingState, ErrorState, InlineToast } from "@/components/ui";
import { cn } from "@/lib/utils";

// ── Light-theme styles (override dark report-types tokens) ──────────────────

const SEVERITY_STYLES: Record<ReportSeverity, { bg: string; color: string; dot: string; label: string }> = {
  LOW:      { bg: "bg-gray-100 text-gray-700",  color: "text-gray-600",  dot: "bg-gray-500",   label: "Low" },
  MEDIUM:   { bg: "bg-amber-50 text-amber-700", color: "text-amber-600", dot: "bg-amber-500",  label: "Medium" },
  HIGH:     { bg: "bg-orange-50 text-orange-700", color: "text-orange-600", dot: "bg-orange-500", label: "High" },
  CRITICAL: { bg: "bg-red-50 text-red-700",     color: "text-red-600",   dot: "bg-red-500",    label: "Critical" },
};

const LIGHT_STATUS_COLORS: Record<ReportStatus, { bg: string; text: string; dot: string; label: string }> = {
  SUBMITTED:    { bg: "bg-gray-100 text-gray-700",   text: "text-gray-700",   dot: "bg-gray-500",   label: "Submitted" },
  ACKNOWLEDGED: { bg: "bg-blue-50 text-blue-700",    text: "text-blue-700",   dot: "bg-blue-500",   label: "Acknowledged" },
  UNDER_REVIEW: { bg: "bg-amber-50 text-amber-700",  text: "text-amber-700",  dot: "bg-amber-500",  label: "Under Review" },
  RESOLVED:     { bg: "bg-green-50 text-green-700",  text: "text-green-700",  dot: "bg-green-500",  label: "Resolved" },
  REJECTED:     { bg: "bg-red-50 text-red-700",     text: "text-red-700",    dot: "bg-red-500",    label: "Rejected" },
  CLOSED:       { bg: "bg-gray-100 text-gray-500",   text: "text-gray-500",   dot: "bg-gray-400",   label: "Closed" },
};

const LIGHT_CATEGORY_COLORS: Record<string, string> = {
  QUALITY:       "bg-purple-50 text-purple-700",
  DELAY:         "bg-amber-50 text-amber-700",
  CORRUPTION:    "bg-red-50 text-red-700",
  SAFETY:        "bg-orange-50 text-orange-700",
  ENVIRONMENT:   "bg-teal-50 text-teal-700",
  FINANCIAL:     "bg-yellow-50 text-yellow-700",
  DOCUMENTATION: "bg-cyan-50 text-cyan-700",
  OTHER:         "bg-gray-100 text-gray-600",
};

function getStatusStyle(v: ReportStatus) {
  return LIGHT_STATUS_COLORS[v] ?? LIGHT_STATUS_COLORS.SUBMITTED;
}
function getCategoryLabel(v: string) {
  return REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
function getSeverityLabel(v: string) {
  return REPORT_SEVERITIES.find((s) => s.value === v)?.label ?? v;
}
function getSeverityStyle(v: string) {
  const sev = REPORT_SEVERITIES.find((s) => s.value === v) ?? REPORT_SEVERITIES[0];
  return SEVERITY_STYLES[sev.value] ?? SEVERITY_STYLES.LOW;
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // React Query
  const reportQuery = useReport(id);
  const transitionMutation = useTransitionReport();
  const uploadMutation = useUploadReportAttachment(id ?? "");
  const removeAttachmentMutation = useRemoveReportAttachment(id ?? "");

  const report = reportQuery.data?.report ?? null;
  const loading = reportQuery.isLoading;
  const error = reportQuery.error?.message ?? null;

  // Status transition
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "">("");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [transitionResolution, setTransitionResolution] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const transitioning = transitionMutation.isPending;

  // Attachments
  const uploading = uploadMutation.isPending;
  const uploadError = uploadMutation.error?.message ?? null;
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Investigation / Original data access
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [investigationContext, setInvestigationContext] = useState("");
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);

  const canInvestigate = user?.role === "ADMIN" || user?.role === "REVIEWER";

  const canDeleteAttachment =
    user?.role === "ADMIN" || user?.role === "OFFICER" || user?.role === "REVIEWER";
  const canUpload = !!user; // any authenticated user can upload

  const availableTransitions = report
    ? STATUS_TRANSITIONS[report.status] ?? []
    : [];

  async function handleTransition() {
    if (!selectedStatus || !report || !id) return;
    setTransitionError(null);
    try {
      await transitionMutation.mutateAsync({
        id,
        payload: {
          toStatus: selectedStatus,
          notes: transitionNotes.trim() || undefined,
          resolution: transitionResolution.trim() || undefined,
        },
      });
      setTransitionOpen(false);
      setSelectedStatus("");
      setTransitionNotes("");
      setTransitionResolution("");
    } catch (err) {
      setTransitionError(err instanceof Error ? err.message : "Transition failed");
    }
  }

  // ── Attachment handlers ──────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      await uploadMutation.mutateAsync(file);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Upload failed";
      setToast(`Upload failed: ${msg}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(attachment: ReportAttachment) {
    if (!id) return;
    if (!window.confirm(`Delete "${attachment.originalName}"?`)) return;
    setDeletingAttachmentId(attachment.id);
    try {
      await removeAttachmentMutation.mutateAsync(attachment.id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setToast(`Delete failed: ${msg}`);
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  // ── Investigation handler ──────────────────────────────────────────────────

  async function handleViewOriginal() {
    if (!report) return;
    const trimmed = investigationContext.trim();
    if (trimmed.length < 10) {
      setOriginalError("Investigation context must be at least 10 characters.");
      return;
    }
    setLoadingOriginal(true);
    setOriginalError(null);
    try {
      const { reportApi } = await import("@/services/report-api");
      const result = await reportApi.getOriginal(report.id, trimmed);
      setOriginalData(result.report);
      setShowOriginalModal(false);
      setInvestigationContext("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load original data";
      setOriginalError(msg);
    } finally {
      setLoadingOriginal(false);
    }
  }

  function closeOriginalPanel() {
    setOriginalData(null);
  }

  if (loading) return <LoadingState message="Loading report..." />;
  if (error) return <ErrorState message={error} onRetry={() => reportQuery.refetch()} />;
  if (!report) return null;

  const sev = getSeverityStyle(report.severity);
  const statusStyle = getStatusStyle(report.status);
  const isOpen = ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW", "RESOLVED"].includes(report.status);
  const catClass = LIGHT_CATEGORY_COLORS[report.category] ?? LIGHT_CATEGORY_COLORS.OTHER;

  // Phase 13 — detect redaction
  const isRedacted =
    report.reporterName === "[REDACTED]" ||
    report.reporterEmail === "[REDACTED]" ||
    report.reporterPhone === "[REDACTED]";

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm">
          <InlineToast message={toast} type="error" onDismiss={() => setToast(null)} />
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/reports")}
          className="w-9 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors mt-0.5 shrink-0"
          aria-label="Back to reports"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{report.title}</h1>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Report #{report.id.slice(0, 8).toUpperCase()} · Submitted{" "}
                {formatDate(report.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Severity */}
              <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", sev.bg)}>
                <AlertTriangle className="w-3 h-3" />
                {sev.label}
              </span>
              {/* Status */}
              <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", statusStyle.bg)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                {statusStyle.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-md p-5 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Description
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {report.description}
            </p>
          </div>

          {/* Attachments */}
          <div className="bg-white border border-gray-200 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" />
                Attachments
                {(report.attachments?.length ?? 0) > 0 && (
                  <span className="text-[10px] text-gray-400 normal-case tracking-normal">
                    ({report.attachments!.length}/5)
                  </span>
                )}
              </h2>
              {canUpload && (report.attachments?.length ?? 0) < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all"
                  aria-label="Upload attachment"
                >
                  <Upload className="w-3 h-3" aria-hidden="true" />
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload attachment file"
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <p className="text-xs text-red-700">{uploadError}</p>
              </div>
            )}

            {report.attachments && report.attachments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {report.attachments.map((att) => (
                  <AttachmentCard
                    key={att.id}
                    attachment={att}
                    canDelete={canDeleteAttachment}
                    deleting={deletingAttachmentId === att.id}
                    onDelete={() => handleDeleteAttachment(att)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No attachments uploaded yet.</p>
            )}
          </div>

          {/* Location */}
          {report.locationDesc && (
            <div className="bg-white border border-gray-200 rounded-md p-5 space-y-2">
              <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </h2>
              <p className="text-sm text-gray-700">{report.locationDesc}</p>
              {report.latitude && report.longitude && (
                <p className="text-xs text-gray-500 font-mono">
                  {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                </p>
              )}
            </div>
          )}

          {/* Resolution (if resolved/rejected) */}
          {(report.resolution || report.status === "RESOLVED" || report.status === "REJECTED") && (
            <div className={cn(
              "bg-white border rounded-md p-5 space-y-2",
              report.status === "RESOLVED"
                ? "border-green-200"
                : report.status === "REJECTED"
                ? "border-red-200"
                : "border-gray-200"
            )}>
              <h2 className="text-xs uppercase tracking-widest font-semibold flex items-center gap-2 text-gray-700">
                {report.status === "RESOLVED" ? (
                  <><CheckCircle className="w-3.5 h-3.5 text-green-600" /> Resolution</>
                ) : (
                  <><XCircle className="w-3.5 h-3.5 text-red-600" /> Rejection Reason</>
                )}
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                {report.resolution || "No resolution details provided."}
              </p>
              {report.resolvedAt && (
                <p className="text-xs text-gray-500">
                  Resolved on {formatDate(report.resolvedAt)}
                </p>
              )}
            </div>
          )}

          {/* Satellite Imagery — only when report is tied to a project */}
          {report.projectId && (
            <div className="bg-white border border-gray-200 rounded-md p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
                  <Satellite className="w-3.5 h-3.5 text-cyan-600" />
                  Satellite Development Timeline
                </h2>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Weekly imagery · ESRI World Imagery
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Independent satellite-based development tracking for the project under report. Each weekly
                capture includes an automated development score, built-up area, vegetation cover, and
                construction status derived from change detection.
              </p>
              <SatelliteTimeline projectId={report.projectId} />
            </div>
          )}

          {/* Status Timeline */}
          {report.statusLogs && report.statusLogs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-md p-5 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Status History
              </h2>
              <div className="relative pl-4 space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                {report.statusLogs.map((log) => {
                  const style = getStatusStyle(log.toStatus);
                  return (
                    <div key={log.id} className="relative flex items-start gap-4 py-3">
                      {/* Dot */}
                      <div className={cn("absolute left-[3px] w-2.5 h-2.5 rounded-full border-2 border-white", style.dot)} />
                      <div className="ml-5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-xs font-semibold", style.text)}>
                            {style.label}
                          </span>
                          {log.fromStatus && (
                            <span className="text-[10px] text-gray-500">
                              from {LIGHT_STATUS_COLORS[log.fromStatus]?.label ?? log.fromStatus}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Quick facts */}
          <div className="bg-white border border-gray-200 rounded-md p-5 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
              Details
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <Tag className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Category</p>
                  <span className={cn("text-xs px-2 py-0.5 rounded-md", catClass)}>
                    {getCategoryLabel(report.category)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Severity</p>
                  <span className={cn("text-xs font-medium", sev.color)}>
                    {getSeverityLabel(report.severity)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Source</p>
                  <span className="text-xs text-gray-700">{report.source}</span>
                </div>
              </div>
              {report.project && (
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500">Related Project</p>
                    <button
                      onClick={() => navigate(`/projects/${report.project!.id}`)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {report.project.name}
                    </button>
                    <p className="text-[10px] text-gray-500">
                      {report.project.district}, {report.project.state}
                    </p>
                  </div>
                </div>
              )}
              {report.assignedTo && (
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500">Assigned to</p>
                    <p className="text-xs text-gray-900">{report.assignedTo.name}</p>
                    <p className="text-[10px] text-gray-500">{report.assignedTo.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reporter */}
          <div className="bg-white border border-gray-200 rounded-md p-5 space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
              Reporter
              {isRedacted && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-2.5 h-2.5" />
                  Confidential
                </span>
              )}
            </h2>
            {report.isAnonymous ? (
              <p className="text-xs text-gray-500 italic">Submitted anonymously</p>
            ) : isRedacted ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200">
                  <ShieldOff className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Reporter information is hidden to protect citizen identity.
                    {report.hasReporterContact
                      ? " Reporter provided contact details — withheld for privacy."
                      : " Only administrators can view this data."}
                  </p>
                </div>
                <p className="text-xs text-gray-500 font-mono">[REDACTED]</p>
                {canInvestigate && (
                  <button
                    onClick={() => setShowOriginalModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    View Original (Investigation Access)
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {report.reporterName && (
                  <p className="text-sm text-gray-900">{report.reporterName}</p>
                )}
                {report.reporterEmail && (
                  <p className="text-xs text-gray-600">{report.reporterEmail}</p>
                )}
                {report.reporterPhone && (
                  <p className="text-xs text-gray-600">{report.reporterPhone}</p>
                )}
              </div>
            )}
          </div>

          {/* Investigation Context Modal */}
          {showOriginalModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="investigation-modal-title"
            >
              <div className="bg-white border border-amber-200 rounded-md max-w-md w-full p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="investigation-modal-title" className="text-sm font-semibold text-gray-900">
                      Access Original Reporter Data
                    </h2>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      You are about to view the original (un-redacted) reporter information
                      for this report. This access will be permanently recorded in the
                      audit log with your identity and the investigation context you provide.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="investigation-context" className="text-xs text-gray-600 uppercase tracking-wider font-semibold">
                    Investigation Context <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="investigation-context"
                    value={investigationContext}
                    onChange={(e) => setInvestigationContext(e.target.value)}
                    rows={4}
                    placeholder="e.g. Following up on complaint ref CMP-2026-44 — need to contact reporter for additional evidence."
                    className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Minimum 10 characters. Required for audit trail.
                  </p>
                </div>

                {originalError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 border border-red-200" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
                    <p className="text-xs text-red-700">{originalError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowOriginalModal(false);
                      setInvestigationContext("");
                      setOriginalError(null);
                    }}
                    disabled={loadingOriginal}
                    className="flex-1 px-3 py-2 rounded-md bg-white border border-gray-200 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleViewOriginal}
                    disabled={loadingOriginal || investigationContext.trim().length < 10}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-amber-600 border border-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loadingOriginal ? "Accessing..." : "Access Original Data"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Original Data Panel (visible after investigation access) */}
          {originalData && (
            <div className="bg-white border-2 border-red-300 rounded-md p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xs uppercase tracking-widest text-red-700 font-semibold">
                      Original Reporter Data — Audit Logged
                    </h2>
                    <p className="text-[10px] text-red-600 mt-0.5">
                      This view is investigation-only. Access recorded against your account.
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeOriginalPanel}
                  className="text-[10px] text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                  aria-label="Close original data panel"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {originalData.reporterName && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Name</p>
                    <p className="text-sm text-gray-900 font-mono">{originalData.reporterName}</p>
                  </div>
                )}
                {originalData.reporterEmail && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-gray-900 font-mono">{originalData.reporterEmail}</p>
                  </div>
                )}
                {originalData.reporterPhone && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-gray-900 font-mono">{originalData.reporterPhone}</p>
                  </div>
                )}
                {originalData.ipAddress && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">IP Address</p>
                    <p className="text-sm text-gray-900 font-mono">{originalData.ipAddress}</p>
                  </div>
                )}
                {originalData.userAgent && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">User Agent</p>
                    <p className="text-xs text-gray-700 font-mono break-all">{originalData.userAgent}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {isOpen && availableTransitions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-md p-5 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                Actions
              </h2>

              {/* Transition form */}
              {transitionOpen ? (
                <div className="space-y-3">
                  {transitionError && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
                      <p className="text-xs text-red-700">{transitionError}</p>
                    </div>
                  )}

                  {/* Status select */}
                  <div className="space-y-1">
                    <p id="transition-status-label" className="text-xs text-gray-600 uppercase tracking-wider">
                      Move to
                    </p>
                    <div role="radiogroup" aria-labelledby="transition-status-label" className="space-y-1">
                      {availableTransitions.map((s) => {
                        const style = getStatusStyle(s);
                        const isSelected = selectedStatus === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setSelectedStatus(s)}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={style.label}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-all",
                              isSelected
                                ? `${style.bg} border-current`
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} aria-hidden="true" />
                            {style.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedStatus && (
                    <div className="space-y-1">
                      <label htmlFor="transition-notes" className="text-xs text-gray-600 uppercase tracking-wider">
                        Notes {selectedStatus === "RESOLVED" || selectedStatus === "REJECTED" ? "(required)" : "(optional)"}
                      </label>
                      <textarea
                        id="transition-notes"
                        value={transitionNotes}
                        onChange={(e) => setTransitionNotes(e.target.value)}
                        rows={3}
                        placeholder="Describe the action taken or reason..."
                        className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
                      />
                    </div>
                  )}

                  {/* Resolution (required for RESOLVED/REJECTED) */}
                  {(selectedStatus === "RESOLVED" || selectedStatus === "REJECTED") && (
                    <div className="space-y-1">
                      <label htmlFor="transition-resolution" className="text-xs text-gray-600 uppercase tracking-wider">
                        Resolution Summary <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        id="transition-resolution"
                        value={transitionResolution}
                        onChange={(e) => setTransitionResolution(e.target.value)}
                        rows={3}
                        placeholder={
                          selectedStatus === "RESOLVED"
                            ? "How was this issue resolved?"
                            : "Why is this report being rejected?"
                        }
                        className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
                      />
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTransitionOpen(false); setSelectedStatus(""); setTransitionNotes(""); setTransitionResolution(""); setTransitionError(null); }}
                      className="flex-1 px-3 py-2 rounded-md bg-white border border-gray-200 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransition}
                      disabled={
                        transitioning ||
                        !selectedStatus ||
                        ((selectedStatus === "RESOLVED" || selectedStatus === "REJECTED") && !transitionResolution.trim())
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 border border-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {transitioning ? "Updating..." : "Confirm"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setTransitionOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 border border-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  Update Status
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Attachment Card ───────────────────────────────────────────────────────────

function AttachmentCard({
  attachment,
  canDelete,
  deleting,
  onDelete,
}: {
  attachment: ReportAttachment;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isImage = attachment.mimeType.startsWith("image/");
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
  const fileUrl = `${apiBase}${attachment.url}`;

  const sizeLabel =
    attachment.size < 1024 * 1024
      ? `${(attachment.size / 1024).toFixed(1)} KB`
      : `${(attachment.size / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="group relative rounded-md border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-all">
      {/* Preview area */}
      <div className="h-28 flex items-center justify-center overflow-hidden bg-gray-100">
        {isImage ? (
          <img
            src={fileUrl}
            alt={attachment.originalName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <File className="w-10 h-10 text-gray-400" />
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-xs text-gray-700 truncate leading-tight" title={attachment.originalName}>
          {attachment.originalName}
        </p>
        <p className="text-[10px] text-gray-500">{sizeLabel}</p>
      </div>

      {/* Hover overlay actions */}
      <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <a
          href={fileUrl}
          download={attachment.originalName}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          aria-label={`Download ${attachment.originalName}`}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </a>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            aria-label={`Delete ${attachment.originalName}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
