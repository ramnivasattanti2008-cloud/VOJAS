import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import {
  type Project,
  type ProjectStatus,
  type ProjectSector,
  type UserRole,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  STATUS_COLORS,
  SECTOR_COLORS,
} from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/hooks/useProjects";
import { useProjectLocations } from "@/hooks/useMap";
import { LoadingState, ErrorState } from "@/components/ui";
import FinancialTab from "./FinancialTab";
import ProjectRiskTab from "./ProjectRiskTab";
import SiteComparison from "./SiteComparison";
import SiteAnalysis from "./SiteAnalysis";
import DocumentsTab from "./DocumentsTab";
import {
  ArrowLeft,
  FileText,
  MapPin,
  Building2,
  IndianRupee,
  Calendar,
  User,
  Shield,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Edit3,
  Globe,
  Hash,
  Flag,
  ShieldAlert,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(3)} Cr`;
  if (amount >= 1_00_000)   return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000)       return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getSectorLabel(v: ProjectSector) {
  return PROJECT_SECTORS.find((s) => s.value === v)?.label ?? v;
}
function getStatusLabel(v: ProjectStatus) {
  return PROJECT_STATUSES.find((s) => s.value === v)?.label ?? v;
}
function getProgress(p: Project) {
  if (p.approvedAmount <= 0) return 0;
  return Math.min(100, Math.round((p.spentAmount / p.approvedAmount) * 100));
}

// Tab definitions
type Tab = "overview" | "site" | "risk" | "financial" | "timeline" | "location" | "documents";
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview",   label: "Overview",    icon: FileText },
  { key: "site",       label: "Site",        icon: ImageIcon },
  { key: "risk",       label: "Risk",        icon: ShieldAlert },
  { key: "financial",  label: "Financial",   icon: IndianRupee },
  { key: "timeline",   label: "Timeline",    icon: Calendar },
  { key: "location",   label: "Location",    icon: MapPin },
  { key: "documents",   label: "Documents",   icon: FolderOpen },
];

// ── Field Row ───────────────────────────────────────────────────────────────
function FieldRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-slate-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-slate-200 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

// ── Info Card ───────────────────────────────────────────────────────────────
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [exportingPDF, setExportingPDF] = useState(false);

  // React Query hooks
  const projectQuery = useProject(id);
  const projectLocationsQuery = useProjectLocations(
    (activeTab === "location" || activeTab === "site") ? id : undefined
  );

  const project = projectQuery.data?.project ?? null;
  const locations = projectLocationsQuery.data?.locations ?? [];
  const loading = projectQuery.isLoading;
  const error = projectQuery.error?.message ?? null;
  const locationsLoading = projectLocationsQuery.isLoading;

  const handleExportPDF = async () => {
    if (!id) return;
    setExportingPDF(true);
    try {
      const response = await fetch(`/api/v1/projects/${id}/report/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("vojas_token")}` },
      });
      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vojas-project-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) return <LoadingState message="Loading project details..." />;
  if (error)   return <ErrorState message={error} onRetry={() => projectQuery.refetch()} />;
  if (!project) return <ErrorState message="Project not found" />;

  const statusStyle = STATUS_COLORS[project.status];
  const sectorClass = SECTOR_COLORS[project.sector];
  const progress = getProgress(project);
  const remaining = Math.max(0, project.approvedAmount - project.spentAmount);
  const isOverdue =
    project.expectedEndDate &&
    !["COMPLETED", "VERIFIED", "CANCELLED"].includes(project.status) &&
    new Date(project.expectedEndDate) < new Date();
  const overBudget = project.spentAmount > project.approvedAmount;

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Back button */}
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors group"
        aria-label="Back to projects list"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>Projects</span>
      </button>

      {/* Hero header */}
      <div className="glass rounded-xl p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: title + badges */}
          <div className="flex-1 min-w-0">
            {/* Status + Sector + Overdue badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                {getStatusLabel(project.status)}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${sectorClass}`}>
                {getSectorLabel(project.sector)}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Overdue
                </span>
              )}
              {overBudget && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border bg-saffron-500/10 text-saffron-400 border-saffron-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  Over Budget
                </span>
              )}
            </div>

            {/* Title + location */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-white leading-snug">{project.name}</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {project.district}, {project.state}
                  {project.constituency ? ` · ${project.constituency}` : ""}
                </p>
              </div>

              {/* Inline quick stats */}
              <div className="flex items-center gap-3 shrink-0 text-right">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Budget</p>
                  <p className="text-sm font-bold text-electric-400">{formatINR(project.approvedAmount)}</p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Spent</p>
                  <p className={`text-sm font-bold ${overBudget ? "text-red-400" : "text-saffron-400"}`}>
                    {formatINR(project.spentAmount)}
                  </p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Util</p>
                  <p className={`text-sm font-bold ${progress > 100 ? "text-red-400" : progress > 80 ? "text-green-400" : "text-electric-400"}`}>
                    {progress}%
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/projects/${project.id}/edit`)}
                  className="flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-electric-500/30 text-slate-300 hover:text-white text-xs rounded-lg transition-all ml-1"
                  title="Edit project"
                  aria-label="Edit project"
                >
                  <Edit3 className="w-3 h-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-electric-500/30 text-slate-300 hover:text-white text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export PDF report"
                  aria-label="Export project as PDF report"
                >
                  {exportingPDF ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">{exportingPDF ? "Exporting..." : "Export PDF"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-400">
              <span className="text-slate-200 font-medium">{formatINR(project.spentAmount)}</span>
              <span className="text-slate-600"> / {formatINR(project.approvedAmount)}</span>
            </span>
            <span className={`font-mono font-bold ${progress > 100 ? "text-red-400" : progress > 80 ? "text-green-400" : "text-electric-400"}`}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progress > 100 ? "bg-red-500" : progress > 80 ? "bg-green-500" : progress > 50 ? "bg-electric-500" : "bg-saffron-500"}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-700 mt-0.5">
            <span>₹0</span>
            <span className={overBudget ? "text-red-400/60" : "text-slate-600"}>
              {overBudget ? `+${formatINR(project.spentAmount - project.approvedAmount)} over` : `${formatINR(remaining)} remaining`}
            </span>
          </div>
        </div>
      </div>

      {/* Tab navigation — sticky */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-5 px-4 md:px-5 bg-navy-950/80 backdrop-blur-xl border-b border-white/5">
        <div role="tablist" aria-label="Project details sections" className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              tabIndex={activeTab === key ? 0 : -1}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all shrink-0 ${
                activeTab === key
                  ? "border-electric-500 text-electric-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {/* ── Overview ───────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-3">
              <InfoCard title="Project Information">
                <FieldRow label="Project Name" value={project.name} icon={FileText} />
                <FieldRow label="Sector" value={getSectorLabel(project.sector)} icon={TrendingUp} />
                <FieldRow label="Status" value={getStatusLabel(project.status)} icon={Shield} />
                <FieldRow label="Description" value={project.description ?? undefined} />
                {project.contractor && (
                  <FieldRow label="Contractor" value={project.contractor} icon={Building2} />
                )}
              </InfoCard>

              <InfoCard title="Location">
                <FieldRow label="State" value={project.state} icon={MapPin} />
                <FieldRow label="District" value={project.district} icon={MapPin} />
                <FieldRow label="Constituency" value={project.constituency ?? undefined} />
              </InfoCard>

              <InfoCard title="Record">
                <FieldRow label="Project ID" value={project.id} />
                <FieldRow label="Created" value={fmtDate(project.createdAt)} icon={Calendar} />
                <FieldRow label="Last Updated" value={fmtDate(project.updatedAt)} icon={Clock} />
                {project.createdBy && (
                  <FieldRow
                    label="Created By"
                    value={`${project.createdBy.name} (${project.createdBy.email})`}
                    icon={User}
                  />
                )}
              </InfoCard>
            </div>

            {/* Sidebar stats — denser */}
            <div className="space-y-3">
              {/* Risk Indicators */}
              <div className="glass rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-electric-400" />
                  Risk Indicators
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Over budget",          value: overBudget,   warn: true  },
                    { label: "Behind schedule",      value: isOverdue,    warn: true  },
                    { label: "No contractor",        value: !project.contractor && project.status !== "PROPOSED", warn: false },
                    { label: "No start date",        value: !project.startDate && project.status === "APPROVED",    warn: false },
                  ].map(({ label, value, warn }) => (
                    <div key={label} className="flex items-center justify-between text-[11px]">
                      <span className={value ? (warn ? "text-red-400" : "text-saffron-400") : "text-slate-600"}>
                        {label}
                      </span>
                      {value ? (
                        <AlertTriangle className={`w-3 h-3 ${warn ? "text-red-400" : "text-saffron-400"}`} />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-slate-700" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* External Links */}
              <div className="glass rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white mb-2.5">External Links</h3>
                <div className="space-y-1">
                  {[
                    { label: "MPLADS Portal",   url: "https://www.mplads.gov.in/" },
                    { label: "Bhuvan Satellite", url: "https://bhuvan.nrsc.gov.in/" },
                    { label: "CPPP GeM",         url: "https://eprocure.gov.in/eprocure/app" },
                  ].map(({ label, url }) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-electric-400 transition-colors group py-1">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Risk (Phase 10) ─────────────────────────────────────────────── */}
        {activeTab === "risk" && (
          <div id="panel-risk" role="tabpanel" aria-labelledby="tab-risk">
            <ProjectRiskTab projectId={project.id} />
          </div>
        )}

        {/* ── Site (satellite before/after comparison) ───────────────────── */}
        {activeTab === "site" && (
          <div id="panel-site" role="tabpanel" aria-labelledby="tab-site" className="space-y-3">
            {locationsLoading ? (
              <LoadingState message="Loading project location..." />
            ) : (() => {
                const primary = locations.find((l) => l.isPrimary) ?? locations[0];
                if (!primary) {
                  return (
                    <div className="max-w-xl">
                      <InfoCard title="Site Comparison">
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                            <ImageIcon className="w-7 h-7 text-slate-500" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-1">No primary location found</h3>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Add a primary site location to view before/after satellite imagery of the project area.
                          </p>
                          <button
                            onClick={() => setActiveTab("location")}
                            className="mt-4 text-[11px] text-electric-400 hover:text-electric-300 transition-colors"
                          >
                            → Go to Location tab
                          </button>
                        </div>
                      </InfoCard>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                      <div className="glass rounded-xl p-4">
                        <SiteComparison
                          location={{
                            latitude: primary.latitude,
                            longitude: primary.longitude,
                            label: primary.label ?? "Primary Site",
                          }}
                        />
                      </div>
                      <div className="space-y-3">
                        <InfoCard title="Primary Site">
                          <div className="space-y-1">
                            <FieldRow label="Label" value={primary.label ?? undefined} icon={MapPin} />
                            <FieldRow label="Address" value={primary.address ?? undefined} icon={Building2} />
                            <FieldRow label="Landmark" value={primary.landmark ?? undefined} icon={Flag} />
                            <FieldRow
                              label="Coordinates"
                              value={`${primary.latitude.toFixed(5)}, ${primary.longitude.toFixed(5)}`}
                              icon={Hash}
                            />
                            <div className="py-3 border-b border-white/5 last:border-0">
                              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">Status</p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-200">
                                {primary.verified ? (
                                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="text-saffron-400 font-medium">Unverified</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </InfoCard>
                      </div>
                    </div>
                    {/* Phase 12: Site change analysis */}
                    <div className="glass rounded-xl p-4">
                      <SiteAnalysis
                        location={{
                          latitude: primary.latitude,
                          longitude: primary.longitude,
                          label: primary.label ?? "Primary Site",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
          </div>
        )}

        {/* ── Financial ────────────────────────────────────────────────────── */}
        {activeTab === "financial" && (
          <div id="panel-financial" role="tabpanel" aria-labelledby="tab-financial">
            <FinancialTab
              project={project}
              userRole={(user?.role as UserRole) ?? "VIEWER"}
              onProjectUpdate={() => projectQuery.refetch()}
            />
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div id="panel-timeline" role="tabpanel" aria-labelledby="tab-timeline" className="max-w-2xl">
            <InfoCard title="Project Timeline">
              <div className="py-4">
                <div className="relative pl-6 space-y-0">
                  {/* Vertical line */}
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />

                  {[
                    {
                      icon: FileText,
                      label: "Project Registered",
                      date: fmtDate(project.createdAt),
                      desc: project.createdBy ? `Created by ${project.createdBy.name}` : undefined,
                      done: true,
                      color: "text-electric-400",
                    },
                    {
                      icon: CheckCircle,
                      label: "Project Approved",
                      date: project.status !== "PROPOSED" ? fmtDate(project.createdAt) : null,
                      desc: "Funds sanctioned for execution",
                      done: !["PROPOSED"].includes(project.status),
                      color: "text-green-400",
                    },
                    {
                      icon: Clock,
                      label: "Work Started",
                      date: project.startDate ? fmtDate(project.startDate) : null,
                      desc: project.startDate ? "Physical work commenced" : "Start date not recorded",
                      done: !!project.startDate,
                      color: "text-saffron-400",
                    },
                    {
                      icon: TrendingUp,
                      label: "Work In Progress",
                      date: ["IN_PROGRESS"].includes(project.status) ? fmtDate(project.startDate) : null,
                      desc: "Active implementation phase",
                      done: project.status === "IN_PROGRESS",
                      color: "text-blue-400",
                    },
                    {
                      icon: Calendar,
                      label: "Expected Completion",
                      date: project.expectedEndDate ? fmtDate(project.expectedEndDate) : null,
                      desc: project.expectedEndDate ? `Deadline: ${fmtDate(project.expectedEndDate)}` : "No deadline set",
                      done: false,
                      overdue: isOverdue,
                      color: "text-slate-400",
                    },
                    {
                      icon: CheckCircle,
                      label: "Work Completed",
                      date: project.completedAt ? fmtDate(project.completedAt) : null,
                      desc: project.completedAt ? "Physical work verified" : "Completion not recorded",
                      done: !!project.completedAt,
                      color: "text-green-400",
                    },
                    {
                      icon: Shield,
                      label: "Project Verified",
                      date: project.status === "VERIFIED" ? fmtDate(project.completedAt) : null,
                      desc: project.status === "VERIFIED" ? "Official verification complete" : "Pending verification",
                      done: project.status === "VERIFIED",
                      color: "text-emerald-400",
                    },
                  ].map(({ icon: Icon, label, date, desc, done, overdue, color }, i) => (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Dot on timeline */}
                      <div className={`absolute left-[-18px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        overdue ? "bg-red-500 border-red-400" :
                        done ? "bg-navy-900 border-electric-400" :
                        "bg-navy-900 border-slate-600"
                      }`}>
                        {done && !overdue && <Icon className="w-2 h-2 text-electric-400" />}
                        {overdue && <AlertTriangle className="w-2 h-2 text-red-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${overdue ? "text-red-400" : done ? color : "text-slate-500"}`}>
                            {label}
                          </span>
                          {overdue && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        {date && <p className="text-xs text-slate-500 mt-0.5">{date}</p>}
                        {desc && <p className="text-xs text-slate-600 mt-0.5">{desc}</p>}
                      </div>

                      {date && (
                        <span className={`text-xs shrink-0 mt-0.5 ${overdue ? "text-red-400" : "text-slate-600"}`}>
                          {date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </InfoCard>
          </div>
        )}

        {/* ── Location ────────────────────────────────────────────────────── */}
        {activeTab === "location" && (
          <div id="panel-location" role="tabpanel" aria-labelledby="tab-location" className="space-y-4">
            {locationsLoading ? (
              <LoadingState message="Loading locations..." />
            ) : locations.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <InfoCard title="Geographic Location">
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <Globe className="w-7 h-7 text-slate-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-1">No location registered</h3>
                      <p className="text-xs text-slate-500 max-w-sm">
                        This project doesn't have a geographic location on the map yet.
                      </p>
                      <p className="text-[10px] text-slate-700 mt-3">
                        District: {project.district}, {project.state}
                      </p>
                    </div>
                  </InfoCard>
                </div>
                <InfoCard title="Location Details">
                  <div className="space-y-1">
                    <FieldRow label="State" value={project.state} icon={MapPin} />
                    <FieldRow label="District" value={project.district} icon={MapPin} />
                    {project.constituency && (
                      <FieldRow label="Constituency" value={project.constituency} icon={Flag} />
                    )}
                  </div>
                </InfoCard>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Map */}
                <div className="lg:col-span-2">
                  <InfoCard title={`Site Locations (${locations.length})`}>
                    <div
                      className="rounded-lg overflow-hidden border border-white/10 -mx-2"
                      style={{ height: 460 }}
                    >
                      <MapContainer
                        center={[locations[0].latitude, locations[0].longitude]}
                        zoom={locations.length === 1 ? 14 : 12}
                        scrollWheelZoom
                        zoomControl={false}
                        style={{ height: "100%", width: "100%", background: "#0b1220" }}
                        aria-label="Project site locations map"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ZoomControl position="bottomright" />
                        {locations.map((loc) => (
                          <Marker
                            key={loc.id}
                            position={[loc.latitude, loc.longitude]}
                            icon={L.divIcon({
                              className: "vojas-marker",
                              html: `<div class="vojas-marker-pin ${
                                loc.isPrimary ? "vojas-marker-primary" : "vojas-marker-secondary"
                              }">${loc.isPrimary ? "★" : ""}</div>`,
                              iconSize: [28, 28],
                              iconAnchor: [14, 28],
                            })}
                          >
                            <Popup>
                              <div className="text-xs space-y-1.5 min-w-[180px]">
                                <p className="font-semibold text-slate-900 text-sm">
                                  {loc.label ?? "Project Site"}
                                </p>
                                {loc.isPrimary && (
                                  <p className="text-electric-700 font-semibold uppercase tracking-wider text-[10px]">
                                    ★ Primary Site
                                  </p>
                                )}
                                {loc.address && (
                                  <p className="text-slate-700">{loc.address}</p>
                                )}
                                {loc.landmark && (
                                  <p className="text-slate-600 italic">Near: {loc.landmark}</p>
                                )}
                                <p className="text-slate-500 text-[10px] pt-1 border-t border-slate-200 mt-1">
                                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                                </p>
                                <div className="flex items-center gap-1.5 pt-1">
                                  {loc.verified ? (
                                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                      <span>✓</span> Verified
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Unverified</span>
                                  )}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </InfoCard>
                </div>

                {/* Locations list + project geo summary */}
                <div className="space-y-4">
                  <InfoCard title="Location Details">
                    <div className="space-y-1">
                      <FieldRow label="State" value={project.state} icon={MapPin} />
                      <FieldRow label="District" value={project.district} icon={MapPin} />
                      {project.constituency && (
                        <FieldRow label="Constituency" value={project.constituency} icon={Flag} />
                      )}
                    </div>
                  </InfoCard>

                  <InfoCard title={`Sites (${locations.length})`}>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {locations.map((loc) => (
                        <div
                          key={loc.id}
                          className={`p-2.5 rounded-lg border ${
                            loc.isPrimary
                              ? "bg-electric-500/10 border-electric-500/30"
                              : "bg-navy-800/40 border-white/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                              {loc.isPrimary && <span className="text-electric-400">★</span>}
                              {loc.label ?? "Unnamed Site"}
                            </p>
                            {loc.verified ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                                Unverified
                              </span>
                            )}
                          </div>
                          {loc.address && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {loc.address}
                            </p>
                          )}
                          {loc.landmark && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">
                              Near: {loc.landmark}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500 font-mono">
                            <Hash className="w-2.5 h-2.5" />
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </InfoCard>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Documents ────────────────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <DocumentsTab projectId={project.id} userRole={user?.role as UserRole | undefined} />
        )}
      </div>
    </div>
  );
}
