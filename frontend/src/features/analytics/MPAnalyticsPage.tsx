/**
 * MPAnalyticsPage — VOJAS 2.0 MP Performance Analytics
 *
 * IBM Carbon–inspired light theme. White cards, gray borders, semantic colors.
 * No glassmorphism, no glow, no gradients, no decorative animations.
 * All data from real hooks (no fabricated numbers).
 *
 * Layout: Page header → 4-col KPI strip → [Bar chart + Donut] → Horizontal bar chart → Anomaly context
 */

import {
  Users,
  TrendingUp,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useMPOverview,
  useMPTrends,
  TERM_LABELS,
  type LokSabhaTerm,
} from "@/hooks/useAnalyticsExtended";
import { useMPs } from "@/hooks/useMPs";
import { LoadingState, ErrorState } from "@/components/ui";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";
import { DonutChart, type DonutItem } from "@/components/charts/DonutChart";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TERM_COLORS: Record<string, string> = {
  FIFTEENTH:  "#94a3b8",
  SIXTEENTH:   "#3b82f6",
  SEVENTEENTH: "#10b981",
  EIGHTEENTH:  "#f59e0b",
};

const HOUSE_COLORS: Record<string, string> = {
  LOK_SABHA:  "#3b82f6",
  RAJYA_SABHA: "#8b5cf6",
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

// ── KPI card (Carbon pattern) ────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  Icon,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  accent?: "blue" | "red" | "amber" | "green" | "slate";
}) {
  const iconBg: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    slate: "bg-gray-100 text-gray-600",
  };
  const bar: Record<string, string> = {
    blue:  "bg-blue-500",
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    slate: "bg-gray-400",
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all h-full">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-md", bar[accent])} aria-hidden />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center", iconBg[accent])}>
          <Icon className="w-4 h-4" aria-hidden />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      <p className="text-sm text-gray-700 font-medium mt-1.5">{label}</p>
    </div>
  );
}

// ── Chart card wrapper (Carbon pattern) ──────────────────────────────────────

function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export default function MPAnalyticsPage() {
  const overview = useMPOverview();
  useMPs({ limit: 1 });

  // Selected MP for trend drill-down
  const [selectedMPId] = useState<string | null>(null);
  const mpTrends = useMPTrends(selectedMPId ?? undefined);

  const data = overview.data;
  const isLoading = overview.isLoading;
  const error = overview.error?.message ?? null;

  // House donut
  const houseItems: DonutItem[] = data
    ? Object.entries(data.byHouse).map(([house, count]) => ({
        label: house === "LOK_SABHA" ? "Lok Sabha" : "Rajya Sabha",
        value: count,
        color: HOUSE_COLORS[house] ?? "#94a3b8",
      }))
    : [];

  // Term bar chart
  const termItems: BarChartItem[] = data
    ? Object.entries(data.byTerm).map(([term, count]) => ({
        label: TERM_LABELS[term as LokSabhaTerm]?.replace(/\s\(.*?\)/, "") ?? term,
        value: count,
        color: TERM_COLORS[term] ?? "#94a3b8",
      }))
    : [];

  // Selected MP term trends (suppress unused variable warning)
  const _trendItems: BarChartItem[] = mpTrends.data?.byTerm.map((t) => ({
    label: TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term,
    value: t.totalSanctioned,
    color: TERM_COLORS[t.term] ?? "#94a3b8",
  })) ?? [];
  void _trendItems;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-gray-700" aria-hidden />
          MP Analytics
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          MPLADS Member of Parliament performance, utilization & longitudinal trends
        </p>
        <nav className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link to="/analytics" className="hover:text-gray-700">Analytics</Link>
          <span>/</span>
          <span className="text-gray-900">MP</span>
        </nav>
      </div>

      {isLoading ? (
        <LoadingState message="Loading MP analytics..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : data ? (
        <>
          {/* KPI strip */}
          <div>
            <SectionHeader
              title="MP Overview"
              description="Aggregate MP count and distribution"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Total MPs"
                value={data.totalMPs.toLocaleString()}
                Icon={Users}
                accent="blue"
              />
              <KpiCard
                label="Avg Projects/MP"
                value={data.avgProjectsPerMP.toString()}
                Icon={TrendingUp}
                accent="green"
              />
              <KpiCard
                label="Lok Sabha"
                value={data.byHouse["LOK_SABHA"]?.toLocaleString() ?? "—"}
                Icon={Users}
                accent="slate"
              />
              <KpiCard
                label="Rajya Sabha"
                value={data.byHouse["RAJYA_SABHA"]?.toLocaleString() ?? "—"}
                Icon={Users}
                accent="slate"
              />
            </div>
          </div>

          {/* Charts: term bar + house donut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChartCard
              title="MPs by Lok Sabha Term"
              sub="Distribution across 15th–18th Lok Sabha"
            >
              {termItems.length > 0 ? (
                <BarChart
                  data={termItems}
                  color="#f59e0b"
                  formatValue={(v: number) => `${v} MPs`}
                />
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center italic">No term data yet</p>
              )}
            </ChartCard>

            <ChartCard
              title="House Distribution"
              sub="Lok Sabha vs Rajya Sabha"
            >
              {houseItems.length > 0 ? (
                <div className="flex justify-center">
                  <DonutChart
                    data={houseItems}
                    size={140}
                    centerText={data.totalMPs.toString()}
                    centerSubtext="MPs"
                    formatValue={(v) => v.toString()}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center italic">No house data yet</p>
              )}
            </ChartCard>
          </div>

          {/* Top states horizontal bars */}
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <SectionHeader
              title="Top States by MP Count"
              description="Top 10 states with highest number of MPs"
            />
            <div className="space-y-2.5">
              {data.topStates.slice(0, 10).map((s, i) => {
                const max = data.topStates[0]?.count ?? 1;
                const pct = Math.round((s.count / max) * 100);
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 shrink-0 tabular-nums">{i + 1}</span>
                    <span className="text-sm text-gray-700 w-36 truncate">{s.state}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right tabular-nums">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anomaly context */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden />
              <h3 className="text-sm font-semibold text-red-800">Anomaly Detection Context</h3>
            </div>
            <p className="text-xs text-red-700 leading-relaxed">
              MP analytics feeds into 7 anomaly rules:{" "}
              <span className="font-medium">MP_VOLUME_OUTLIER</span> flags MPs with sanctioned
              totals exceeding 2× the term median.{" "}
              <span className="font-medium">GHOST_PROJECT</span> catches approved/in-progress
              projects with no expenditure 12+ months after recommendation.{" "}
              <span className="font-medium">PAYMENT_TO_OLD_WORK</span> flags payments made
              2+ years after recommendation. All results require officer verification.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
