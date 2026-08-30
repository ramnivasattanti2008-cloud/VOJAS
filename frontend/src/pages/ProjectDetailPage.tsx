import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../services/api";
import {
  type Project,
  type ProjectStatus,
  type ProjectSector,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  STATUS_COLORS,
  SECTOR_COLORS,
} from "../types";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
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
  Clock,
  AlertTriangle,
  FolderOpen,
  TrendingUp,
  ChevronRight,
  ExternalLink,
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
type Tab = "overview" | "financial" | "timeline" | "documents";
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview",   label: "Overview",    icon: FileText },
  { key: "financial",   label: "Financial",    icon: IndianRupee },
  { key: "timeline",   label: "Timeline",    icon: Calendar },
  { key: "documents",  label: "Documents",   icon: FolderOpen },
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

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.get<{ project: Project }>(`/projects/${id}`)
      .then(({ project }) => setProject(project))
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState message="Loading project details..." />;
  if (error)   return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!project) return <ErrorState message="Project not found" />;

  const statusStyle = STATUS_COLORS[project.status];
  const sectorClass = SECTOR_COLORS[project.sector];
  const progress = getProgress(project);
  const remaining = Math.max(0, project.approvedAmount - project.spentAmount);
  const isOverdue =
    project.expectedEndDate &&
    !["COMPLETED", "VERIFIED", "CANCELLED"].includes(project.status) &&
    new Date(project.expectedEndDate) < new Date();

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Back button */}
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Projects
      </button>

      {/* Hero header */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        {/* Subtle top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/40 to-transparent" />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text}`}>
                <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                {getStatusLabel(project.status)}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${sectorClass}`}>
                {getSectorLabel(project.sector)}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Overdue
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-white leading-snug">{project.name}</h1>

            {/* Description */}
            {project.description && (
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{project.description}</p>
            )}
          </div>

          {/* Budget pill */}
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-bold text-white">{formatINR(project.approvedAmount)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Approved budget</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">
              <span className="text-white font-medium">{formatINR(project.spentAmount)}</span>
              <span className="text-slate-500"> spent of {formatINR(project.approvedAmount)}</span>
            </span>
            <span className={`font-bold ${
              progress >= 90 ? "text-green-400" :
              progress >= 50 ? "text-electric-400" :
              "text-saffron-400"
            }`}>
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-navy-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progress >= 90 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                progress >= 50 ? "bg-gradient-to-r from-electric-500 to-blue-400" :
                "bg-gradient-to-r from-saffron-500 to-amber-400"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>₹0</span>
            <span>{formatINR(remaining)} remaining</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === key
                ? "border-electric-500 text-electric-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {/* ── Overview ───────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-4">
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

            {/* Sidebar stats */}
            <div className="space-y-4">
              <div className="glass rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Quick Stats</h3>
                {[
                  { label: "Budget", value: formatINR(project.approvedAmount), color: "text-electric-400" },
                  { label: "Spent", value: formatINR(project.spentAmount), color: "text-saffron-400" },
                  { label: "Remaining", value: formatINR(remaining), color: "text-green-400" },
                  { label: "Utilization", value: `${progress}%`, color: progress >= 80 ? "text-green-400" : "text-electric-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="glass rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white">Risk Indicators</h3>
                {[
                  { label: "Over budget", value: project.spentAmount > project.approvedAmount, warn: true },
                  { label: "Behind schedule", value: isOverdue, warn: true },
                  { label: "No contractor assigned", value: !project.contractor && project.status !== "PROPOSED", warn: false },
                  { label: "No start date recorded", value: !project.startDate && project.status === "APPROVED", warn: false },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    {value ? (
                      <span className={`flex items-center gap-1.5 ${warn ? "text-red-400" : "text-saffron-400"}`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">External Links</h3>
                <div className="space-y-2">
                  {[
                    { label: "MPLADS Portal", url: "https://www.mplads.gov.in/" },
                    { label: "Bhuvan Satellite", url: "https://bhuvan.nrsc.gov.in/" },
                    { label: "CPPP GePNigam", url: "https://eprocure.gov.in/eprocure/app" },
                  ].map(({ label, url }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-electric-400 transition-colors group py-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Financial ────────────────────────────────────────────────────── */}
        {activeTab === "financial" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InfoCard title="Budget Breakdown">
              <div className="py-2 space-y-4">
                {/* Approved */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Approved Amount</span>
                    <span className="text-white font-bold">{formatINR(project.approvedAmount)}</span>
                  </div>
                  <div className="h-3 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-navy-700 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                {/* Spent */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Amount Spent</span>
                    <span className="text-saffron-400 font-bold">{formatINR(project.spentAmount)}</span>
                  </div>
                  <div className="h-3 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-saffron-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {/* Remaining */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Remaining</span>
                    <span className="text-green-400 font-bold">{formatINR(remaining)}</span>
                  </div>
                  <div className="h-3 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${100 - progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                {[
                  { label: "Approved", value: formatINR(project.approvedAmount), color: "text-electric-400" },
                  { label: "Spent", value: formatINR(project.spentAmount), color: "text-saffron-400" },
                  { label: "Remaining", value: formatINR(remaining), color: "text-green-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-base font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </InfoCard>

            <InfoCard title="Financial Health">
              <div className="py-2 space-y-3">
                {[
                  {
                    label: "Budget utilization",
                    value: `${progress}%`,
                    desc: progress >= 80 ? "Healthy utilization" : progress >= 50 ? "Moderate utilization" : "Low utilization",
                    color: progress >= 80 ? "text-green-400" : progress >= 50 ? "text-saffron-400" : "text-red-400",
                    barColor: progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-saffron-500" : "bg-red-500",
                  },
                  {
                    label: "Expenditure rate",
                    value: project.spentAmount > 0 ? `${(project.spentAmount / project.approvedAmount * 100).toFixed(1)}%` : "0%",
                    desc: project.spentAmount === 0 ? "No expenditure recorded" : `${formatINR(project.spentAmount)} disbursed`,
                    color: "text-electric-400",
                    barColor: "bg-electric-500",
                  },
                  {
                    label: "Funds remaining",
                    value: formatINR(remaining),
                    desc: remaining > 0 ? "Funds available for use" : "All funds utilized",
                    color: remaining > 0 ? "text-green-400" : "text-saffron-400",
                    barColor: remaining > 0 ? "bg-green-500" : "bg-saffron-500",
                  },
                ].map(({ label, value, desc, color, barColor }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{value}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mb-1">{desc}</p>
                    <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(100, parseFloat(value))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="max-w-2xl">
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

        {/* ── Documents ───────────────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="max-w-xl">
            <InfoCard title="Project Documents">
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <FolderOpen className="w-7 h-7 text-slate-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">No documents uploaded</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Project documents, sanction orders, and photographs will appear here once uploaded.
                </p>
                <p className="text-[10px] text-slate-700 mt-2">Phase 8 — Document Management</p>
              </div>
            </InfoCard>
          </div>
        )}
      </div>
    </div>
  );
}
