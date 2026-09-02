/**
 * AnomaliesPage — VOJAS 2.0 Anomaly Intelligence
 *
 * IBM Carbon–inspired light theme. Professional data-management layout.
 * No gradients, no glassmorphism, no glow effects, no decorative animations.
 * All data from real hooks (no fabricated numbers).
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAnomalies, useAnomalyStats, useScanAnomalies } from "@/hooks/useAnomalies";
import {
  type AnomalyStatus,
  type AnomalySeverity,
  type AnomalyCategory,
  ANOMALY_STATUSES,
  getAnomalyCategoryLabel,
  getStatusLabel,
  getRiskLabel,
} from "@/types";
import { LoadingState, ErrorState } from "@/components/ui";
import EmptyState from "@/components/ui/Empty";
import { type Column } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Search,
  X,
  Filter,
  ChevronRight,
  Shield,
  Building2,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Scan,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

// ── Formatters ──────────────────────────────────────────────────────────────

function timeAgo(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// Severity badge colors (light theme)
const SEV_BADGE: Record<AnomalySeverity, { label: string; bg: string; text: string }> = {
  CRITICAL: { label: "Critical", bg: "bg-red-50 text-red-700", text: "text-red-700" },
  HIGH:     { label: "High",     bg: "bg-orange-50 text-orange-700", text: "text-orange-700" },
  MEDIUM:   { label: "Medium",   bg: "bg-yellow-50 text-yellow-700", text: "text-yellow-700" },
  LOW:      { label: "Low",      bg: "bg-blue-50 text-blue-700", text: "text-blue-700" },
};

// ── KPI card (Carbon style) ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  Icon,
  accent = "blue",
  pulse,
}: {
  label: string;
  value: number;
  sub?: string;
  Icon: React.ElementType;
  accent?: "blue" | "red" | "amber" | "green";
  pulse?: boolean;
}) {
  const iconMap: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };
  const barMap: Record<string, string> = {
    blue:  "bg-blue-500",
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
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
        {pulse && (
          <span className="relative flex h-2 w-2 mt-1" aria-label="Active">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {value.toLocaleString("en-IN")}
      </p>
      <p className="text-sm text-gray-700 font-medium mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section header (Carbon pattern) ──────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────────────

export default function AnomaliesPage() {
  const navigate = useNavigate();
  const [scanToast, setScanToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | "">("");
  const [categoryFilter, setCategoryFilter] = useState<AnomalyCategory | "">("");
  const [page] = useState(1);

  const anomaliesQuery = useAnomalies({
    status: (statusFilter || undefined) as AnomalyStatus | undefined,
    severity: (severityFilter || undefined) as AnomalySeverity | undefined,
    category: (categoryFilter || undefined) as AnomalyCategory | undefined,
    page,
    limit: 50,
  });
  const statsQuery = useAnomalyStats();
  const scanMutation = useScanAnomalies();

  const anomalies = anomaliesQuery.data?.items ?? [];
  const stats = statsQuery.data ?? null;
  const loading = anomaliesQuery.isLoading;
  const error = anomaliesQuery.error?.message ?? null;
  const scanning = scanMutation.isPending;

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return anomalies;
    const q = search.trim().toLowerCase();
    return anomalies.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.project?.name.toLowerCase().includes(q) ||
        a.project?.district.toLowerCase().includes(q) ||
        (a.ruleCode ?? "").toLowerCase().includes(q)
    );
  }, [anomalies, search]);

  const clearFilters = () => {
    setStatusFilter("");
    setSeverityFilter("");
    setCategoryFilter("");
    setSearchInput("");
    setSearch("");
  };
  const hasActiveFilters = statusFilter || severityFilter || categoryFilter || search;

  const handleScan = async () => {
    try {
      const result = await scanMutation.mutateAsync();
      setScanToast(
        `Scan complete: ${result.newAnomalies} new anomalies detected (${result.totalAnomalies} total)`
      );
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setScanToast(null), 6000);
    } catch { /* handled by error state */ }
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Columns for the anomaly table
  const columns: Column<typeof filtered[number]>[] = [
    {
      header: "Severity",
      accessor: (a) => {
        const sev = SEV_BADGE[a.severity] ?? SEV_BADGE.LOW;
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded", sev.bg)}>
              {sev.label}
            </span>
          </div>
        );
      },
    },
    {
      header: "Anomaly",
      accessor: (a) => (
        <div className="max-w-[240px]">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{a.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: (a) => (
        <span className="text-xs text-gray-600">{getAnomalyCategoryLabel(a.category)}</span>
      ),
    },
    {
      header: "Project",
      accessor: (a) =>
        a.project ? (
          <div className="flex items-center gap-1 max-w-[160px]">
            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-700 truncate">{a.project.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: "Location",
      accessor: (a) =>
        a.project ? (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600 truncate max-w-[100px]">{a.project.district}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: "Risk",
      accessor: (a) => {
        const risk = getRiskLabel(a.riskScore);
        return (
          <span className={cn("text-sm font-semibold tabular-nums", risk.color)}>
            {a.riskScore}
          </span>
        );
      },
    },
    {
      header: "Status",
      accessor: (a) => {
        const resolved = a.status === "RESOLVED" || a.status === "DISMISSED";
        return (
          <span className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded",
            resolved ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
          )}>
            {getStatusLabel(a.status)}
          </span>
        );
      },
    },
    {
      header: "Rule",
      accessor: (a) => (
        <span className="text-xs font-mono text-gray-500">{a.ruleCode ?? "—"}</span>
      ),
    },
    {
      header: "Detected",
      accessor: (a) => (
        <span className="text-xs text-gray-500">{timeAgo(a.createdAt)}</span>
      ),
    },
    {
      header: "",
      accessor: () => (
        <div className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
          <span>View</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight">Anomaly Intelligence</h1>
        <p className="text-sm text-gray-600 mt-1">
          Flagged patterns from project and financial data requiring officer review.
        </p>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Open Anomalies"
          value={stats?.open ?? 0}
          sub="need review"
          Icon={AlertTriangle}
          accent="amber"
        />
        <KpiCard
          label="Critical"
          value={stats?.critical ?? 0}
          sub="immediate action"
          Icon={ShieldCheck}
          accent="red"
          pulse={(stats?.critical ?? 0) > 0}
        />
        <KpiCard
          label="High Risk"
          value={stats?.high ?? 0}
          sub="priority"
          Icon={AlertTriangle}
          accent="red"
        />
        <KpiCard
          label="Total Detected"
          value={stats?.total ?? 0}
          sub="all time"
          Icon={Scan}
          accent="blue"
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
            className="relative flex-1 min-w-[220px]"
            role="search"
            aria-label="Search anomalies"
          >
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, project, district, rule…"
              className="w-full border border-gray-200 rounded px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              aria-label="Search anomalies by title, project, district, or rule code"
            />
          </form>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnomalyStatus | "")}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
            aria-label="Filter by anomaly status"
          >
            <option value="">All statuses</option>
            {ANOMALY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AnomalySeverity | "")}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
            aria-label="Filter by anomaly severity"
          >
            <option value="">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
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

          {/* Run scan */}
          <button
            onClick={handleScan}
            disabled={scanning}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-medium rounded transition-colors disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("w-4 h-4", scanning ? "animate-spin" : "")} />
            {scanning ? "Scanning…" : "Run Scan"}
          </button>
        </div>

        {/* Severity quick-filter chips */}
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by severity">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mr-1">Severity:</span>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as AnomalySeverity[]).map((s) => {
            const isActive = severityFilter === s;
            const badge = SEV_BADGE[s];
            return (
              <button
                key={s}
                onClick={() => setSeverityFilter(isActive ? "" : s)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border transition-colors",
                  isActive
                    ? `${badge.bg} border-current font-medium`
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {badge.label}
                {stats && (
                  <span className={cn(
                    "text-[10px] font-mono tabular-nums",
                    isActive ? "text-inherit opacity-70" : "text-gray-400"
                  )}>
                    {s === "CRITICAL" ? stats.critical :
                     s === "HIGH" ? stats.high :
                     s === "MEDIUM" ? stats.medium :
                     stats.low}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────── */}
      {scanToast && (
        <div
          role="status"
          aria-live="polite"
          className="bg-white border border-green-200 rounded-md p-4 flex items-center gap-3"
        >
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-gray-800">{scanToast}</p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState message="Loading anomalies…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => anomaliesQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md py-16">
          <EmptyState
            icon={CheckCircle2}
            title={hasActiveFilters ? "No anomalies match your filters" : "No anomalies detected"}
            description={
              hasActiveFilters
                ? "Try adjusting your filters or run a fresh scan."
                : "All projects are within expected parameters. Run a scan to check the latest data."
            }
            action={
              hasActiveFilters ? (
                <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", scanning ? "animate-spin" : "")} />
                  Run scan
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <SectionHeader title="Results" count={filtered.length} />
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left" aria-label="Anomalies">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["Severity", "Anomaly", "Category", "Project", "Location", "Risk", "Status", "Rule", "Detected", ""].map((h) => (
                      <th key={h} scope="col" className="py-2.5 pr-4 pl-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider first:pl-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/anomalies/${a.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/anomalies/${a.id}`); }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View anomaly: ${a.title}`}
                    >
                      {columns.map((col, i) => (
                        <td key={i} className={cn("py-3 pr-4 align-top", i === 1 ? "pl-4" : "pl-4")}>
                          {col.accessor(a, i)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Trust note ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md p-4 flex items-start gap-3 text-xs text-gray-600">
        <Shield className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-gray-800 mb-0.5">About anomaly detection</p>
          <p className="leading-relaxed">
            Anomalies are flagged patterns that warrant review — they indicate risk, not confirmed fraud.
            Final verification always remains with authorized government officers.
            Each anomaly has a risk score (0–100) and a clear evidence trail.
          </p>
        </div>
      </div>
    </div>
  );
}
