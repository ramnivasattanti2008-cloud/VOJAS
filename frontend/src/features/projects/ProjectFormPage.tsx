import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/services/api";
import {
  type Project,
  type ProjectStatus,
  type ProjectSector,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
} from "@/types";
import { LoadingState, ErrorState } from "@/components/ui";
import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  FileText,
  IndianRupee,
  MapPin,
  Calendar,
  Building2,
  Trash2,
} from "lucide-react";

interface FormData {
  name: string;
  description: string;
  status: ProjectStatus;
  sector: ProjectSector;
  district: string;
  constituency: string;
  state: string;
  approvedAmount: string;
  spentAmount: string;
  contractor: string;
  startDate: string;
  expectedEndDate: string;
}

const EMPTY: FormData = {
  name: "",
  description: "",
  status: "PROPOSED",
  sector: "PUBLIC_INFRASTRUCTURE",
  district: "",
  constituency: "",
  state: "",
  approvedAmount: "",
  spentAmount: "0",
  contractor: "",
  startDate: "",
  expectedEndDate: "",
};

export default function ProjectFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(EMPTY);
  const [original, setOriginal] = useState<Project | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // For edit mode: load project
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.get<{ project: Project }>(`/projects/${id}`)
      .then(({ project }) => {
        setOriginal(project);
        setForm({
          name: project.name,
          description: project.description ?? "",
          status: project.status,
          sector: project.sector,
          district: project.district,
          constituency: project.constituency ?? "",
          state: project.state,
          approvedAmount: String(project.approvedAmount),
          spentAmount: String(project.spentAmount),
          contractor: project.contractor ?? "",
          startDate: project.startDate ? project.startDate.split("T")[0] : "",
          expectedEndDate: project.expectedEndDate ? project.expectedEndDate.split("T")[0] : "",
        });
      })
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setValidationErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = "Project name is required";
    else if (form.name.length > 255) errors.name = "Max 255 characters";

    if (!form.district.trim()) errors.district = "District is required";
    if (!form.state.trim()) errors.state = "State is required";

    const approved = parseFloat(form.approvedAmount);
    if (!form.approvedAmount) errors.approvedAmount = "Approved amount is required";
    else if (isNaN(approved) || approved <= 0) errors.approvedAmount = "Must be a positive number";

    const spent = parseFloat(form.spentAmount || "0");
    if (isNaN(spent) || spent < 0) errors.spentAmount = "Must be a non-negative number";
    else if (!isNaN(approved) && spent > approved) errors.spentAmount = "Spent cannot exceed approved";

    if (form.startDate && form.expectedEndDate && form.startDate > form.expectedEndDate) {
      errors.expectedEndDate = "End date must be after start date";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      sector: form.sector,
      district: form.district.trim(),
      constituency: form.constituency.trim() || undefined,
      state: form.state.trim(),
      approvedAmount: parseFloat(form.approvedAmount),
      spentAmount: parseFloat(form.spentAmount || "0"),
      contractor: form.contractor.trim() || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      expectedEndDate: form.expectedEndDate ? new Date(form.expectedEndDate).toISOString() : undefined,
    };

    try {
      if (isEdit) {
        const { project } = await api.put<{ project: Project }>(`/projects/${id}`, payload);
        navigate(`/projects/${project.id}`);
      } else {
        const { project } = await api.post<{ project: Project }>(`/projects`, payload);
        navigate(`/projects/${project.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details) {
          // Zod issues come as { path, message }
          const fieldErrors: Record<string, string> = {};
          if (Array.isArray(err.details)) {
            for (const issue of err.details) {
              const path = issue.path?.[0];
              if (path) fieldErrors[path] = issue.message;
            }
          }
          if (Object.keys(fieldErrors).length) setValidationErrors(fieldErrors);
        }
      } else {
        setError("Failed to save project");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm(`Delete project "${original?.name}"?\n\nThis action cannot be undone.`)) return;

    setSaving(true);
    try {
      await api.delete(`/projects/${id}`);
      navigate("/projects");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to delete project");
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading project..." />;
  if (error && !form.name) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* Back button */}
      <button
        onClick={() => (isEdit ? navigate(`/projects/${id}`) : navigate("/projects"))}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isEdit ? "Back to project" : "Back to projects"}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-electric-400" />
            {isEdit ? "Edit Project" : "New Project"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isEdit ? "Update the project details below" : "Register a new MPLAD Scheme project"}
          </p>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg border border-white/10 hover:border-red-500/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {/* Server error */}
      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-300" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" aria-label={isEdit ? "Edit project form" : "New project form"}>
        {/* ── Basic info ────────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-electric-400" />
            Basic Information
          </h2>

          <div>
            <label htmlFor="project-name" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Rural Road Construction — Vellanad GP"
              className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                validationErrors.name
                  ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                  : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
              }`}
            />
            {validationErrors.name && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="project-description" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
              Description
            </label>
            <textarea
              id="project-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Brief description of the project, scope, expected outcomes..."
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-status" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Status <span className="text-red-400">*</span>
              </label>
              <select
                id="project-status"
                value={form.status}
                onChange={(e) => update("status", e.target.value as ProjectStatus)}
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="project-sector" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Sector <span className="text-red-400">*</span>
              </label>
              <select
                id="project-sector"
                value={form.sector}
                onChange={(e) => update("sector", e.target.value as ProjectSector)}
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
              >
                {PROJECT_SECTORS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Location ─────────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-electric-400" />
            Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="project-state" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                State <span className="text-red-400">*</span>
              </label>
              <input
                id="project-state"
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="e.g. Kerala"
                className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                  validationErrors.state
                    ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                }`}
              />
              {validationErrors.state && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.state}</p>
              )}
            </div>

            <div>
              <label htmlFor="project-district" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                District <span className="text-red-400">*</span>
              </label>
              <input
                id="project-district"
                type="text"
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                placeholder="e.g. Thiruvananthapuram"
                className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                  validationErrors.district
                    ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                }`}
              />
              {validationErrors.district && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.district}</p>
              )}
            </div>

            <div>
              <label htmlFor="project-constituency" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Constituency
              </label>
              <input
                id="project-constituency"
                type="text"
                value={form.constituency}
                onChange={(e) => update("constituency", e.target.value)}
                placeholder="e.g. Vellanad"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Financial ────────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-electric-400" />
            Financial
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-approved-amount" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Approved Amount (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="project-approved-amount"
                  type="number"
                  value={form.approvedAmount}
                  onChange={(e) => update("approvedAmount", e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className={`w-full bg-navy-800/60 border rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                    validationErrors.approvedAmount
                      ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                      : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                  }`}
                />
              </div>
              {validationErrors.approvedAmount && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.approvedAmount}</p>
              )}
            </div>

            <div>
              <label htmlFor="project-spent-amount" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Amount Spent (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="project-spent-amount"
                  type="number"
                  value={form.spentAmount}
                  onChange={(e) => update("spentAmount", e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className={`w-full bg-navy-800/60 border rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                    validationErrors.spentAmount
                      ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                      : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                  }`}
                />
              </div>
              {validationErrors.spentAmount && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.spentAmount}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="project-contractor" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
              Contractor
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                id="project-contractor"
                type="text"
                value={form.contractor}
                onChange={(e) => update("contractor", e.target.value)}
                placeholder="e.g. Highway Tech Constructions Pvt Ltd"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-electric-400" />
            Timeline
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-start-date" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Start Date
              </label>
              <input
                id="project-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="project-end-date" className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-medium">
                Expected End Date
              </label>
              <input
                id="project-end-date"
                type="date"
                value={form.expectedEndDate}
                onChange={(e) => update("expectedEndDate", e.target.value)}
                className={`w-full bg-navy-800/60 border rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 transition-all cursor-pointer ${
                  validationErrors.expectedEndDate
                    ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-white/10 focus:border-electric-500/50 focus:ring-electric-500/20"
                }`}
              />
              {validationErrors.expectedEndDate && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.expectedEndDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer actions ────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 glass rounded-xl px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => (isEdit ? navigate(`/projects/${id}`) : navigate("/projects"))}
            disabled={saving}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-electric-500 to-electric-600 hover:from-electric-400 hover:to-electric-500 disabled:from-electric-500/50 disabled:to-electric-600/50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-electric-500/20 hover:shadow-electric-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? "Save Changes" : "Create Project"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
