import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  X,
  ChevronRight,
  Inbox,
  Clock,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { reportApi } from "@/services/report-api";
import { ApiError } from "@/services/report-api";
import type {
  Report,
  ReportStats,
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
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";

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

// Stat tile component
function StatTile({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="glass rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
        {subtext && <p className="text-[10px] text-slate-600 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "">("");
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(severityFilter && { severity: severityFilter }),
        page,
        limit: PAGE_SIZE,
      };
      const [listData, statsData] = await Promise.all([
        reportApi.list(filters).catch(() => null),
        reportApi.stats().catch(() => null),
      ]);
      if (listData) {
        setReports(listData.items);
        setTotalPages(listData.totalPages);
        setTotal(listData.total);
      }
      if (statsData?.stats) setStats(statsData.stats);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, categoryFilter, severityFilter, search]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-saffron-400" />
            Citizen Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and manage citizen-submitted reports — {total} total
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Total Reports"
            value={stats.total}
            icon={Bell}
            color="bg-electric-500/10 text-electric-400"
          />
          <StatTile
            label="Critical Open"
            value={stats.criticalOpen}
            icon={ShieldAlert}
            color="bg-red-500/10 text-red-400"
            subtext={stats.criticalOpen > 0 ? "Needs immediate attention" : "None"}
          />
          <StatTile
            label="Unassigned"
            value={stats.unassigned}
            icon={UserCheck}
            color="bg-saffron-500/10 text-saffron-400"
            subtext={stats.unassigned > 0 ? "Pending review" : "All assigned"}
          />
          <StatTile
            label="Last 7 Days"
            value={stats.last7Days}
            icon={Clock}
            color="bg-green-500/10 text-green-400"
            subtext="New submissions"
          />
        </div>
      )}

      {/* Status summary chips */}
      {stats && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-widest mr-1">Status:</span>
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
                    ? `${style.bg} ${style.text} border-current/20`
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
      )}

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

          {/* Category */}
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

          {/* Severity */}
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
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading reports..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReports} />
      ) : reports.length === 0 ? (
        <div className="glass rounded-xl">
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
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
        </div>
      ) : (
        <>
          {/* Reports list */}
          <div className="space-y-2">
            {reports.map((report) => {
              const sev = getSeverityStyle(report.severity);
              const statusStyle = getStatusStyle(report.status);
              const catClass = REPORT_CATEGORY_COLORS[report.category] ?? REPORT_CATEGORY_COLORS.OTHER;
              return (
                <div
                  key={report.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/reports/${report.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/reports/${report.id}`);
                    }
                  }}
                  className="glass rounded-xl px-5 py-4 hover:border-white/10 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-electric-500/5 cursor-pointer group"
                  aria-label={`View report: ${report.title}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity dot */}
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${sev.dot} ${report.severity === "CRITICAL" ? "animate-pulse" : ""}`} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white group-hover:text-electric-300 transition-colors truncate">
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
                        <span className="text-slate-600 ml-auto">{timeAgo(report.createdAt)}</span>
                      </div>
                    </div>

                    {/* Severity + arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold ${sev.color}`}>
                        {sev.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-electric-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
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
