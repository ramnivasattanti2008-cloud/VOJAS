import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../services/api";
import {
  type Project,
  type ProjectStatus,
  type ProjectSector,
  type PaginatedProjects,
  type ProjectStats,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  STATUS_COLORS,
  SECTOR_COLORS,
} from "../types";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
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
} from "lucide-react";

const PAGE_SIZE = 12;

// Compact utility — formats ₹ in Indian style
function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} L`;
  }
  if (amount >= 1_000) {
    return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

function getSectorLabel(value: ProjectSector): string {
  return PROJECT_SECTORS.find((s) => s.value === value)?.label ?? value;
}

function getStatusLabel(value: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

// Compute progress % (spent / approved) safely
function getProgress(p: Project): number {
  if (p.approvedAmount <= 0) return 0;
  return Math.min(100, Math.round((p.spentAmount / p.approvedAmount) * 100));
}

function isOverdue(p: Project): boolean {
  if (!p.expectedEndDate) return false;
  if (p.status === "COMPLETED" || p.status === "VERIFIED" || p.status === "CANCELLED") return false;
  return new Date(p.expectedEndDate) < new Date();
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [sectorFilter, setSectorFilter] = useState<ProjectSector | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (sectorFilter) params.set("sector", sectorFilter);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const [list, statsData] = await Promise.all([
        api.get<PaginatedProjects>(`/projects?${params.toString()}`),
        api.get<{ stats: ProjectStats }>(`/projects/stats`).catch(() => null),
      ]);

      setProjects(list.items);
      setTotalPages(list.totalPages);
      setTotal(list.total);
      if (statsData?.stats) setStats(statsData.stats);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, sectorFilter, search]);

  const hasActiveFilters = statusFilter || sectorFilter || search;

  const clearFilters = () => {
    setStatusFilter("");
    setSectorFilter("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-electric-400" />
            Projects
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            MPLAD Scheme project registry — {total} project{total === 1 ? "" : "s"}
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-xs text-slate-400 glass rounded-xl px-4 py-2">
            <IndianRupee className="w-3.5 h-3.5 text-saffron-400" />
            <span>
              <span className="text-white font-medium">{formatINR(stats.totalSpent)}</span>
              {" / "}
              <span className="text-slate-500">{formatINR(stats.totalBudget)}</span> budget used
            </span>
          </div>
        )}

        <button
          onClick={() => navigate("/projects/new")}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-600 hover:from-electric-400 hover:to-electric-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-electric-500/20 hover:shadow-electric-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filter bar */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="relative flex-1 min-w-[220px]"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, district, contractor..."
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
            />
          </form>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as ProjectStatus | ""); setPage(1); }}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Sector filter */}
          <select
            value={sectorFilter}
            onChange={(e) => { setSectorFilter(e.target.value as ProjectSector | ""); setPage(1); }}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
          >
            <option value="">All sectors</option>
            {PROJECT_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Status quick-filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Quick:</span>
          {PROJECT_STATUSES.map((s) => {
            const isActive = statusFilter === s.value;
            const count = stats?.byStatus[s.value] ?? 0;
            return (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(isActive ? "" : s.value); setPage(1); }}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                  isActive
                    ? "bg-electric-500/15 border-electric-500/30 text-electric-400"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[s.value].dot}`} />
                {s.label}
                {stats && (
                  <span className={`text-[10px] ${isActive ? "text-electric-300" : "text-slate-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading projects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProjects} />
      ) : projects.length === 0 ? (
        <div className="glass rounded-xl">
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
            title="No projects found"
            description={hasActiveFilters ? "Try adjusting your filters or search." : "No MPLAD projects have been registered yet."}
            action={hasActiveFilters ? (
              <button onClick={clearFilters} className="text-xs text-electric-400 hover:text-electric-300">
                Clear filters
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <>
          {/* Project grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const statusStyle = STATUS_COLORS[project.status];
              const sectorClass = SECTOR_COLORS[project.sector];
              const progress = getProgress(project);
              const overdue = isOverdue(project);
              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="glass rounded-xl p-5 hover:border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-electric-500/5 cursor-pointer group"
                >
                  {/* Top row: status + sector */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border border-white/5 ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {getStatusLabel(project.status)}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${sectorClass}`}>
                      {getSectorLabel(project.sector)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-electric-300 transition-colors line-clamp-2 leading-snug min-h-[2.5em]">
                    {project.name}
                  </h3>

                  {/* Description preview */}
                  {project.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {project.district}{project.constituency ? ` · ${project.constituency}` : ""} · {project.state}
                      </span>
                    </div>
                    {project.contractor && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{project.contractor}</span>
                      </div>
                    )}
                  </div>

                  {/* Budget + progress */}
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        <span className="font-medium text-white">{formatINR(project.spentAmount)}</span>
                        <span className="text-slate-500">/ {formatINR(project.approvedAmount)}</span>
                      </span>
                      <span className={`font-semibold ${progress >= 90 ? "text-green-400" : progress >= 50 ? "text-electric-400" : "text-saffron-400"}`}>
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-navy-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress >= 90 ? "bg-green-500" :
                          progress >= 50 ? "bg-electric-500" :
                          "bg-saffron-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Overdue warning */}
                  {overdue && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      Overdue · expected by {new Date(project.expectedEndDate!).toLocaleDateString("en-IN")}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
                    <span>ID: {project.id.slice(0, 8)}</span>
                    <span className="flex items-center gap-1 text-slate-500 group-hover:text-electric-400 transition-colors">
                      View details
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 glass rounded-xl px-4 py-3">
              <span>
                Page <span className="text-white font-medium">{page}</span> of {totalPages}
                <span className="text-slate-600"> · {total} total</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
