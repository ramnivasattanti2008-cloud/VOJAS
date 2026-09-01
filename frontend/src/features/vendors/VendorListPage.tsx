import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Search,
  X,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useVendors, useTopVendors } from "@/hooks/useVendors";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import type { Vendor } from "@/types";

const PAGE_SIZE = 20;

function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function RiskBadge({ constituencyCount }: { constituencyCount: number }) {
  if (constituencyCount > 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        bg-red-500/10 text-red-400 border border-red-500/30">
        <AlertTriangle className="w-3 h-3" />
        High Risk
      </span>
    );
  }
  if (constituencyCount > 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
        Medium Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
      bg-green-500/10 text-green-400 border border-green-500/30">
      Normal
    </span>
  );
}

export default function VendorListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [minPaid, setMinPaid] = useState("");
  const [sortBy, setSortBy] = useState<"totalPaid" | "projectCount" | "constituencyCount">("totalPaid");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const query = useVendors({
    search: search || undefined,
    state: stateFilter || undefined,
    minPaid: minPaid ? Number(minPaid) * 1_00_000 : undefined,
    sortBy,
    sortDir,
    page,
    limit: PAGE_SIZE,
  });

  const topQuery = useTopVendors(5);

  const items = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const total = query.data?.total ?? 0;
  const loading = query.isLoading;
  const error = query.error?.message ?? null;
  const hasFilters = search || stateFilter || minPaid;

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStateFilter("");
    setMinPaid("");
    setPage(1);
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Vendors"
          gradientWord="Vendors"
          accent="electric"
          icon={Building2}
          subtitle={`Deduplicated MPLADS vendor registry · ${total} unique vendors`}
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Vendors" },
          ]}
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl
          bg-slate-900/40 border border-slate-800"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by vendor name..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value.length === 0) setSearch("");
            }}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
              text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-saffron-500/50"
          />
        </div>

        <input
          type="text"
          placeholder="State (e.g. DELHI)"
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value.toUpperCase()); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
            text-slate-300 text-sm focus:outline-none focus:border-saffron-500/50
            placeholder:text-slate-600 w-36 uppercase"
        />

        <select
          value={minPaid}
          onChange={(e) => { setMinPaid(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
            text-slate-300 text-sm focus:outline-none focus:border-saffron-500/50 cursor-pointer"
        >
          <option value="">Any amount</option>
          <option value="10">≥ ₹10L paid</option>
          <option value="50">≥ ₹50L paid</option>
          <option value="100">≥ ₹1Cr paid</option>
          <option value="500">≥ ₹5Cr paid</option>
        </select>

        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [b, d] = e.target.value.split("-") as [typeof sortBy, typeof sortDir];
            setSortBy(b); setSortDir(d);
          }}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
            text-slate-300 text-sm focus:outline-none focus:border-saffron-500/50 cursor-pointer"
        >
          <option value="totalPaid-desc">Most paid</option>
          <option value="projectCount-desc">Most projects</option>
          <option value="constituencyCount-desc">Most constituencies</option>
          <option value="name-asc">Name A→Z</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
              text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors text-sm"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Top vendors sidebar */}
        <motion.div variants={fadeUp} className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Top 5 by Payments
            </h3>
            {topQuery.isLoading ? (
              <p className="text-slate-600 text-sm">Loading...</p>
            ) : (
              <div className="space-y-3">
                {topQuery.data?.items?.slice(0, 5).map((v: Vendor, i: number) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-2 cursor-pointer hover:bg-slate-800/40
                      rounded-lg p-2 transition-colors"
                    onClick={() => navigate(`/vendors/${v.id}`)}
                  >
                    <span className={`text-sm font-bold w-5 shrink-0
                      ${i === 0 ? "text-saffron-400" : i === 1 ? "text-slate-300" : "text-slate-600"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{v.name}</p>
                      <p className="text-xs text-slate-500">{v.state ?? "—"} · {v.constituencyCount} constituencies</p>
                      <p className="text-xs text-saffron-400 font-semibold">{formatINR(v.totalPaid)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Main table */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          {loading ? (
            <LoadingState message="Loading vendors..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-7 h-7" />}
              title="No vendors found"
              description={hasFilters ? "Try adjusting your filters." : "No vendor records yet."}
              action={hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg bg-saffron-500/10 text-saffron-400 border border-saffron-500/30 hover:bg-saffron-500/20 text-sm"
                >
                  Clear filters
                </button>
              ) : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800">
                      {["Vendor", "State", "Districts", "Constituencies", "Projects", "Total Paid", "Risk", ""].map((h) => (
                        <th key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((v: Vendor) => (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/vendors/${v.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400
                              flex items-center justify-center text-xs font-bold shrink-0">
                              {v.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-200 truncate max-w-[180px]">
                              {v.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {v.state ?? <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {v.district ?? <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-medium">{v.constituencyCount}</td>
                        <td className="px-4 py-3 text-slate-300">{v.projectCount}</td>
                        <td className="px-4 py-3 text-saffron-400 font-semibold">{formatINR(v.totalPaid)}</td>
                        <td className="px-4 py-3"><RiskBadge constituencyCount={v.constituencyCount} /></td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-600 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-slate-500 text-sm">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm
                        disabled:opacity-40 hover:bg-slate-800/60 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm
                        disabled:opacity-40 hover:bg-slate-800/60 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
