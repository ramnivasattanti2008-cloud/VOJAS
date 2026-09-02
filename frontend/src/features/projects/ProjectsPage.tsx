/**
 * ProjectsPage — VOJAS 2.0 MPLAD Project Registry
 *
 * IBM Carbon–inspired light theme. Professional data-management layout.
 * No gradients, no glassmorphism, no glow effects, no decorative animations.
 * All data from real hooks (no fabricated numbers).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type Project,
  type ProjectStatus,
  type ProjectSector,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
} from "@/types";
import { useProjects, useProjectStats } from "@/hooks/useProjects";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  FileText,
  Search,
  Filter,
  X,
  MapPin,
  IndianRupee,
  Building2,
  ChevronRight,
  Inbox,
  Plus,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

const PAGE_SIZE = 12;

function fmtINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getSectorLabel(value: ProjectSector): string {
  return PROJECT_SECTORS.find((s) => s.value === value)?.label ?? value;
}

function getProgress(p: Project): number {
  if (p.approvedAmount <= 0) return 0;
  return Math.min(100, Math.round((p.spentAmount / p.approvedAmount) * 100));
}

function isOverdue(p: Project): boolean {
  if (!p.expectedEndDate) return false;
  if (p.status === "COMPLETED" || p.status === "VERIFIED" || p.status === "CANCELLED") return false;
  return new Date(p.expectedEndDate) < new Date();
}

// Status color tokens (Carbon: semantic, not decorative)
const STATUS_STYLE: Record<ProjectStatus, { label: string; text: string; bg: string }> = {
  PROPOSED:     { label: "Proposed",     text: "text-gray-600", bg: "bg-gray-100 text-gray-700" },
  APPROVED:     { label: "Approved",     text: "text-blue-700", bg: "bg-blue-50 text-blue-700" },
  IN_PROGRESS:  { label: "In Progress",  text: "text-amber-700", bg: "bg-amber-50 text-amber-700" },
  COMPLETED:    { label: "Completed",    text: "text-green-700", bg: "bg-green-50 text-green-700" },
  VERIFIED:     { label: "Verified",     text: "text-green-800", bg: "bg-green-100 text-green-800" },
  CANCELLED:    { label: "Cancelled",    text: "text-gray-500", bg: "bg-gray-100 text-gray-500" },
};

// Sector color tokens
const SECTOR_STYLE: Record<ProjectSector, string> = {
  PUBLIC_INFRASTRUCTURE: "bg-gray-100 text-gray-700",
  WATER_SANITATION:      "bg-cyan-50 text-cyan-700",
  EDUCATION:             "bg-blue-50 text-blue-700",
  HEALTH:                "bg-red-50 text-red-700",
  AGRICULTURE:           "bg-yellow-50 text-yellow-700",
  ENVIRONMENT:           "bg-green-50 text-green-700",
  TRANSPORT:             "bg-amber-50 text-amber-700",
  ENERGY:                "bg-orange-50 text-orange-700",
  HOUSING:               "bg-pink-50 text-pink-700",
  RURAL_DEVELOPMENT:     "bg-lime-50 text-lime-700",
  SOCIAL_WELFARE:        "bg-purple-50 text-purple-700",
  PUBLIC_ADMIN:          "bg-slate-50 text-slate-700",
  FINANCE_PROCUREMENT:   "bg-emerald-50 text-emerald-700",
  JUSTICE:               "bg-rose-50 text-rose-700",
  LEGISLATIVE:           "bg-indigo-50 text-indigo-700",
  PUBLIC_SAFETY:         "bg-red-50 text-red-700",
};

// Progress bar color
function progressColor(pct: number) {
  if (pct > 100) return "bg-red-500";
  if (pct >= 90) return "bg-green-500";
  if (pct >= 50) return "bg-blue-500";
  return "bg-amber-500";
}

// ── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  Icon,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  Icon: React.ElementType;
  accent?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const iconMap: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red:   "bg-red-50 text-red-600",
    slate: "bg-gray-100 text-gray-600",
  };
  const barMap: Record<string, string> = {
    blue:  "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red:   "bg-red-500",
    slate: "bg-gray-400",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 relative hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", barMap[accent])} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", iconMap[accent])}>
          {(() => {
            const TypedIcon = Icon as React.ComponentType<{ className?: string; "aria-hidden"?: boolean | string }>;
            return <TypedIcon aria-hidden="true" className="w-4 h-4" />;
          })()}
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      <p className="text-sm text-gray-700 font-medium mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section header (Carbon pattern) ─────────────────────────────────────────

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded bg-gray-100 text-[11px] font-medium text-gray-600 tabular-nums">
            {count.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      {action && (
        <a
          href={action.href}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
        >
          {action.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

// ── Project list table (primary view) ───────────────────────────────────────

function ProjectTableRow({ project }: { project: Project }) {
  const navigate = useNavigate();
  const status = STATUS_STYLE[project.status] ?? STATUS_STYLE.PROPOSED;
  const sectorClass = SECTOR_STYLE[project.sector] ?? "bg-gray-100 text-gray-600";
  const progress = getProgress(project);
  const overdue = isOverdue(project);

  return (
    <tr
      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => navigate(`/projects/${project.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/projects/${project.id}`); }}
      tabIndex={0}
      role="button"
      aria-label={`View project: ${project.name}`}
    >
      {/* Status badge */}
      <td className="py-3 pr-3 pl-4 align-top">
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded", status.bg)}>
          {status.label}
        </span>
      </td>

      {/* Name + description */}
      <td className="py-3 pr-4 align-top max-w-[280px]">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{project.name}</p>
        {project.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{project.description}</p>
        )}
      </td>

      {/* Sector */}
      <td className="py-3 pr-4 align-top">
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", sectorClass)}>
          {getSectorLabel(project.sector)}
        </span>
      </td>

      {/* Location */}
      <td className="py-3 pr-4 align-top">
        <div className="text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate max-w-[140px]">
              {project.district}{project.constituency ? `, ${project.constituency}` : ""}
            </span>
          </div>
          <p className="text-gray-400 truncate max-w-[140px]">{project.state}</p>
        </div>
      </td>

      {/* Contractor */}
      <td className="py-3 pr-4 align-top">
        {project.contractor ? (
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-700 truncate max-w-[120px]">{project.contractor}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Budget / progress */}
      <td className="py-3 pr-4 align-top">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">
              <span className="font-medium text-gray-900">{fmtINR(project.spentAmount)}</span>
              <span className="text-gray-400"> / {fmtINR(project.approvedAmount)}</span>
            </span>
            <span className={cn(
              "text-xs font-semibold tabular-nums",
              progress > 100 ? "text-red-600" : progress >= 90 ? "text-green-600" : progress >= 50 ? "text-blue-600" : "text-amber-600"
            )}>
              {Math.min(100, progress)}%
            </span>
          </div>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", progressColor(progress))}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      </td>

      {/* End date */}
      <td className="py-3 pr-4 align-top">
        {project.expectedEndDate ? (
          <div className="flex items-center gap-1">
            {overdue ? (
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            ) : (
              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
            )}
            <span className={cn("text-xs", overdue ? "text-red-600 font-medium" : "text-gray-600")}>
              {new Date(project.expectedEndDate).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Action */}
      <td className="py-3 pr-4 align-top">
        <div className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
          <span>View</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </td>
    </tr>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [sectorFilter, setSectorFilter] = useState<ProjectSector | "">("");
  const [page, setPage] = useState(1);

  const projectsQuery = useProjects({
    search: search || undefined,
    status: (statusFilter || undefined) as ProjectStatus | undefined,
    sector: (sectorFilter || undefined) as ProjectSector | undefined,
    page,
    limit: PAGE_SIZE,
  });
  const statsQuery = useProjectStats();

  const projects = projectsQuery.data?.items ?? [];
  const totalPages = projectsQuery.data?.totalPages ?? 1;
  const total = projectsQuery.data?.total ?? 0;
  const stats = statsQuery.data?.stats ?? null;
  const loading = projectsQuery.isLoading;
  const error = projectsQuery.error?.message ?? null;

  const hasActiveFilters = statusFilter || sectorFilter || search;

  const clearFilters = () => {
    setStatusFilter("");
    setSectorFilter("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // KPI totals
  const activeCount = stats ? Object.entries(stats.byStatus)
    .filter(([k]) => k === "IN_PROGRESS").reduce((s, [, v]) => s + (v as number), 0) : 0;
  const completedCount = stats ? Object.entries(stats.byStatus)
    .filter(([k]) => ["COMPLETED", "VERIFIED"].includes(k)).reduce((s, [, v]) => s + (v as number), 0) : 0;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight">MPLAD Projects</h1>
        <p className="text-sm text-gray-600 mt-1">
          {total > 0
            ? `${total.toLocaleString("en-IN")} project${total === 1 ? "" : "s"} registered across India · ${activeCount} in progress · ${completedCount} completed`
            : "Project registry · search and filter by status, sector, or location"}
        </p>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Projects"
          value={total}
          sub="registered"
          Icon={FileText}
          accent="blue"
        />
        <KpiCard
          label="In Progress"
          value={activeCount}
          sub="active execution"
          Icon={TrendingUp}
          accent="amber"
        />
        <KpiCard
          label="Completed"
          value={completedCount}
          sub="verified"
          Icon={CheckCircle2}
          accent="green"
        />
        <KpiCard
          label="Total Budget"
          value={stats ? fmtINR(stats.totalBudget) : "—"}
          sub={stats ? `${fmtINR(stats.totalSpent)} spent` : undefined}
          Icon={IndianRupee}
          accent="slate"
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}
            className="relative flex-1 min-w-[220px]"
            role="search"
            aria-label="Search projects"
          >
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="project-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, district, contractor…"
              className="w-full border border-gray-200 rounded px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              aria-label="Search projects by name, district, or contractor"
            />
          </form>

          {/* Status filter */}
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as ProjectStatus | ""); setPage(1); }}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
            aria-label="Filter by project status"
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Sector filter */}
          <select
            id="sector-filter"
            value={sectorFilter}
            onChange={(e) => { setSectorFilter(e.target.value as ProjectSector | ""); setPage(1); }}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
            aria-label="Filter by project sector"
          >
            <option value="">All sectors</option>
            {PROJECT_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}

          {/* New project */}
          <button
            onClick={() => navigate("/projects/new")}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Status quick-filter chips */}
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by status">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mr-1">Quick:</span>
          {PROJECT_STATUSES.map((s) => {
            const isActive = statusFilter === s.value;
            const count = stats?.byStatus[s.value] ?? 0;
            return (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(isActive ? "" : s.value); setPage(1); }}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border transition-colors",
                  isActive
                    ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {s.label}
                {stats && (
                  <span className={cn(
                    "text-[10px] font-mono tabular-nums",
                    isActive ? "text-blue-500" : "text-gray-400"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState message="Loading projects…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => projectsQuery.refetch()} />
      ) : projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md py-16">
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
            title="No projects found"
            description={hasActiveFilters
              ? "Try adjusting your filters or search."
              : "No MPLAD projects have been registered yet."}
            action={hasActiveFilters ? (
              <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Clear filters
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <>
          {/* Results header */}
          <SectionHeader
            title="Results"
            count={total}
            action={undefined}
          />

          {/* Project table */}
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left" aria-label="MPLAD projects">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["Status", "Project Name", "Sector", "Location", "Contractor", "Budget / Progress", "End Date", ""].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="py-2.5 pr-4 pl-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider first:pl-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((project) => (
                    <ProjectTableRow key={project.id} project={project} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-4 py-3">
              <span>
                Page <span className="font-medium text-gray-900">{page}</span> of {totalPages}
                <span className="text-gray-400 ml-1">· {total.toLocaleString("en-IN")} total</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="px-3 py-1.5 rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="px-3 py-1.5 rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
