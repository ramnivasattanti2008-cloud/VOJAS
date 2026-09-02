/**
 * VendorAnalyticsPage — VOJAS 2.0 Vendor Analytics
 *
 * IBM Carbon–inspired light theme. White cards, gray borders, semantic colors.
 * No glassmorphism, no glow, no gradients, no decorative animations.
 * All data from real hooks (no fabricated numbers).
 *
 * Layout: Page header → 4-col KPI strip → [Donut + Risk banner] → Top states → Top vendors list
 */

import {
  Building2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useVendorOverview,
  useVendorTop,
} from "@/hooks/useAnalyticsExtended";
import { useTopVendors } from "@/hooks/useVendors";
import { LoadingState, ErrorState } from "@/components/ui";
import { DonutChart, type DonutItem } from "@/components/charts/DonutChart";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}

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
  warn = false,
}: {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  accent?: "blue" | "red" | "amber" | "green" | "slate";
  warn?: boolean;
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
      {warn && (
        <p className="text-[10px] text-red-600 font-medium mt-1">Requires review</p>
      )}
    </div>
  );
}

// ── Chart card wrapper (Carbon pattern) ──────────────────────────────────────

function ChartCard({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
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
      {children}
    </div>
  );
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
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-gray-700" aria-hidden />
          Vendor Analytics
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Vendor concentration, cross-constituency risk & payment benchmark
        </p>
        <nav className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link to="/analytics" className="hover:text-gray-700">Analytics</Link>
          <span>/</span>
          <span className="text-gray-900">Vendor</span>
        </nav>
      </div>

      {isLoading ? (
        <LoadingState message="Loading vendor analytics..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : data ? (
        <>
          {/* KPI strip */}
          <div>
            <SectionHeader
              title="Vendor Overview"
              description="Aggregate vendor count and payment statistics"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Total Vendors"
                value={data.totalVendors.toLocaleString()}
                Icon={Building2}
                accent="blue"
              />
              <KpiCard
                label="Total Payments"
                value={formatINR(data.totalPaid)}
                Icon={Building2}
                accent="amber"
              />
              <KpiCard
                label="Avg per Vendor"
                value={formatINR(data.avgPaidPerVendor)}
                Icon={Building2}
                accent="green"
              />
              <KpiCard
                label="High-Risk Vendors"
                value={data.crossConstituencyRisk.toLocaleString()}
                Icon={AlertTriangle}
                accent={highRiskCount > 0 ? "red" : "green"}
                warn={highRiskCount > 0}
              />
            </div>
          </div>

          {/* Payment donut + Risk banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ChartCard
              title="Payment Status"
              sub="All expenditures by status"
            >
              {statusItems.length > 0 ? (
                <div className="flex justify-center">
                  <DonutChart
                    data={statusItems}
                    size={140}
                    centerText={data.totalVendors.toString()}
                    centerSubtext="vendors"
                    formatValue={(v) => v.toString()}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center italic">No payment data yet</p>
              )}
            </ChartCard>

            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-md p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-red-600" aria-hidden />
                <h3 className="text-sm font-semibold text-gray-900">Risk Indicators</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-red-800 mb-1">Cross-Constituency</p>
                  <p className="text-2xl font-semibold text-red-900 tabular-nums leading-none">
                    {data.crossConstituencyRisk}
                  </p>
                  <p className="text-[10px] text-red-700 mt-1">Vendors in 3+ constituencies</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Cross-State</p>
                  <p className="text-2xl font-semibold text-amber-900 tabular-nums leading-none">
                    {data.crossStateRisk}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">Vendors in 3+ states</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Vendors appearing across many constituencies or states are flagged by the{" "}
                <span className="font-medium text-gray-800">VENDOR_CONCENTRATION</span> rule —
                strong indicator of shell-vendor or cartel activity. Results require verification by authorized officers.
              </p>
            </div>
          </div>

          {/* Top states by payments */}
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <SectionHeader
              title="Top States by Vendor Payments"
              description="Total payments by state (top 8)"
            />
            <div className="space-y-2.5">
              {(data.topStates ?? []).slice(0, 8).map((s: { state: string; totalPaid: number; count: number }, i: number) => {
                const max = data.topStates[0]?.totalPaid ?? 1;
                const pct = Math.round((s.totalPaid / max) * 100);
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 shrink-0 tabular-nums">{i + 1}</span>
                    <span className="text-sm text-gray-700 w-36 truncate">{s.state}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="text-xs font-medium text-blue-700 tabular-nums w-20 text-right">
                      {formatINR(s.totalPaid)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top vendors list */}
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <SectionHeader
              title="Top 5 Vendors by Total Paid"
              description="Click any vendor to view full details"
            />
            <div className="space-y-2">
              {(topVendors.data?.items ?? []).map((v: any, i: number) => {
                const rankColor = i === 0 ? "text-amber-700" : i === 1 ? "text-gray-700" : "text-gray-400";
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/vendors/${v.id}`)}
                  >
                    <span className={cn("text-sm font-bold w-5 shrink-0 tabular-nums", rankColor)}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.name}</p>
                      <p className="text-xs text-gray-500">
                        {v.state ?? "—"} · {v.constituencyCount} constituencies · {v.projectCount} projects
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                      {formatINR(v.totalPaid)}
                    </span>
                    {v.constituencyCount > 3 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200 shrink-0">
                        <AlertTriangle className="w-3 h-3" aria-hidden />
                        Risk
                      </span>
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
