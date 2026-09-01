import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useLongitudinal, TERM_LABELS, type LokSabhaTerm } from "@/hooks/useAnalyticsExtended";
import { LoadingState, ErrorState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}

const TERM_COLORS: Record<string, string> = {
  FIFTEENTH: "#94a3b8",
  SIXTEENTH: "#3b82f6",
  SEVENTEENTH: "#10b981",
  EIGHTEENTH: "#f59e0b",
};

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

  // Utilization % table
  const utilItems = data?.byTerm ?? [];

  // Top states per term
  const termKeys: LokSabhaTerm[] = ["FIFTEENTH", "SIXTEENTH", "SEVENTEENTH", "EIGHTEENTH"];

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Longitudinal"
          gradientWord="Term Trends"
          accent="saffron"
          icon={TrendingUp}
          subtitle="MPLADS utilization across Lok Sabha terms — 15th through 18th"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Analytics" },
            { label: "Longitudinal" },
          ]}
        />
      </motion.div>

      {isLoading ? (
        <LoadingState message="Loading longitudinal trends..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} />
      ) : data ? (
        <>
          {/* Summary KPIs */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.byTerm.map((t) => (
              <div
                key={t.term}
                className="p-4 rounded-xl bg-slate-900/40 border border-slate-800"
              >
                <p className="text-slate-500 text-xs font-medium mb-1">
                  {TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term}
                </p>
                <p className={`text-2xl font-bold ${TERM_COLORS[t.term] ?? "text-slate-300"}`}>
                  {formatINR(t.totalSanctioned)}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {t.utilizationPct.toFixed(1)}% utilized
                </p>
              </div>
            ))}
          </motion.div>

          {/* Sanctioned vs Spent charts side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">Total Sanctioned by Term</h3>
              <p className="text-xs text-slate-600 mb-4">All projects — sanctioned amounts</p>
              {termItems.length > 0 ? (
                <BarChart
                  data={termItems}
                  color="#f59e0b"
                  showValue={true}
                  formatValue={(v: number) => formatINR(v)}
                />
              ) : (
                <p className="text-slate-600 text-sm py-8 text-center">No data yet.</p>
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">Total Spent by Term</h3>
              <p className="text-xs text-slate-600 mb-4">Actual expenditure disbursed</p>
              {spentItems.length > 0 ? (
                <BarChart
                  data={spentItems}
                  color="#10b981"
                  showValue={true}
                  formatValue={(v: number) => formatINR(v)}
                />
              ) : (
                <p className="text-slate-600 text-sm py-8 text-center">No data yet.</p>
              )}
            </motion.div>
          </div>

          {/* Utilization table */}
          <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 overflow-x-auto">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Term Utilization Summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Term", "Projects", "Sanctioned", "Spent", "Utilization"].map((h) => (
                    <th key={h} className="text-left text-slate-500 font-medium pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utilItems.map((t) => {
                  const pct = t.utilizationPct;
                  const barColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={t.term} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="py-3 pr-4 text-slate-300">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2`} style={{ background: TERM_COLORS[t.term] }} />
                        {TERM_LABELS[t.term]?.replace(/\s\(.*?\)/, "") ?? t.term}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{t.totalProjects.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-400">{formatINR(t.totalSanctioned)}</td>
                      <td className="py-3 pr-4 text-slate-400">{formatINR(t.totalSpent)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden max-w-24">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                            />
                          </div>
                          <span className="text-xs font-medium w-12 text-right" style={{ color: barColor }}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Top states by term */}
          <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Top States by Term</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {termKeys.map((term) => {
                const states = data.topStatesByTerm[term] ?? [];
                const max = states[0]?.totalSanctioned ?? 1;
                return (
                  <div key={term} className="p-3 rounded-lg bg-slate-800/30 border border-slate-800">
                    <p className="text-xs font-semibold mb-2" style={{ color: TERM_COLORS[term] }}>
                      {TERM_LABELS[term]?.replace(/\s\(.*?\)/, "") ?? term}
                    </p>
                    {states.length > 0 ? (
                      <div className="space-y-1.5">
                        {states.slice(0, 5).map((s, i) => (
                          <div key={s.state} className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                            <span className="text-xs text-slate-400 w-28 truncate">{s.state}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round((s.totalSanctioned / max) * 100)}%`,
                                  background: TERM_COLORS[term],
                                  opacity: 0.6,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-16 text-right shrink-0">
                              {formatINR(s.totalSanctioned)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">No data</p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  );
}
