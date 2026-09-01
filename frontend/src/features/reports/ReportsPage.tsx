import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Search,
  X,
  ChevronRight,
  Inbox,
  Clock,
  ShieldAlert,
  UserCheck,
  Filter,
  ChevronLeft,
} from "lucide-react";
import { useReports, useReportStats } from "@/hooks/useReports";
import type {
  ReportStatus,
  ReportCategory,
  ReportSeverity,
} from "@/types/report-types";
import {
  REPORT_STATUSES,
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  REPORT_STATUS_COLORS,
  REPORT_CATEGORY_COLORS,
} from "@/types/report-types";
import { LoadingState, ErrorState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import SectionTitle from "@/components/ui/SectionTitle";
import { fadeUp, staggerContainer, EASE } from "@/components/ui/Animations";
import EmptyState from "@/components/ui/Empty";

const PAGE_SIZE = 15;

function getSeverityStyle(v: ReportSeverity) {
  return REPORT_SEVERITIES.find((s) => s.value === v) ?? REPORT_SEVERITIES[0];
}

function getStatusStyle(v: ReportStatus) {
  return REPORT_STATUS_COLORS[v] ?? REPORT_STATUS_COLORS.SUBMITTED;
}

function getCategoryLabel(v: ReportCategory): string {
  return REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

function getStatusLabel(v: ReportStatus): string {
  return REPORT_STATUSES.find((s) => s.value === v)?.label ?? v;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? "just now" : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Stat tile component — dramatic with glow
function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  subtext,
  glowColor,
  index,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  subtext?: string;
  glowColor?: string;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass rounded-2xl p-5 border ring-1 ring-white/5 relative overflow-hidden group cursor-default"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          accent === "from-saffron-500 to-saffron-400" ? "bg-saffron-500/15 text-saffron-400" :
          accent === "from-red-500 to-red-400" ? "bg-red-500/15 text-red-400" :
          accent === "from-green-500 to-green-400" ? "bg-green-500/15 text-green-400" :
          "bg-electric-500/15 text-electric-400"
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        {glowColor && value > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron-500" />
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold leading-none tabular-nums ${
        accent === "from-saffron-500 to-saffron-400" ? "text-saffron-300" :
        accent === "from-red-500 to-red-400" ? "text-red-300" :
        accent === "from-green-500 to-green-400" ? "text-green-300" :
        "text-electric-300"
      }`} style={{ textShadow: glowColor ? `0 0 20px ${glowColor}` : "none" }}>
        {value.toLocaleString()}
      </p>
      <p className="text-[11px] text-slate-400 mt-2 font-semibold">{label}</p>
      {subtext && <p className="text-[10px] text-slate-600 mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "">("");
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | "">("");
  const [page, setPage] = useState(1);

  // React Query
  const reportsQuery = useReports({
    search: search || undefined,
    status: (statusFilter || undefined) as ReportStatus | undefined,
    category: (categoryFilter || undefined) as ReportCategory | undefined,
    severity: (severityFilter || undefined) as ReportSeverity | undefined,
    page,
    limit: PAGE_SIZE,
  });
  const statsQuery = useReportStats();

  const reports = reportsQuery.data?.items ?? [];
  const totalPages = reportsQuery.data?.totalPages ?? 1;
  const total = reportsQuery.data?.total ?? 0;
  const stats = statsQuery.data?.stats ?? null;
  const loading = reportsQuery.isLoading;
  const error = reportsQuery.error?.message ?? null;

  const hasActiveFilters = statusFilter || categoryFilter || severityFilter || search;

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setSeverityFilter("");
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
          title="Citizen"
          gradientWord="Reports"
          accent="saffron"
          icon={Bell}
          subtitle={`Citizen submissions requiring review · ${total} total`}
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Reports" },
          ]}
        />
      </motion.div>

      {/* Stats row */}
      {stats && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Total Reports" value={stats.total} icon={Bell}
            accent="from-electric-500 to-electric-400" glowColor="#06b6d4" index={0} />
          <StatTile label="Critical Open" value={stats.criticalOpen} icon={ShieldAlert}
            accent="from-red-500 to-red-400" glowColor={stats.criticalOpen > 0 ? "#ef4444" : undefined}
            subtext={stats.criticalOpen > 0 ? "Needs immediate attention" : "None"}
            index={1} />
          <StatTile label="Unassigned" value={stats.unassigned} icon={UserCheck}
            accent="from-saffron-500 to-saffron-400" glowColor={stats.unassigned > 0 ? "#fb923c" : undefined}
            subtext={stats.unassigned > 0 ? "Pending review" : "All assigned"}
            index={2} />
          <StatTile label="Last 7 Days" value={stats.last7Days} icon={Clock}
            accent="from-green-500 to-green-400" glowColor="#10b981"
            subtext="New submissions"
            index={3} />
        </motion.div>
      )}

      {/* Status summary chips */}
      {stats && (
        <motion.div variants={fadeUp} className="glass rounded-xl p-4 top-accent top-accent-saffron">
          <SectionTitle icon={Filter} title="Filter by Status" />
          <div className="flex items-center gap-2 flex-wrap mt-3" role="group" aria-label="Filter by report status">
            {REPORT_STATUSES.map((s) => {
              const count = stats.byStatus[s.value] ?? 0;
              const style = REPORT_STATUS_COLORS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatusFilter(statusFilter === s.value ? "" : s.value as ReportStatus);
                    setPage(1);
                  }}
                  aria-pressed={statusFilter === s.value}
                  className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                    statusFilter === s.value
                      ? `${style.bg} ${style.text} border-current/20 shadow-sm`
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {s.label}
                  <span className="font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filter bar */}
      <motion.div variants={fadeUp} className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="relative flex-1 min-w-[200px]"
            role="search"
            aria-label="Search reports"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search reports..."
              className="w-full bg-navy-800/60 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-electric-500/50 focus:ring-1 focus:ring-electric-500/20 transition-all"
              aria-label="Search reports by title or content"
            />
          </form>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as ReportCategory | ""); setPage(1); }}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
            aria-label="Filter by report category"
          >
            <option value="">All categories</option>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value as ReportSeverity | ""); setPage(1); }}
            className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-electric-500/50 transition-colors cursor-pointer"
            aria-label="Filter by report severity"
          >
            <option value="">All severities</option>
            {REPORT_SEVERITIES.map((s) => (
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
      </motion.div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading reports..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => reportsQuery.refetch()} />
      ) : reports.length === 0 ? (
        <motion.div variants={fadeUp} className="glass rounded-xl">
          <EmptyState
            icon={Inbox}
            title="No reports found"
            description={hasActiveFilters ? "Try adjusting your filters." : "No citizen reports have been submitted yet."}
            action={
              hasActiveFilters ? (
                <button onClick={clearFilters} className="text-xs text-electric-400 hover:text-electric-300">
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </motion.div>
      ) : (
        <>
          {/* Reports list */}
          <div className="space-y-2">
            {reports.map((report, i) => {
              const sev = getSeverityStyle(report.severity);
              const statusStyle = getStatusStyle(report.status);
              const catClass = REPORT_CATEGORY_COLORS[report.category] ?? REPORT_CATEGORY_COLORS.OTHER;
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: EASE }}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/reports/${report.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/reports/${report.id}`);
                    }
                  }}
                  className="glass rounded-xl px-5 py-4 hover:border-white/15 hover:-translate-y-0.5 transition-all cursor-pointer group relative overflow-hidden"
                  aria-label={`View report: ${report.title}`}
                >
                  {/* Severity accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                    report.severity === "CRITICAL" ? "bg-red-500" :
                    report.severity === "HIGH" ? "bg-orange-500" :
                    report.severity === "MEDIUM" ? "bg-saffron-500" :
                    "bg-blue-500"
                  }`} />

                  <div className="flex items-start gap-4 pl-2">
                    {/* Severity dot */}
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${sev.dot} ${report.severity === "CRITICAL" ? "animate-pulse" : ""}`} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white group-hover:text-electric-300 transition-colors truncate leading-snug">
                          {report.title}
                        </h3>
                        {/* Status badge */}
                        <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1 h-1 rounded-full ${statusStyle.dot}`} />
                          {getStatusLabel(report.status)}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                        <span className={`px-1.5 py-0.5 rounded-md ${catClass}`}>
                          {getCategoryLabel(report.category)}
                        </span>
                        {report.project && (
                          <span className="text-slate-600 truncate">
                            → {report.project.name}
                          </span>
                        )}
                        {report.isAnonymous ? (
                          <span className="text-slate-600">Anonymous</span>
                        ) : report.reporterName === "[REDACTED]" ||
                          report.reporterEmail === "[REDACTED]" ? (
                          <span className="text-slate-500">
                            Reporter{report.hasReporterContact ? " (contact on file)" : ""}
                          </span>
                        ) : (
                          <span>{report.reporterName ?? report.reporterEmail}</span>
                        )}
                        <span className="text-slate-600 ml-auto flex items-center gap-1.5">
                          {timeAgo(report.createdAt)}
                          <span className={`${sev.color} font-semibold`}>{sev.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0">
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-electric-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

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
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
