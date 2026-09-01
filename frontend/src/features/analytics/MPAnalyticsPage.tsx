import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  useMPOverview,
  useMPTrends,
  TERM_LABELS,
  type LokSabhaTerm,
} from "@/hooks/useAnalyticsExtended";
import { useMPs } from "@/hooks/useMPs";
import { LoadingState, ErrorState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";
import { DonutChart, type DonutItem } from "@/components/charts/DonutChart";
import { useState } from "react";

const TERM_COLORS: Record<string, string> = {
  FIFTEENTH: "#94a3b8",
  SIXTEENTH: "#3b82f6",
  SEVENTEENTH: "#10b981",
  EIGHTEENTH: "#f59e0b",
};

const HOUSE_COLORS: Record<string, string> = {
  LOK_SABHA: "#3b82f6",
  RAJYA_SABHA: "#8b5cf6",
};

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

  // Selected MP term trends
  const _trendItems: BarChartItem[] = mpTrends.data?.byTerm.map((t) => ({
    label: TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term,
    value: t.totalSanctioned,
    color: TERM_COLORS[t.term] ?? "#94a3b8",
  })) ?? [];
  void _trendItems;

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="MP"
          gradientWord="MP Analytics"
          accent="saffron"
          icon={Users}
          subtitle="MPLADS Member of Parliament performance, utilization & longitudinal trends"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Analytics" },
            { label: "MP" },
          ]}
        />
      </motion.div>

      {isLoading ? (
        <LoadingState message="Loading MP analytics..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : data ? (
        <>
          {/* KPI strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total MPs",
                value: data.totalMPs.toLocaleString(),
                accent: "text-saffron-400",
                icon: Users,
              },
              {
                label: "Avg Projects/MP",
                value: data.avgProjectsPerMP.toString(),
                accent: "text-blue-400",
                icon: TrendingUp,
              },
              {
                label: "Lok Sabha",
                value: data.byHouse["LOK_SABHA"]?.toLocaleString() ?? "—",
                accent: "text-blue-400",
                icon: Users,
              },
              {
                label: "Rajya Sabha",
                value: data.byHouse["RAJYA_SABHA"]?.toLocaleString() ?? "—",
                accent: "text-purple-400",
                icon: Users,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="p-4 rounded-xl bg-slate-900/40 border border-slate-800"
              >
                <p className="text-slate-500 text-xs font-medium mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.accent}`}>{k.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Charts row */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MPs by Lok Sabha term */}
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">MPs by Lok Sabha Term</h3>
              <p className="text-xs text-slate-600 mb-4">Distribution across 15th–18th Lok Sabha</p>
              {termItems.length > 0 ? (
                <BarChart
                  data={termItems}
                  color="#f59e0b"
                  formatValue={(v: number) => `${v} MPs`}
                />
              ) : (
                <p className="text-slate-600 text-sm py-8 text-center">No term data yet.</p>
              )}
            </div>

            {/* House breakdown */}
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">House Distribution</h3>
              <p className="text-xs text-slate-600 mb-4">Lok Sabha vs Rajya Sabha</p>
              {houseItems.length > 0 ? (
                <DonutChart data={houseItems} />
              ) : (
                <p className="text-slate-600 text-sm py-8 text-center">No house data yet.</p>
              )}
            </div>
          </motion.div>

          {/* Top states */}
          <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Top States by MP Count
            </h3>
            <div className="space-y-2">
              {data.topStates.slice(0, 10).map((s, i) => {
                const max = data.topStates[0]?.count ?? 1;
                const pct = Math.round((s.count / max) * 100);
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-5 shrink-0">{i + 1}</span>
                    <span className="text-sm text-slate-300 w-36 truncate">{s.state}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-saffron-500/80 to-saffron-400/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Anomaly context */}
          <motion.div variants={fadeUp} className="p-5 rounded-xl bg-red-950/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">Anomaly Detection Context</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              MP analytics feeds into 7 anomaly rules:{" "}
              <span className="text-slate-400">MP_VOLUME_OUTLIER</span> flags MPs with sanctioned
              totals exceeding 2× the term median.{" "}
              <span className="text-slate-400">GHOST_PROJECT</span> catches approved/in-progress
              projects with no expenditure 12+ months after recommendation.{" "}
              <span className="text-slate-400">PAYMENT_TO_OLD_WORK</span> flags payments made
              2+ years after recommendation. All results require officer verification.
            </p>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  );
}
