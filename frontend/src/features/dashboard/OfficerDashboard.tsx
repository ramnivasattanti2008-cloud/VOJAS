/**
 * OfficerDashboard — VOJAS 2.0 Accountability Overview
 *
 * IBM Carbon–inspired light theme. Professional data-management layout.
 * No 3D globe, no glassmorphism, no glow effects, no decorative animations.
 * All data from real hooks (no fake numbers).
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileText,
  IndianRupee,
  Shield,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Eye,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useAnomalies, useAnomalyStats } from "@/hooks/useAnomalies";
import { useReports } from "@/hooks/useReports";
import { useSchemeFinancials } from "@/hooks/useFinancial";
import { SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui";
import { cn } from "@/lib/utils";

// ── Formatters ──────────────────────────────────────────────────────────────

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.floor(v).toLocaleString("en-IN")}`;
}

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

// ── Section title (IBM Carbon pattern) ──────────────────────────────────────

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900 leading-tight">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <Link
          to={action.href}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
        >
          {action.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── KPI card (compact, Carbon-style) ───────────────────────────────────────

function Kpi({
  label,
  value,
  sub,
  Icon,
  accent = "blue",
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  Icon: React.ElementType;
  accent?: "blue" | "red" | "amber" | "green" | "slate";
  href?: string;
}) {
  const key: "blue" | "red" | "amber" | "green" | "slate" = accent ?? "blue";
  const iconBg: Record<"blue" | "red" | "amber" | "green" | "slate", string> = {
    blue:  "bg-blue-50 text-blue-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    slate: "bg-gray-100 text-gray-600",
  };
  const barColor: Record<"blue" | "red" | "amber" | "green" | "slate", string> = {
    blue:  "bg-blue-500",
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    slate: "bg-gray-400",
  };
  const bg: string = iconBg[key];
  const bar: string = barColor[key];

  const inner = (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-full">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar)} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", bg)}>
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

  return href ? (
    <Link to={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ── Expenditure by category (table view, no fake charts) ──────────────────

function ExpenditureByCategory({
  rows,
}: {
  rows: Array<{ category: string; total: number; count: number }>;
}) {
  const total = rows.reduce((s, r) => s + r.total, 0);

  const columns: Column<typeof rows[number]>[] = [
    {
      header: "Category",
      accessor: (r) => <span className="text-sm text-gray-800">{r.category}</span>,
    },
    {
      header: "Count",
      align: "right",
      accessor: (r) => (
        <span className="text-sm text-gray-700 tabular-nums">{r.count.toLocaleString("en-IN")}</span>
      ),
    },
    {
      header: "Total",
      align: "right",
      accessor: (r) => (
        <span className="text-sm text-gray-900 font-medium tabular-nums">{fmtINR(r.total)}</span>
      ),
    },
    {
      header: "Share",
      align: "right",
      accessor: (r) => {
        const pct = total > 0 ? (r.total / total) * 100 : 0;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
                aria-hidden
              />
            </div>
            <span className="text-xs text-gray-600 tabular-nums w-10 text-right">
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={rows} empty="No expenditure data available" compact />;
}

// ── Risk distribution (compact visual + counts) ───────────────────────────

function RiskDistribution({
  stats,
}: {
  stats: { critical: number; high: number; medium: number; low: number; open: number } | null;
}) {
  if (!stats) {
    return (
      <div className="text-sm text-gray-500 py-6 text-center">No risk data available</div>
    );
  }
  const total = stats.critical + stats.high + stats.medium + stats.low;
  if (total === 0) {
    return (
      <div className="text-sm text-gray-500 py-6 text-center">No anomalies detected</div>
    );
  }
  const items: Array<{ label: string; count: number; bg: string; bar: string; text: string }> = [
    { label: "Critical", count: stats.critical, bg: "bg-red-50",    bar: "bg-red-500",    text: "text-red-700"    },
    { label: "High",     count: stats.high,     bg: "bg-amber-50",  bar: "bg-amber-500",  text: "text-amber-700"  },
    { label: "Medium",   count: stats.medium,   bg: "bg-yellow-50", bar: "bg-yellow-500", text: "text-yellow-700" },
    { label: "Low",      count: stats.low,      bg: "bg-green-50",  bar: "bg-green-500",  text: "text-green-700"  },
  ];
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const pct = total > 0 ? (it.count / total) * 100 : 0;
        return (
          <div key={it.label} className="flex items-center gap-3">
            <span className={cn("w-16 text-xs font-medium", it.text)}>{it.label}</span>
            <div className={cn("flex-1 h-5 rounded overflow-hidden", it.bg)}>
              <div
                className={cn("h-full transition-all duration-500", it.bar)}
                style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
                aria-hidden
              />
            </div>
            <span className="text-sm text-gray-900 font-medium tabular-nums w-8 text-right">
              {it.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent anomalies (compact table) ──────────────────────────────────────

function RecentAnomaliesTable({
  items,
  loading,
}: {
  items: any[];
  loading: boolean;
}) {
  if (loading) {
    return <LoadingState message="Loading anomalies…" size="sm" />;
  }
  const columns: Column<any>[] = [
    {
      header: "Project",
      accessor: (r) => (
        <Link
          to={`/anomalies/${r.id}`}
          className="text-sm text-gray-900 hover:text-blue-600 font-medium block max-w-[200px] truncate"
        >
          {r.project?.name ?? r.title ?? r.description?.slice(0, 60) ?? "—"}
        </Link>
      ),
    },
    {
      header: "Type",
      accessor: (r) => (
        <span className="text-xs text-gray-600">{r.category ?? r.type ?? "—"}</span>
      ),
    },
    {
      header: "Severity",
      accessor: (r) => <SeverityBadge severity={r.severity ?? "LOW"} />,
    },
    {
      header: "Status",
      accessor: (r) => <StatusBadge status={r.status ?? "OPEN"} />,
    },
    {
      header: "Detected",
      align: "right",
      accessor: (r) => (
        <span className="text-xs text-gray-500">{timeAgo(r.createdAt)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={items.slice(0, 6)}
      empty="No anomalies detected"
      compact
    />
  );
}

// ── Recent citizen reports (compact table) ────────────────────────────────

function RecentReportsTable({
  items,
  loading,
}: {
  items: any[];
  loading: boolean;
}) {
  if (loading) {
    return <LoadingState message="Loading reports…" size="sm" />;
  }
  const columns: Column<any>[] = [
    {
      header: "Report",
      accessor: (r) => (
        <Link
          to={`/reports/${r.id}`}
          className="text-sm text-gray-900 hover:text-blue-600 font-medium block max-w-[220px] truncate"
        >
          {r.title ?? r.category ?? "Citizen report"}
        </Link>
      ),
    },
    {
      header: "Location",
      accessor: (r) =>
        r.locationDesc ? (
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {r.locationDesc}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: "Status",
      accessor: (r) => <StatusBadge status={r.status ?? "SUBMITTED"} />,
    },
    {
      header: "Submitted",
      align: "right",
      accessor: (r) => (
        <span className="text-xs text-gray-500">{timeAgo(r.createdAt)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={items.slice(0, 6)}
      empty="No citizen reports submitted"
      compact
    />
  );
}

// ── Geographic monitoring (small map preview) ─────────────────────────────

function GeographicMonitoring() {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Geographic Monitoring</h2>
          <p className="text-xs text-gray-500 mt-0.5">Spatial view of monitored projects</p>
        </div>
        <Link
          to="/map"
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Open full map <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="aspect-[16/7] bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Spatial project map</p>
          <p className="text-xs text-gray-500 mt-1">Click to open the full interactive view</p>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export default function OfficerDashboard() {
  const projectsQuery = useProjects({ limit: 100 });
  const finQuery = useSchemeFinancials();
  const anomaliesQuery = useAnomalies({ status: "OPEN", limit: 6 });
  const reportsQuery = useReports({ status: "SUBMITTED", limit: 6 });
  const anomalyStatsQuery = useAnomalyStats();

  const projects = projectsQuery.data?.items ?? [];
  const fin = finQuery.data ?? null;
  const anomalies = anomaliesQuery.data?.items ?? [];
  const reports = reportsQuery.data?.items ?? [];
  const stats = anomalyStatsQuery.data ?? null;

  const loading =
    projectsQuery.isLoading ||
    finQuery.isLoading ||
    anomaliesQuery.isLoading ||
    reportsQuery.isLoading;

  // KPIs — computed from real data only
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p: any) => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter((p: any) =>
    ["COMPLETED", "VERIFIED"].includes(p.status)
  ).length;
  const openAnomalies = stats?.open ?? 0;
  const criticalAnomalies = stats?.critical ?? 0;
  const pendingReports = reportsQuery.data?.total ?? 0;
  const totalBudget = fin?.totalBudget ?? 0;
  const totalSpent = fin?.totalSpent ?? 0;
  const utilization = fin?.utilization ?? 0;

  // Expenditure by category (real data, with fallback)
  const expenditureByCategory = useMemo(() => {
    if (!fin?.byCategory || fin.byCategory.length === 0) return [];
    return fin.byCategory.map((c: any) => ({
      category: c.category ?? c.name ?? "—",
      total: c.total ?? c.amount ?? c.spent ?? 0,
      count: c.count ?? c._count?.id ?? 0,
    }));
  }, [fin]);

  if (loading) {
    return (
      <div className="space-y-5 max-w-[1400px]">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Accountability Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Loading…</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
        <LoadingState message="Loading accountability overview…" size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* ── Page header (Carbon style — compact, no hero) ────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
          Accountability Overview
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Real-time summary of MPLAD project monitoring, anomaly detection, and citizen evidence.
        </p>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi
          label="Total Projects"
          value={totalProjects}
          sub={`${activeProjects} active`}
          Icon={FileText}
          accent="blue"
          href="/projects"
        />
        <Kpi
          label="Total Budget"
          value={fmtINR(totalBudget)}
          sub={`${utilization.toFixed(1)}% utilized`}
          Icon={IndianRupee}
          accent="green"
          href="/projects"
        />
        <Kpi
          label="Open Anomalies"
          value={openAnomalies}
          sub={criticalAnomalies > 0 ? `${criticalAnomalies} critical` : "no critical"}
          Icon={AlertTriangle}
          accent={criticalAnomalies > 0 ? "red" : "amber"}
          href="/anomalies"
        />
        <Kpi
          label="Pending Reports"
          value={pendingReports}
          sub="awaiting review"
          Icon={Eye}
          accent="amber"
          href="/reports?status=SUBMITTED"
        />
        <Kpi
          label="Completed"
          value={completedProjects}
          sub="verified projects"
          Icon={CheckCircle2}
          accent="green"
          href="/projects?status=COMPLETED"
        />
      </div>

      {/* ── Two-column: expenditure (left) + risk (right) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-md p-5">
          <SectionTitle
            title="Expenditure by Sector"
            description="Approved spend across project categories"
            action={{ label: "View financials", href: "/analytics" }}
          />
          {expenditureByCategory.length === 0 ? (
            <div className="py-10 text-center">
              <IndianRupee className="w-7 h-7 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No expenditure recorded yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Financial data will appear as projects report spending
              </p>
            </div>
          ) : (
            <ExpenditureByCategory rows={expenditureByCategory} />
          )}
          {fin && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>
                Spent: <span className="font-semibold text-gray-900 tabular-nums">{fmtINR(totalSpent)}</span>
              </span>
              <span>
                Remaining:{" "}
                <span className="font-semibold text-gray-900 tabular-nums">
                  {fmtINR(fin.remaining ?? totalBudget - totalSpent)}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-5">
          <SectionTitle
            title="Risk Overview"
            description={`${openAnomalies} open anomalies`}
            action={{ label: "Investigate", href: "/anomalies" }}
          />
          <RiskDistribution stats={stats} />
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-600">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Anomalies are detected automatically from project and financial data.
            </span>
          </div>
        </div>
      </div>

      {/* ── Recent anomalies ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <SectionTitle
          title="Recent Anomalies"
          description="Latest projects flagged by anomaly detection"
          action={{ label: "View all", href: "/anomalies" }}
        />
        <RecentAnomaliesTable items={anomalies} loading={anomaliesQuery.isLoading} />
      </div>

      {/* ── Citizen evidence ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <SectionTitle
          title="Citizen Evidence Activity"
          description="Recent citizen-submitted reports"
          action={{ label: "View all reports", href: "/reports" }}
        />
        <RecentReportsTable items={reports} loading={reportsQuery.isLoading} />
      </div>

      {/* ── Geographic monitoring ─────────────────────────────────── */}
      <GeographicMonitoring />
    </div>
  );
}
