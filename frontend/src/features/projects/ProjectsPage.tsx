import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  type Project,
  type ProjectStatus,
  type ProjectSector,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  STATUS_COLORS,
  SECTOR_COLORS,
} from "@/types";
import { useProjects, useProjectStats } from "@/hooks/useProjects";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import { fadeUp, staggerContainer, EASE } from "@/components/ui/Animations";
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
  BarChart3,
} from "lucide-react";

const PAGE_SIZE = 12;

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

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Projects"
          gradientWord="Projects"
          accent="electric"
          icon={FileText}
          subtitle={`MPLAD Scheme project registry · ${total} project${total === 1 ? "" : "s"} · ${stats ? formatINR(stats.totalSpent) : "—"} deployed`}
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Projects" },
          ]}
          actions={
            stats ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 glass rounded-xl px-4 py-2 ring-1 ring-white/5">
                <IndianRupee className="w-3.5 h-3.5 text-saffron-400" />
                <span>
                  <span className="text-white font-medium">{formatINR(stats.totalSpent)}</span>
                  {" / "}
                  <span className="text-slate-500">{formatINR(stats.totalBudget)}</span>
                </span>
                <span className="text-slate-600 ml-1">budget used</span>
              </div>
            ) : undefined
          }
        />
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={fadeUp} className="glass rounded-xl p-4 space-y-3 top-accent top-accent-electric">
        <div className="flex items-center gap-3 flex-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="relative flex-1 min-w-[220px]"
            role="search"
            aria-label="Search projects"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
            <input
              id="project-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, district, contractor..."
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
              aria-label="Search projects by name, district, or contractor"
            />
          </form>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as ProjectStatus | ""); setPage(1); }}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
            aria-label="Filter by project status"
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            id="sector-filter"
            value={sectorFilter}
            onChange={(e) => { setSectorFilter(e.target.value as ProjectSector | ""); setPage(1); }}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
            aria-label="Filter by project sector"
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

          <button
            onClick={() => navigate("/projects/new")}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-navy-900 text-sm font-bold rounded-lg shadow-lg shadow-electric-500/30 hover:shadow-electric-500/50 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Status quick-filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by status">
          <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1 font-semibold">Quick:</span>
          {PROJECT_STATUSES.map((s) => {
            const isActive = statusFilter === s.value;
            const count = stats?.byStatus[s.value] ?? 0;
            return (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(isActive ? "" : s.value); setPage(1); }}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                  isActive
                    ? "bg-electric-500/15 border-electric-500/30 text-electric-400 shadow-sm shadow-electric-500/20"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[s.value].dot}`} />
                {s.label}
                {stats && (
                  <span className={`text-[10px] font-mono ${isActive ? "text-electric-300" : "text-slate-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading projects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => projectsQuery.refetch()} />
      ) : projects.length === 0 ? (
        <motion.div variants={fadeUp} className="glass rounded-xl">
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
        </motion.div>
      ) : (
        <>
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-between"
          >
            <SectionTitle
              icon={BarChart3}
              title="Results"
              badge={total}
              badgeVariant="electric"
            />
            <span className="text-[10px] text-slate-600 font-mono">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
          </motion.div>

          {/* Project grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            variants={staggerContainer}
          >
            {projects.map((project, i) => {
              const statusStyle = STATUS_COLORS[project.status];
              const sectorClass = SECTOR_COLORS[project.sector];
              const progress = getProgress(project);
              const overdue = isOverdue(project);
              return (
                <motion.div
                  key={project.id}
                  variants={fadeUp}
                  custom={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/projects/${project.id}`);
                    }
                  }}
                  className="glass rounded-xl p-5 hover:border-white/10 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-electric-500/10 cursor-pointer group relative overflow-hidden"
                  aria-label={`View project: ${project.name}`}
                >
                  {/* Top accent line that fills in */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 origin-left transition-transform duration-700 scale-x-0 group-hover:scale-x-100 ${progress >= 90 ? "bg-gradient-to-r from-green-500 to-green-400" : progress >= 50 ? "bg-gradient-to-r from-electric-500 to-electric-400" : "bg-gradient-to-r from-saffron-500 to-saffron-400"}`}
                  />

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
                      <span className={`font-bold tabular-nums ${progress >= 90 ? "text-green-400" : progress >= 50 ? "text-electric-400" : "text-saffron-400"}`}>
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-navy-800/80 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          progress >= 90 ? "bg-gradient-to-r from-green-600 to-green-400" :
                          progress >= 50 ? "bg-gradient-to-r from-electric-600 to-electric-400" :
                          "bg-gradient-to-r from-saffron-600 to-saffron-400"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.2, delay: 0.1 + i * 0.04, ease: EASE }}
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
                    <span className="font-mono">ID: {project.id.slice(0, 8)}</span>
                    <span className="flex items-center gap-1 text-slate-500 group-hover:text-electric-400 transition-colors">
                      View details
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              variants={fadeUp}
              className="flex items-center justify-between text-xs text-slate-400 glass rounded-xl px-4 py-3"
            >
              <span>
                Page <span className="text-white font-medium">{page}</span> of {totalPages}
                <span className="text-slate-600"> · {total} total</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
