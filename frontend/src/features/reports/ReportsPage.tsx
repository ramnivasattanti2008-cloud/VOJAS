/**
 * ReportsPage — VOJAS Reports
 *
 * IBM Carbon-inspired light theme. No glassmorphism, no gradients,
 * no glow effects, no decorative animations. All functionality preserved.
 * All data from real hooks.
 */

import { useState } from "react";
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
  Filter,
  ChevronLeft,
  ArrowRight,
  type LucideIcon,
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
} from "@/types/report-types";
import { LoadingState, ErrorState } from "@/components/ui";
import { cn } from "@/lib/utils";

// ── Light-theme severity styles (override dark report-types) ──────────────────

const SEVERITY_STYLES: Record<ReportSeverity, { bg: string; color: string; dot: string; border: string; label: string }> = {
  LOW:      { bg: "bg-gray-100",   color: "text-gray-600",   dot: "bg-gray-500",   border: "border-l-gray-400",   label: "Low" },
  MEDIUM:   { bg: "bg-amber-50",   color: "text-amber-600",  dot: "bg-amber-500",  border: "border-l-amber-500",  label: "Medium" },
  HIGH:     { bg: "bg-orange-50",  color: "text-orange-600", dot: "bg-orange-500", border: "border-l-orange-500", label: "High" },
  CRITICAL: { bg: "bg-red-50",     color: "text-red-600",   dot: "bg-red-500",   border: "border-l-red-500",    label: "Critical" },
};

// ── Light-theme status colors ────────────────────────────────────────────────

const LIGHT_STATUS_COLORS: Record<ReportStatus, { bg: string; text: string; dot: string }> = {
  SUBMITTED:    { bg: "bg-gray-100 text-gray-700",   text: "text-gray-700",   dot: "bg-gray-500" },
  ACKNOWLEDGED: { bg: "bg-blue-50 text-blue-700",    text: "text-blue-700",    dot: "bg-blue-500" },
  UNDER_REVIEW:  { bg: "bg-amber-50 text-amber-700", text: "text-amber-700",  dot: "bg-amber-500" },
  RESOLVED:     { bg: "bg-green-50 text-green-700",  text: "text-green-700",   dot: "bg-green-500" },
  REJECTED:     { bg: "bg-red-50 text-red-700",     text: "text-red-700",     dot: "bg-red-500" },
  CLOSED:       { bg: "bg-gray-100 text-gray-500",   text: "text-gray-500",    dot: "bg-gray-400" },
};

// ── Light-theme category colors ───────────────────────────────────────────────

const LIGHT_CATEGORY_COLORS: Record<ReportCategory, string> = {
  QUALITY:       "bg-purple-50 text-purple-700",
  DELAY:         "bg-amber-50 text-amber-700",
  CORRUPTION:    "bg-red-50 text-red-700",
  SAFETY:        "bg-orange-50 text-orange-700",
  ENVIRONMENT:   "bg-teal-50 text-teal-700",
  FINANCIAL:     "bg-yellow-50 text-yellow-700",
  DOCUMENTATION: "bg-cyan-50 text-cyan-700",
  OTHER:         "bg-gray-100 text-gray-600",
};

const PAGE_SIZE = 15;

function getSeverityStyle(v: ReportSeverity) {
  return SEVERITY_STYLES[v] ?? SEVERITY_STYLES.LOW;
}

function getStatusStyle(v: ReportStatus) {
  return LIGHT_STATUS_COLORS[v] ?? LIGHT_STATUS_COLORS.SUBMITTED;
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

// ── KPI card (Carbon-style) ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  subtext,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: "blue" | "red" | "amber" | "green";
  subtext?: string;
}) {
  const iconBg: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };
  const barColor: Record<string, string> = {
    blue:  "bg-blue-500",
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all h-full">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", barColor[accent])} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", iconBg[accent])}>
          <Icon aria-hidden="true" className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-gray-700 font-medium mt-1.5">{label}</p>
      {subtext && <p className="text-[11px] text-gray-500 mt-0.5">{subtext}</p>}
    </div>
  );
}

// ── Section title (Carbon pattern) ──────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  title,
  viewAll,
}: {
  icon?: LucideIcon;
  title: string;
  viewAll?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {viewAll && (
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
          {viewAll.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
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
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Citizen Reports</h1>
        <p className="text-sm text-gray-600 mt-1">
          Citizen submissions requiring review · {total} total
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Reports" value={stats.total} icon={Bell}
            accent="blue" />
          <KpiCard label="Critical Open" value={stats.criticalOpen} icon={ShieldAlert}
            accent={stats.criticalOpen > 0 ? "red" : "amber"}
            subtext={stats.criticalOpen > 0 ? "Needs immediate attention" : "None"} />
          <KpiCard label="Unassigned" value={stats.unassigned} icon={UserCheck}
            accent={stats.unassigned > 0 ? "amber" : "blue"}
            subtext={stats.unassigned > 0 ? "Pending review" : "All assigned"} />
          <KpiCard label="Last 7 Days" value={stats.last7Days} icon={Clock}
            accent="green"
            subtext="New submissions" />
        </div>
      )}

      {/* Status summary chips */}
      {stats && (
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <SectionTitle icon={Filter} title="Filter by Status" />
          <div className="flex items-center gap-2 flex-wrap mt-3" role="group" aria-label="Filter by report status">
            {REPORT_STATUSES.map((s) => {
              const count = stats.byStatus[s.value] ?? 0;
              const style = LIGHT_STATUS_COLORS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatusFilter(statusFilter === s.value ? "" : s.value as ReportStatus);
                    setPage(1);
                  }}
                  aria-pressed={statusFilter === s.value}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all",
                    statusFilter === s.value
                      ? `${style.bg} border-current`
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                  {s.label}
                  <span className="font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search reports..."
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all bg-white"
              aria-label="Search reports by title or content"
            />
          </form>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as ReportCategory | ""); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors cursor-pointer bg-white"
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
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors cursor-pointer bg-white"
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
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
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
        <ErrorState message={error} onRetry={() => reportsQuery.refetch()} />
      ) : reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1} />
            <h3 className="text-sm font-semibold text-gray-700 mb-1">No reports found</h3>
            <p className="text-xs text-gray-500 max-w-xs">
              {hasActiveFilters ? "Try adjusting your filters." : "No citizen reports have been submitted yet."}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium">
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Reports list */}
          <div className="space-y-2">
            {reports.map((report) => {
              const sev = getSeverityStyle(report.severity);
              const statusStyle = getStatusStyle(report.status);
              const catClass = LIGHT_CATEGORY_COLORS[report.category] ?? LIGHT_CATEGORY_COLORS.OTHER;
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
                  className={cn(
                    "bg-white border border-gray-200 rounded-md px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group relative",
                    sev.border
                  )}
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: report.severity === "CRITICAL" ? "#ef4444"
                      : report.severity === "HIGH" ? "#f97316"
                      : report.severity === "MEDIUM" ? "#f59e0b"
                      : "#6b7280",
                  }}
                  aria-label={`View report: ${report.title}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity dot */}
                    <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", sev.dot)} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate leading-snug">
                          {report.title}
                        </h3>
                        {/* Status badge */}
                        <span className={cn("shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border", statusStyle.bg)}>
                          <span className={cn("w-1 h-1 rounded-full", statusStyle.dot)} />
                          {getStatusLabel(report.status)}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
                        <span className={cn("px-1.5 py-0.5 rounded-md text-[10px]", catClass)}>
                          {getCategoryLabel(report.category)}
                        </span>
                        {report.project && (
                          <span className="text-gray-400 truncate">
                            {report.project.name}
                          </span>
                        )}
                        {report.isAnonymous ? (
                          <span className="text-gray-400">Anonymous</span>
                        ) : report.reporterName === "[REDACTED]" ||
                          report.reporterEmail === "[REDACTED]" ? (
                          <span className="text-gray-400">
                            Reporter{report.hasReporterContact ? " (contact on file)" : ""}
                          </span>
                        ) : (
                          <span>{report.reporterName ?? report.reporterEmail}</span>
                        )}
                        <span className="text-gray-400 ml-auto flex items-center gap-1.5">
                          {timeAgo(report.createdAt)}
                          <span className={cn("font-medium", sev.color)}>{sev.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0">
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-4 py-3">
              <span>
                Page <span className="text-gray-900 font-medium">{page}</span> of {totalPages}
                <span className="text-gray-400"> · {total} total</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-gray-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-gray-700"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
