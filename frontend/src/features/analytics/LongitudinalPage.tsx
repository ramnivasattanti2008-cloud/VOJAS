/**
 * LongitudinalPage — VOJAS 2.0 Lok Sabha Term Trends
 *
 * IBM Carbon–inspired light theme. White cards, gray borders, semantic colors.
 * No glassmorphism, no glow, no gradients, no decorative animations.
 * All data from real hooks (no fabricated numbers).
 *
 * Layout: Page header → Term KPI strip → Side-by-side bar charts → Utilization table → Top states
 */

import {
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLongitudinal, TERM_LABELS, type LokSabhaTerm } from "@/hooks/useAnalyticsExtended";
import { LoadingState, ErrorState } from "@/components/ui";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";
import { cn } from "@/lib/utils";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}

const TERM_COLORS: Record<string, string> = {
  FIFTEENTH:  "#94a3b8",
  SIXTEENTH:   "#3b82f6",
  SEVENTEENTH: "#10b981",
  EIGHTEENTH:  "#f59e0b",
};

const TERM_ACCENTS: Record<string, "slate" | "blue" | "green" | "amber"> = {
  FIFTEENTH:  "slate",
  SIXTEENTH:  "blue",
  SEVENTEENTH: "green",
  EIGHTEENTH:  "amber",
};

// ── Section header (IBM Carbon pattern) ──────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-gray-900 leading-tight">{title}</h2>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
  );
}

// ── Term KPI card (Carbon pattern) ─────────────────────────────────────────

function TermKpiCard({
  label,
  value,
  utilization,
  accent,
}: {
  label: string;
  value: string;
  utilization: number;
  accent: "slate" | "blue" | "green" | "amber";
}) {
  const bar: Record<string, string> = {
    slate: "bg-gray-400",
    blue:  "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
  };
  const pctColor = utilization >= 80 ? "text-green-700" : utilization >= 50 ? "text-amber-700" : "text-red-700";
  const pctBg = utilization >= 80 ? "bg-green-50" : utilization >= 50 ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar[accent])} aria-hidden />
      <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {value}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mr-2">
          <div
            className={cn("h-full rounded-full", bar[accent])}
            style={{ width: `${Math.min(utilization, 100)}%` }}
            aria-hidden
          />
        </div>
        <span className={cn("text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded", pctColor, pctBg)}>
          {utilization.toFixed(1)}%
        </span>
      </div>
      <p className="text-[10px] text-gray-500 mt-1">utilized</p>
    </div>
  );
}

// ── Bar chart card ───────────────────────────────────────────────────────────

function BarChartCard({
  title,
  sub,
  data,
  accent,
  showValue,
  formatValue,
}: {
  title: string;
  sub: string;
  data: BarChartItem[];
  accent: string;
  showValue?: boolean;
  formatValue: (v: number) => string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
      </div>
      {data.length > 0 ? (
        <BarChart
          data={data}
          color={accent}
          showValue={showValue}
          formatValue={formatValue}
        />
      ) : (
        <p className="text-gray-500 text-sm py-8 text-center italic">No data available</p>
      )}
    </div>
  );
}

export default function LongitudinalPage() {
  const { data, isLoading, error } = useLongitudinal();
  const errorMsg = error instanceof Error ? error.message : error ?? null;

  // Term utilization bar chart
  const termItems: BarChartItem[] = data?.byTerm.map((t) => ({
    label: TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term,
    value: t.totalSanctioned,
    color: TERM_COLORS[t.term] ?? "#94a3b8",
  })) ?? [];

  // Spent bar chart
  const spentItems: BarChartItem[] = data?.byTerm.map((t) => ({
    label: TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term,
    value: t.totalSpent,
    color: TERM_COLORS[t.term] ?? "#94a3b8",
  })) ?? [];

  const utilItems = data?.byTerm ?? [];
  const termKeys: LokSabhaTerm[] = ["FIFTEENTH", "SIXTEENTH", "SEVENTEENTH", "EIGHTEENTH"];

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-gray-700" aria-hidden />
          Longitudinal Term Trends
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          MPLADS utilization across Lok Sabha terms — 15th through 18th
        </p>
        <nav className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link to="/analytics" className="hover:text-gray-700">Analytics</Link>
          <span>/</span>
          <span className="text-gray-900">Longitudinal</span>
        </nav>
      </div>

      {isLoading ? (
        <LoadingState message="Loading longitudinal trends..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} />
      ) : data ? (
        <>
          {/* Term KPI strip */}
          <div>
            <SectionHeader
              title="Lok Sabha Term Summary"
              description="Total sanctioned and utilization per term"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.byTerm.map((t) => (
                <TermKpiCard
                  key={t.term}
                  label={TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term}
                  value={formatINR(t.totalSanctioned)}
                  utilization={t.utilizationPct}
                  accent={TERM_ACCENTS[t.term] ?? "slate"}
                />
              ))}
            </div>
          </div>

          {/* Sanctioned vs Spent charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <BarChartCard
              title="Total Sanctioned by Term"
              sub="All projects — sanctioned amounts"
              data={termItems}
              accent="#f59e0b"
              showValue
              formatValue={formatINR}
            />
            <BarChartCard
              title="Total Spent by Term"
              sub="Actual expenditure disbursed"
              data={spentItems}
              accent="#10b981"
              showValue
              formatValue={formatINR}
            />
          </div>

          {/* Utilization table */}
          <div className="bg-white border border-gray-200 rounded-md p-5 overflow-x-auto">
            <SectionHeader
              title="Term Utilization Summary"
              description="Projects, sanctioned, spent and utilization percentage"
            />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Term", "Projects", "Sanctioned", "Spent", "Utilization"].map((h) => (
                    <th key={h} className="text-left text-gray-500 font-medium pb-2 pr-4 text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utilItems.map((t) => {
                  const pct = t.utilizationPct;
                  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
                  const pctText = pct >= 80 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-700";
                  return (
                    <tr key={t.term} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                          style={{ background: TERM_COLORS[t.term] }}
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-gray-900 align-middle">
                          {TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 tabular-nums">{t.totalProjects.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-gray-700 tabular-nums">{formatINR(t.totalSanctioned)}</td>
                      <td className="py-3 pr-4 text-gray-700 tabular-nums">{formatINR(t.totalSpent)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-24">
                            <div
                              className={cn("h-full rounded-full", barColor)}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                              aria-hidden
                            />
                          </div>
                          <span className={cn("text-xs font-semibold tabular-nums w-12 text-right", pctText)}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Top states by term */}
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <SectionHeader
              title="Top States by Term"
              description="Top 5 states per Lok Sabha term by sanctioned amount"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {termKeys.map((term) => {
                const states = data.topStatesByTerm[term] ?? [];
                const max = states[0]?.totalSanctioned ?? 1;
                const barColor = TERM_COLORS[term] ?? "#94a3b8";
                return (
                  <div key={term} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs font-semibold mb-3" style={{ color: barColor }}>
                      {TERM_LABELS[term]?.replace(/\s\(.*?\)/, "") ?? term}
                    </p>
                    {states.length > 0 ? (
                      <div className="space-y-2">
                        {states.slice(0, 5).map((s, i) => (
                          <div key={s.state} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-4 shrink-0 tabular-nums">{i + 1}</span>
                            <span className="text-xs text-gray-700 w-28 truncate">{s.state}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.round((s.totalSanctioned / max) * 100)}%`, background: barColor }}
                                aria-hidden
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-16 text-right tabular-nums shrink-0">
                              {formatINR(s.totalSanctioned)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No data available</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
