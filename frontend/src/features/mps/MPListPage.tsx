/**
 * MPListPage — VOJAS 2.0
 *
 * IBM Carbon-inspired light theme. Professional data-management layout.
 * No glassmorphism, no gradients, no glow effects, no decorative animations.
 * All data from real hooks (useMPs).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  X,
  ChevronRight,
  Calendar,
  IndianRupee,
  TrendingUp,
  Plus,
  UserRound,
} from "lucide-react";
import { useMPs } from "@/hooks/useMPs";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { type MP, getTermLabel } from "@/types";

const PAGE_SIZE = 20;

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCr(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(0)} L`;
  return `₹${v.toFixed(0)}`;
}

// ── Section title (IBM Carbon pattern) ────────────────────────────────────────

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            {count.toLocaleString("en-IN")}
          </span>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── KPI card (Carbon-style) ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  Icon,
  accent = "blue",
  sub,
}: {
  label: string;
  value: number | string;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "green" | "amber" | "purple" | "slate";
  sub?: string;
}) {
  const iconBg: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    amber:  "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    slate:  "bg-gray-100 text-gray-600",
  };
  const barColor: Record<string, string> = {
    blue:   "bg-blue-500",
    green:  "bg-green-500",
    amber:  "bg-amber-500",
    purple: "bg-purple-500",
    slate:  "bg-gray-400",
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", barColor[accent])} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", iconBg[accent])}>
          <Icon aria-hidden="true" className="w-4 h-4" />
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

// ── Utilization bar ─────────────────────────────────────────────────────────

function UtilizationBar({ value }: { value: number }) {
  const barClass =
    value > 100 ? "bg-red-500" :
    value >= 95 ? "bg-green-500" :
    value >= 75 ? "bg-blue-500" :
    "bg-amber-500";

  const textClass =
    value > 100 ? "text-red-600" :
    value >= 95 ? "text-green-600" :
    value >= 75 ? "text-blue-600" :
    "text-amber-600";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${Math.min(100, value)}%` }}
          aria-hidden
        />
      </div>
      <span className={cn("text-xs font-medium tabular-nums w-12 text-right", textClass)}>
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

// ── House badge ──────────────────────────────────────────────────────────────

function HouseBadge({ house }: { house: "LOK_SABHA" | "RAJYA_SABHA" | string }) {
  const houseLabel = house === "LOK_SABHA" ? "Lok Sabha" : house === "RAJYA_SABHA" ? "Rajya Sabha" : house;
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
      house === "LOK_SABHA"
        ? "bg-blue-50 text-blue-700"
        : "bg-purple-50 text-purple-700"
    )}>
      {houseLabel}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MPListPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [houseFilter, setHouseFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [page, setPage] = useState(1);

  const query = useMPs({
    search: search || undefined,
    house: houseFilter || undefined,
    term: termFilter || undefined,
    state: stateFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const items = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const total = query.data?.total ?? 0;
  const loading = query.isLoading;
  const error = query.error?.message ?? null;

  const hasFilters = search || houseFilter || termFilter || stateFilter;

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setHouseFilter("");
    setTermFilter("");
    setStateFilter("");
    setPage(1);
  };

  // Derived stats
  const lokSabhaCount = items.filter((m) => m.house === "LOK_SABHA").length;
  const rajyaSabhaCount = items.filter((m) => m.house === "RAJYA_SABHA").length;
  const eighteenthTermCount = items.filter((m) => m.term === "EIGHTEENTH").length;

  const mpladSpent = items.reduce((s, m) => s + (m.mpladExpenditure ?? 0), 0);
  const utilizationMps = items.filter((m) => m.mpladUtilization != null);
  const avgUtilization = utilizationMps.length > 0
    ? utilizationMps.reduce((s, m) => s + (m.mpladUtilization ?? 0), 0) / utilizationMps.length
    : null;
  const topPerformers = items.filter((m) => (m.mpladUtilization ?? 0) >= 95).length;

  // Table columns
  const columns: Column<MP>[] = [
    {
      header: "MP",
      accessor: (mp) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {mp.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{mp.name}</div>
            <div className="text-[10px] text-gray-500 font-mono">{mp.state}</div>
          </div>
        </div>
      ),
      className: "min-w-[200px]",
    },
    {
      header: "Constituency",
      accessor: (mp) => (
        <div className="flex flex-col gap-1">
          <HouseBadge house={mp.house} />
          <span className="text-xs text-gray-700">{mp.constituency ?? "—"}</span>
        </div>
      ),
    },
    {
      header: "Party",
      accessor: (mp) => (
        <span className="text-xs text-gray-700 whitespace-nowrap">
          {mp.party ?? <span className="text-gray-400 italic">—</span>}
        </span>
      ),
    },
    {
      header: "Term",
      accessor: (mp) => (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="w-3 h-3" aria-hidden />
          {getTermLabel(mp.term)}
        </div>
      ),
    },
    {
      header: "MPLADS Spent",
      accessor: (mp) => {
        const exp = mp.mpladExpenditure ?? 0;
        const ent = mp.mpladEntitlement ?? 0;
        return (
          <div className="text-xs">
            {exp > 0 ? (
              <>
                <span className="font-medium text-gray-900 font-mono">{fmtCr(exp)}</span>
                {ent > 0 && (
                  <div className="text-[10px] text-gray-500">of {fmtCr(ent)}</div>
                )}
              </>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Utilization",
      accessor: (mp) => {
        const util = mp.mpladUtilization ?? 0;
        return util > 0
          ? <UtilizationBar value={util} />
          : <span className="text-gray-400 text-xs">—</span>;
      },
    },
    {
      header: "",
      accessor: () => <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden />,
      className: "w-8",
    },
  ];

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight">MPs</h1>
        <p className="text-sm text-gray-600 mt-1">
          MPLADS registered MPs
          {total > 0 && <span className="text-gray-500"> · {total.toLocaleString("en-IN")} on record</span>}
        </p>
      </div>

      {/* ── KPI strip (4 cards) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total MPs"
          value={total}
          Icon={Users}
          accent="blue"
          sub={`${items.length} on this page`}
        />
        <KpiCard
          label="Lok Sabha"
          value={lokSabhaCount}
          Icon={UserRound}
          accent="blue"
        />
        <KpiCard
          label="Rajya Sabha"
          value={rajyaSabhaCount}
          Icon={UserRound}
          accent="purple"
        />
        <KpiCard
          label="18th Term"
          value={eighteenthTermCount}
          Icon={Calendar}
          accent="green"
          sub="2024–2029"
        />
      </div>

      {/* ── Aggregate metrics row (3 cards) ──────────────────────── */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-green-600" aria-hidden />
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  MPLADS Spent (Page)
                </span>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900 tabular-nums font-mono">
              {mpladSpent > 0 ? `₹${mpladSpent.toFixed(1)} Cr` : "—"}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Avg Utilization
                </span>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900 tabular-nums font-mono">
              {avgUtilization !== null ? `${avgUtilization.toFixed(0)}%` : "—"}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" aria-hidden />
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Top Performers
                </span>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900 tabular-nums font-mono">
              {topPerformers}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">≥ 95% utilization</p>
          </div>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-md p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
            <input
              type="text"
              placeholder="Search by name or constituency…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value.length === 0) setSearch("");
              }}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
              className="w-full pl-9 pr-3 py-2 rounded border border-gray-200
                text-gray-800 placeholder-gray-400 text-sm bg-white
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* House select */}
          <select
            value={houseFilter}
            onChange={(e) => { setHouseFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded border border-gray-200 text-gray-700 text-sm bg-white
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Houses</option>
            <option value="LOK_SABHA">Lok Sabha</option>
            <option value="RAJYA_SABHA">Rajya Sabha</option>
          </select>

          {/* Term select */}
          <select
            value={termFilter}
            onChange={(e) => { setTermFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded border border-gray-200 text-gray-700 text-sm bg-white
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Terms</option>
            <option value="FIFTEENTH">15th (2009–2014)</option>
            <option value="SIXTEENTH">16th (2014–2019)</option>
            <option value="SEVENTEENTH">17th (2019–2024)</option>
            <option value="EIGHTEENTH">18th (2024–2029)</option>
          </select>

          {/* State input */}
          <input
            type="text"
            placeholder="State (e.g. MAHARASHTRA)"
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value.toUpperCase()); setPage(1); }}
            className="px-3 py-2 rounded border border-gray-200 text-gray-700 text-sm bg-white
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              placeholder:text-gray-400 w-36 uppercase"
          />

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-gray-200
                text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors text-sm"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              Clear
            </button>
          )}

          {/* Add MP button */}
          <button
            onClick={() => navigate("/mps/new")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-blue-200
              bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium ml-auto"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Add MP
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState message="Loading MPs…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No MPs found"
          description={hasFilters ? "Try adjusting your filters." : "No MP records yet."}
          action={hasFilters ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded border border-gray-200 text-gray-700
                hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Clear filters
            </button>
          ) : undefined}
        />
      ) : (
        <>
          <SectionHeader
            title="All MPs"
            count={total}
            action={hasFilters ? { label: "Clear filters", onClick: clearFilters } : undefined}
          />

          <DataTable
            columns={columns}
            data={items}
            empty="No MPs match your criteria"
            onRowClick={(mp) => navigate(`/mps/${mp.id}`)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-sm">
                Page {page} of {totalPages} · {total.toLocaleString("en-IN")} total
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded border border-gray-200 text-gray-700 text-sm
                    disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 rounded border border-gray-200 text-gray-700 text-sm
                    disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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
