import { motion } from "framer-motion";
import {
  Building2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import {
  useVendorOverview,
  useVendorTop,
} from "@/hooks/useAnalyticsExtended";
import { useTopVendors } from "@/hooks/useVendors";
import { LoadingState, ErrorState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { DonutChart, type DonutItem } from "@/components/charts/DonutChart";
import { useNavigate } from "react-router-dom";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}

export default function VendorAnalyticsPage() {
  const navigate = useNavigate();
  const overview = useVendorOverview();
  useVendorTop(50);
  const topVendors = useTopVendors(5);

  const data = overview.data;
  const isLoading = overview.isLoading;
  const error = overview.error?.message ?? null;

  // Payment status donut
  const statusItems: DonutItem[] = data
    ? Object.entries(data.byPaymentStatus).map(([status, count], i) => ({
        label: status,
        value: Number(count),
        color: ["#10b981", "#ef4444", "#f59e0b", "#94a3b8"][i % 4],
      }))
    : [];

  // Risk stats
  const highRiskCount = data?.crossConstituencyRisk ?? 0;

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Vendor"
          gradientWord="Vendor Analytics"
          accent="electric"
          icon={Building2}
          subtitle="Vendor concentration, cross-constituency risk & payment benchmark"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Analytics" },
            { label: "Vendor" },
          ]}
        />
      </motion.div>

      {isLoading ? (
        <LoadingState message="Loading vendor analytics..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : data ? (
        <>
          {/* KPI strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Vendors", value: data.totalVendors.toLocaleString(), accent: "text-electric-400" },
              { label: "Total Payments", value: formatINR(data.totalPaid), accent: "text-saffron-400" },
              { label: "Avg per Vendor", value: formatINR(data.avgPaidPerVendor), accent: "text-blue-400" },
              {
                label: "High-Risk Vendors",
                value: data.crossConstituencyRisk.toLocaleString(),
                accent: highRiskCount > 0 ? "text-red-400" : "text-green-400",
                badge: highRiskCount > 0,
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment status donut */}
            <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">Payment Status</h3>
              <p className="text-xs text-slate-600 mb-4">All expenditures by status</p>
              {statusItems.length > 0 ? (
                <DonutChart data={statusItems} />
              ) : (
                <p className="text-slate-600 text-sm py-8 text-center">No payment data yet.</p>
              )}
            </motion.div>

            {/* Risk banner */}
            <motion.div variants={fadeUp} className="lg:col-span-2 p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-slate-300">Risk Indicators</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20">
                  <p className="text-xs text-red-400 font-medium mb-1">Cross-Constituency</p>
                  <p className="text-lg font-bold text-red-300">{data.crossConstituencyRisk}</p>
                  <p className="text-xs text-slate-600 mt-1">Vendors in 3+ constituencies</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-950/20 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400 font-medium mb-1">Cross-State</p>
                  <p className="text-lg font-bold text-yellow-300">{data.crossStateRisk}</p>
                  <p className="text-xs text-slate-600 mt-1">Vendors in 3+ states</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Vendors appearing across many constituencies or states are flagged by the{" "}
                <span className="text-slate-400">VENDOR_CONCENTRATION</span> rule — strong indicator
                of shell-vendor or cartel activity. Results require verification by authorized officers.
              </p>
            </motion.div>
          </div>

          {/* Top states by payments */}
          <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Top States by Vendor Payments</h3>
            <div className="space-y-2">
              {(data.topStates ?? []).slice(0, 8).map((s: { state: string; totalPaid: number; count: number }, i: number) => {
                const max = data.topStates[0]?.totalPaid ?? 1;
                const pct = Math.round((s.totalPaid / max) * 100);
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-5 shrink-0">{i + 1}</span>
                    <span className="text-sm text-slate-300 w-36 truncate">{s.state}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-electric-500/80 to-electric-400/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-electric-400 font-medium w-20 text-right">
                      {formatINR(s.totalPaid)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Top vendors quick list */}
          <motion.div variants={fadeUp} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Top 5 by Total Paid</h3>
            <div className="space-y-2">
              {(topVendors.data?.items ?? []).map((v: any, i: number) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/vendors/${v.id}`)}
                >
                  <span className={`text-sm font-bold w-5 shrink-0
                    ${i === 0 ? "text-saffron-400" : i === 1 ? "text-slate-300" : "text-slate-600"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{v.name}</p>
                    <p className="text-xs text-slate-500">
                      {v.state ?? "—"} · {v.constituencyCount} constituencies · {v.projectCount} projects
                    </p>
                  </div>
                  <span className="text-sm font-bold text-saffron-400 shrink-0">
                    {formatINR(v.totalPaid)}
                  </span>
                  {v.constituencyCount > 3 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20 shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      Risk
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  );
}
