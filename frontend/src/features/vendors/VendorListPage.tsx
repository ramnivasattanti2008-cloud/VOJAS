/**
 * VendorListPage — IBM Carbon light theme.
 * No glassmorphism, no gradients, no glow effects, no decorative animations.
 * All data from real hooks.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
        bg-red-50 text-red-700 border border-red-200">
        <AlertTriangle className="w-3 h-3" />
        High Risk
      </span>
    );
  }
  if (constituencyCount > 3) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
        bg-amber-50 text-amber-700 border border-amber-200">
        Medium Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
      bg-green-50 text-green-700 border border-green-200">
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
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle={`Deduplicated MPLADS vendor registry · ${total.toLocaleString("en-IN")} unique vendors`}
        icon={Building2}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Vendors" },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-md">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vendor name..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value.length === 0) setSearch("");
            }}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="w-full pl-9 pr-3 py-2 rounded border border-gray-300
              text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <input
          type="text"
          placeholder="State (e.g. DELHI)"
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value.toUpperCase()); setPage(1); }}
          className="px-3 py-2 rounded border border-gray-300
            text-gray-700 text-sm focus:outline-none focus:border-blue-500
            placeholder:text-gray-400 w-36 uppercase bg-white"
        />

        <select
          value={minPaid}
          onChange={(e) => { setMinPaid(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded border border-gray-300
            text-gray-700 text-sm focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
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
          className="px-3 py-2 rounded border border-gray-300
            text-gray-700 text-sm focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
        >
          <option value="totalPaid-desc">Most paid</option>
          <option value="projectCount-desc">Most projects</option>
          <option value="constituencyCount-desc">Most constituencies</option>
          <option value="name-asc">Name A→Z</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded
              text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm border border-gray-200"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Top vendors sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Top 5 by Payments
            </h3>
            {topQuery.isLoading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : (
              <div className="space-y-3">
                {topQuery.data?.items?.slice(0, 5).map((v: Vendor, i: number) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-2 cursor-pointer hover:bg-gray-50
                      rounded p-2 transition-colors"
                    onClick={() => navigate(`/vendors/${v.id}`)}
                  >
                    <span className={cn(
                      "text-sm font-bold w-5 shrink-0",
                      i === 0 ? "text-amber-600" : i === 1 ? "text-gray-600" : "text-gray-400"
                    )}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.state ?? "—"} · {v.constituencyCount} constituencies</p>
                      <p className="text-xs text-blue-600 font-semibold">{formatINR(v.totalPaid)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main table */}
        <div className="lg:col-span-3">
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
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Clear filters
                </button>
              ) : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Vendor", "State", "Districts", "Constituencies", "Projects", "Total Paid", "Risk", ""].map((h) => (
                        <th key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((v: Vendor) => (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/vendors/${v.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600
                              flex items-center justify-center text-xs font-bold shrink-0 border border-blue-200">
                              {v.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[180px]">
                              {v.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {v.state ?? <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {v.district ?? <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{v.constituencyCount}</td>
                        <td className="px-4 py-3 text-gray-700">{v.projectCount}</td>
                        <td className="px-4 py-3 text-blue-600 font-semibold">{formatINR(v.totalPaid)}</td>
                        <td className="px-4 py-3"><RiskBadge constituencyCount={v.constituencyCount} /></td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-gray-500 text-sm">
                    Page {page} of {totalPages} · {total.toLocaleString("en-IN")} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-sm
                        disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-sm
                        disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
