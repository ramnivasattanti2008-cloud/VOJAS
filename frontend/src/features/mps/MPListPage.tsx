import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  X,
  ChevronRight,
  Plus,
  Calendar,
  Briefcase,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { useMPs } from "@/hooks/useMPs";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui";
import PageHeader from "@/components/ui/PageHeader";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import {
  type MP,
  getTermLabel,
  getHouseLabel,
} from "@/types";

const PAGE_SIZE = 20;

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

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="MPs"
          gradientWord="MPs"
          accent="electric"
          icon={Users}
          subtitle={`MPLADS registered MPs · ${total} on record`}
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "MPs" },
          ]}
          actions={
            <button
              onClick={() => navigate("/mps/new")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                bg-saffron-500/10 text-saffron-400 border border-saffron-500/30
                hover:bg-saffron-500/20 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add MP
            </button>
          }
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
            placeholder="Search by name or constituency..."
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

        <select
          value={houseFilter}
          onChange={(e) => { setHouseFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
            text-slate-300 text-sm focus:outline-none focus:border-saffron-500/50 cursor-pointer"
        >
          <option value="">All Houses</option>
          <option value="LOK_SABHA">Lok Sabha</option>
          <option value="RAJYA_SABHA">Rajya Sabha</option>
        </select>

        <select
          value={termFilter}
          onChange={(e) => { setTermFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
            text-slate-300 text-sm focus:outline-none focus:border-saffron-500/50 cursor-pointer"
        >
          <option value="">All Terms</option>
          <option value="FIFTEENTH">15th (2009–2014)</option>
          <option value="SIXTEENTH">16th (2014–2019)</option>
          <option value="SEVENTEENTH">17th (2019–2024)</option>
          <option value="EIGHTEENTH">18th (2024–2029)</option>
        </select>

        <input
          type="text"
          placeholder="State (e.g. MAHARASHTRA)"
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value.toUpperCase()); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700
            text-slate-300 text-sm focus:outline-none focus:border-saffron-500/50
            placeholder:text-slate-600 w-36 uppercase"
        />

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

      {/* Stats row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total MPs", value: total, accent: "text-saffron-400" },
          { label: "Lok Sabha", value: items.filter(m => m.house === "LOK_SABHA").length, accent: "text-blue-400" },
          { label: "Rajya Sabha", value: items.filter(m => m.house === "RAJYA_SABHA").length, accent: "text-purple-400" },
          { label: "18th Term", value: items.filter(m => m.term === "EIGHTEENTH").length, accent: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <p className="text-slate-500 text-xs font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Aggregate per-page metrics */}
      {items.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-500 text-xs font-medium">MPLADS Spent (Page)</p>
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 font-mono">
              ₹{items.reduce((s, m) => s + (m.mpladExpenditure ?? 0), 0).toFixed(1)} Cr
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-500 text-xs font-medium">Avg Utilization</p>
              <TrendingUp className="w-3.5 h-3.5 text-saffron-400" />
            </div>
            <p className="text-xl font-bold text-saffron-400 font-mono">
              {(() => {
                const mps = items.filter(m => m.mpladUtilization != null);
                if (mps.length === 0) return "—";
                const avg = mps.reduce((s, m) => s + (m.mpladUtilization ?? 0), 0) / mps.length;
                return `${avg.toFixed(0)}%`;
              })()}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-500 text-xs font-medium">Top Performers</p>
              <Briefcase className="w-3.5 h-3.5 text-electric-400" />
            </div>
            <p className="text-xl font-bold text-electric-400 font-mono">
              {items.filter(m => (m.mpladUtilization ?? 0) >= 95).length}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">≥ 95% utilization</p>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <motion.div variants={fadeUp}>
        {loading ? (
          <LoadingState message="Loading MPs..." />
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
                    {["MP", "Constituency", "Party", "Term", "MPLADS Spent", "Utilization", ""].map((h) => (
                      <th key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((mp: MP) => {
                    const mpladExpCr = mp.mpladExpenditure ?? 0;
                    const mpladUtil = mp.mpladUtilization ?? 0;
                    const utilClass =
                      mpladUtil > 100 ? "text-red-400" :
                      mpladUtil >= 95 ? "text-emerald-400" :
                      mpladUtil >= 75 ? "text-blue-400" :
                      mpladUtil >= 50 ? "text-saffron-400" :
                      "text-slate-500";
                    return (
                      <tr
                        key={mp.id}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/mps/${mp.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-200 min-w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-saffron-500/10 text-saffron-400
                              flex items-center justify-center text-xs font-bold shrink-0">
                              {mp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate">{mp.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{mp.state}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium
                              ${mp.house === "LOK_SABHA"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-purple-500/10 text-purple-400"}`}>
                              {getHouseLabel(mp.house)}
                            </span>
                            <span className="text-slate-400">{mp.constituency}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {mp.party ?? <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {getTermLabel(mp.term)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs whitespace-nowrap">
                          {mpladExpCr > 0 ? (
                            <div>
                              <div className="text-emerald-400">₹{mpladExpCr.toFixed(1)} Cr</div>
                              {(mp.mpladEntitlement ?? 0) > 0 && (
                                <div className="text-[10px] text-slate-600">
                                  of ₹{(mp.mpladEntitlement ?? 0).toFixed(1)} Cr
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {mpladUtil > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    mpladUtil > 100 ? "bg-red-500" :
                                    mpladUtil >= 95 ? "bg-emerald-500" :
                                    mpladUtil >= 75 ? "bg-blue-500" :
                                    "bg-saffron-500"
                                  }`}
                                  style={{ width: `${Math.min(100, mpladUtil)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-mono font-bold ${utilClass} w-12 text-right`}>
                                {mpladUtil.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-600 inline" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
    </motion.div>
  );
}
