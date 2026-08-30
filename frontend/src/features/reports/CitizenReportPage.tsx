import { useState, useRef } from "react";
import { Shield, Send, AlertCircle, CheckCircle, Eye, EyeOff, Paperclip, Upload, X, Sparkles } from "lucide-react";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
} from "@/types/report-types";
import { reportApi } from "@/services/report-api";
import type { ReportCategory, ReportSeverity } from "@/types/report-types";

export default function CitizenReportPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "" as ReportCategory | "",
    severity: "MEDIUM" as ReportSeverity,
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    isAnonymous: false,
    locationDesc: "",
    projectId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    message: string;
    aiAnalysis?: {
      keywords: string[];
      corruptionIndicators: string[];
      sentiment: string;
      suggestedSeverity: string;
      confidence: number;
      summary: string;
    };
  } | null>(null);

  // Attachment upload (after submission)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 5) e.title = "Title must be at least 5 characters";
    if (form.title.trim().length > 255) e.title = "Title must be under 255 characters";
    if (form.description.trim().length < 20) e.description = "Description must be at least 20 characters";
    if (form.description.trim().length > 5000) e.description = "Description must be under 5000 characters";
    if (!form.category) e.category = "Please select a category";
    if (!form.isAnonymous) {
      if (!form.reporterName.trim() && !form.reporterEmail.trim()) {
        e.reporterName = "Enter your name or email (or submit anonymously)";
      }
      if (form.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail)) {
        e.reporterEmail = "Enter a valid email address";
      }
    }
    return e;
  }

  function set(key: keyof typeof form, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const payload: Parameters<typeof reportApi.submit>[0] = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category as ReportCategory,
        severity: form.severity,
        isAnonymous: form.isAnonymous,
        locationDesc: form.locationDesc.trim() || undefined,
        projectId: form.projectId.trim() || undefined,
      };
      if (!form.isAnonymous) {
        if (form.reporterName.trim()) payload.reporterName = form.reporterName.trim();
        if (form.reporterEmail.trim()) payload.reporterEmail = form.reporterEmail.trim();
        if (form.reporterPhone.trim()) payload.reporterPhone = form.reporterPhone.trim();
      }
      const result = await reportApi.submit(payload);
      setSuccess({
        id: result.report.id!,
        message: result.message,
        aiAnalysis: result.aiAnalysis,
      });
    } catch (err: any) {
      setServerError(
        err?.message || "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAttachmentUpload() {
    if (!selectedFile || !success) return;
    setUploadingFile(true);
    setUploadError(null);
    try {
      await reportApi.uploadAttachment(success.id, selectedFile);
      setUploadedAttachments((prev) => [...prev, selectedFile.name]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass rounded-2xl p-8 text-center space-y-4 border border-green-500/20">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Report Submitted</h2>
          <p className="text-sm text-slate-400">
            Your report <span className="text-white font-mono font-semibold">#{success.id.slice(0, 8).toUpperCase()}</span> has been received.
          </p>
          <p className="text-xs text-slate-500">
            {success.message}
          </p>
          <div className="pt-2">
            <p className="text-xs text-slate-500">
              Save your reference ID to track status. You can quote it when following up.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-navy-800/60 border border-white/5 font-mono text-sm text-electric-400 select-all">
              {success.id}
            </div>
          </div>

          {/* AI Analysis — Phase 11 */}
          {success.aiAnalysis && (
            <div className="pt-4 border-t border-white/5 text-left">
              <p className="text-[10px] uppercase tracking-widest text-saffron-400/70 font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                AI Analysis
                <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full border ${
                  success.aiAnalysis!.confidence >= 80
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : success.aiAnalysis!.confidence >= 60
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }`}>
                  {success.aiAnalysis!.confidence}% confidence
                </span>
              </p>

              <p className="text-xs text-slate-300 leading-relaxed mb-3 italic">
                {success.aiAnalysis!.summary}
              </p>

              {success.aiAnalysis!.corruptionIndicators.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-500 font-semibold mb-1">Corruption signals detected</p>
                  <div className="flex flex-wrap gap-1">
                    {success.aiAnalysis!.corruptionIndicators.slice(0, 5).map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {success.aiAnalysis!.keywords.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-500 font-semibold mb-1">Key topics</p>
                  <div className="flex flex-wrap gap-1">
                    {success.aiAnalysis!.keywords.slice(0, 6).map((k, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-600 mt-1">
                Severity indicator: <span className={success.aiAnalysis!.suggestedSeverity === "CRITICAL" || success.aiAnalysis!.suggestedSeverity === "HIGH" ? "text-red-400" : success.aiAnalysis!.suggestedSeverity === "MEDIUM" ? "text-amber-400" : "text-slate-400"}>{success.aiAnalysis!.suggestedSeverity}</span>
                {" "}· Sentiment: <span className="text-slate-400">{success.aiAnalysis!.sentiment}</span>
              </p>
            </div>
          )}

          {/* Optional: add evidence attachments */}
          {uploadedAttachments.length < 5 && (
            <div className="pt-4 border-t border-white/5 text-left">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" />
                Add evidence (optional, max 5 files)
              </p>

              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-navy-800/40 border border-white/5">
                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 truncate flex-1">{selectedFile.name}</span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-0.5 rounded text-slate-500 hover:text-red-400 transition-colors"
                    aria-label="Remove selected file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {uploadError && (
                <p className="text-[11px] text-red-400 mb-2">{uploadError}</p>
              )}

              {uploadedAttachments.length > 0 && (
                <ul className="text-[11px] text-green-400 space-y-0.5 mb-2">
                  {uploadedAttachments.map((n, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {n}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  aria-label="Select evidence file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:bg-white/10 transition-all"
                  aria-label="Choose evidence file"
                >
                  <Upload className="w-3 h-3" />
                  Choose file
                </button>
                <button
                  type="button"
                  onClick={handleAttachmentUpload}
                  disabled={!selectedFile || uploadingFile}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-electric-500/20 border border-electric-500/30 text-electric-400 text-[11px] font-semibold hover:bg-electric-500/30 disabled:opacity-50 transition-all"
                >
                  {uploadingFile ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setSuccess(null);
              setSelectedFile(null);
              setUploadedAttachments([]);
              setUploadError(null);
              setForm({ title: "", description: "", category: "", severity: "MEDIUM", reporterName: "", reporterEmail: "", reporterPhone: "", isAnonymous: false, locationDesc: "", projectId: "" });
            }}
            className="mt-2 text-xs text-electric-400 hover:text-electric-300 transition-colors"
          >
            Submit another report
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-xl bg-saffron-500/10 border border-saffron-500/20 flex items-center justify-center mx-auto mb-2">
          <Shield className="w-6 h-6 text-saffron-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Citizen Report</h1>
        <p className="text-sm text-slate-400">
          Submit a complaint or concern about an MPLAD project.
          Reports can be submitted anonymously.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="glass rounded-xl p-4 border border-saffron-500/10 bg-saffron-500/5">
        <p className="text-xs text-saffron-300/80 leading-relaxed">
          <strong className="text-saffron-300">Important:</strong> This platform is for reporting accountability concerns
          in MPLAD-funded projects. False or misleading reports may have legal consequences.
          All submissions are reviewed by authorized government officers.
          Your identity will be kept confidential if you choose to report anonymously.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div role="alert" className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{serverError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5" noValidate aria-label="Citizen report form">

        {/* Section: Report Details */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold border-b border-white/5 pb-2">
            Report Details
          </h3>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="report-title" className="text-xs text-slate-400 font-medium">
              Report Title <span className="text-red-400">*</span>
            </label>
            <input
              id="report-title"
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g., Road construction quality concerns"
              className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                errors.title
                  ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
              }`}
              maxLength={255}
              required
            />
            <div className="flex justify-between">
              {errors.title ? (
                <p className="text-xs text-red-400">{errors.title}</p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-slate-600">{form.title.length}/255</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="report-description" className="text-xs text-slate-400 font-medium">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="report-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the issue in detail. Include dates, locations, persons involved, and any evidence you have observed..."
              rows={5}
              className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all resize-none ${
                errors.description
                  ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
              }`}
              maxLength={5000}
              required
            />
            <div className="flex justify-between">
              {errors.description ? (
                <p className="text-xs text-red-400">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-slate-600">{form.description.length}/5000</span>
            </div>
          </div>

          {/* Category + Severity side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="report-category" className="text-xs text-slate-400 font-medium">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                id="report-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value as ReportCategory)}
                className={`w-full bg-navy-800/60 border rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 transition-all cursor-pointer ${
                  errors.category
                    ? "border-red-500/50"
                    : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                }`}
              >
                <option value="">Select category</option>
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-400">{errors.category}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-medium block mb-1.5">Severity</span>
              <div className="flex gap-1.5" role="group" aria-label="Report severity">
                {REPORT_SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("severity", s.value)}
                    className={`flex-1 text-[10px] px-2 py-2 rounded-md border transition-all font-medium ${
                      form.severity === s.value
                        ? `${s.bg} ${s.color} border-current/20`
                        : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label htmlFor="report-location" className="text-xs text-slate-400 font-medium">
              Location Description
            </label>
            <input
              id="report-location"
              type="text"
              value={form.locationDesc}
              onChange={(e) => set("locationDesc", e.target.value)}
              placeholder="e.g., Near Govt. High School, MG Road, Mysore, Karnataka"
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
            />
          </div>

          {/* Project ID (optional) */}
          <div className="space-y-1.5">
            <label htmlFor="report-project-id" className="text-xs text-slate-400 font-medium">
              Related Project ID
              <span className="text-slate-600 font-normal ml-1">(optional)</span>
            </label>
            <input
              id="report-project-id"
              type="text"
              value={form.projectId}
              onChange={(e) => set("projectId", e.target.value)}
              placeholder="e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 font-mono focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5" />

        {/* Section: Reporter Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
              Reporter Information
            </h3>
            <button
              type="button"
              onClick={() => set("isAnonymous", !form.isAnonymous)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-md border transition-all ${
                form.isAnonymous
                  ? "bg-slate-500/10 border-slate-500/20 text-slate-300"
                  : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
              }`}
              aria-pressed={form.isAnonymous}
              aria-label="Toggle anonymous mode"
            >
              {form.isAnonymous ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {form.isAnonymous ? "Anonymous Mode" : "Hide my identity"}
            </button>
          </div>

          {form.isAnonymous ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-500/5 border border-slate-500/10">
              <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
              <p className="text-xs text-slate-400">
                Your identity will be hidden. We will not collect your name, email, or phone number.
                You will not be able to track this report's status without a reference ID.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="reporter-name" className="text-xs text-slate-400 font-medium">
                  Your Name {!form.reporterName && !form.reporterEmail && <span className="text-red-400">*</span>}
                </label>
                <input
                  id="reporter-name"
                  type="text"
                  value={form.reporterName}
                  onChange={(e) => set("reporterName", e.target.value)}
                  placeholder="Ramesh Kumar"
                  className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reporter-email" className="text-xs text-slate-400 font-medium">
                  Email {!form.reporterName && !form.reporterEmail && <span className="text-red-400">*</span>}
                </label>
                <input
                  id="reporter-email"
                  type="email"
                  value={form.reporterEmail}
                  onChange={(e) => set("reporterEmail", e.target.value)}
                  placeholder="ramesh@example.com"
                  className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                    errors.reporterEmail
                      ? "border-red-500/50"
                      : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                  }`}
                />
                {errors.reporterEmail && (
                  <p className="text-xs text-red-400">{errors.reporterEmail}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <label htmlFor="reporter-phone" className="text-xs text-slate-400 font-medium">Phone</label>
                <input
                  id="reporter-phone"
                  type="tel"
                  value={form.reporterPhone}
                  onChange={(e) => set("reporterPhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
                />
              </div>
              {errors.reporterName && (
                <p className="col-span-2 text-xs text-red-400">{errors.reporterName}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="border-t border-white/5 pt-5">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-400 hover:to-saffron-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-saffron-500/20 hover:shadow-saffron-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting Report...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Report
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-600 text-center mt-2">
            By submitting, you confirm that the information provided is accurate to the best of your knowledge.
          </p>
        </div>
      </form>
    </div>
  );
}
