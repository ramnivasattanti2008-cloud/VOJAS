/**
 * Development Requests Page — Phase 17: Citizens Request New Development
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ThumbsUp, ChevronRight, MapPin } from "lucide-react";
import {
  useDevelopmentRequests,
  useRequestGroups,
  useRequestStats,
} from "@/hooks/useDevelopmentRequests";
import { LoadingState, ErrorState, PageHeader, Badge, DataTable } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/20 text-blue-400",
  UNDER_REVIEW: "bg-amber-500/20 text-amber-400",
  APPROVED: "bg-emerald-500/20 text-emerald-400",
  REJECTED: "bg-red-500/20 text-red-400",
  IMPLEMENTED: "bg-purple-500/20 text-purple-400",
};

export default function RequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  const { data, isLoading, error } = useDevelopmentRequests({ status: statusFilter, sector: sectorFilter, search });
  const { data: groups } = useRequestGroups(sectorFilter || undefined);
  const { data: stats } = useRequestStats();

  if (isLoading) return <LoadingState message="Loading development requests..." />;
  if (error) return <ErrorState message="Failed to load requests" onRetry={() => window.location.reload()} />;

  const requests = Array.isArray(data) ? data : (data?.items ?? []);

  const columns = [
    {
      header: "Request",
      accessor: (r: any) => (
        <div>
          <p className="font-medium text-white">{r.title}</p>
          <p className="text-xs text-white/50 truncate max-w-xs">{r.description?.slice(0, 80)}...</p>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (r: any) => (
        <div className="text-sm">
          <p className="text-white/70">{r.requestType}</p>
          <p className="text-xs text-white/40">{r.sector}</p>
        </div>
      ),
    },
    {
      header: "Location",
      accessor: (r: any) => (
        <div className="flex items-center gap-1 text-sm text-white/60">
          <MapPin className="w-3 h-3" />
          {r.district}, {r.state}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (r: any) => <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>,
    },
    {
      header: "Supports",
      accessor: (r: any) => (
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">{r.supportCount ?? 0}</span>
        </div>
      ),
    },
    {
      header: "Priority",
      accessor: (r: any) => (
        <span className={`font-mono text-sm ${r.priority >= 70 ? "text-red-400" : r.priority >= 40 ? "text-amber-400" : "text-white/60"}`}>
          {r.priority ?? 0}
        </span>
      ),
    },
    {
      header: "Date",
      accessor: (r: any) => (
        <span className="text-sm text-white/60">{new Date(r.submittedAt).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Development Requests"
        subtitle={`${requests.length} citizen requests`}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Submit Request
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total ?? 0, color: "text-blue-400" },
            { label: "Pending", value: stats.pending ?? 0, color: "text-blue-400" },
            { label: "Under Review", value: stats.underReview ?? 0, color: "text-amber-400" },
            { label: "Approved", value: stats.approved ?? 0, color: "text-emerald-400" },
            { label: "Implemented", value: stats.implemented ?? 0, color: "text-purple-400" },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              <p className="text-sm text-white/50 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <Search className="w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search requests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
        />
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Sectors</option>
          <option value="EDUCATION">Education</option>
          <option value="HEALTH">Health</option>
          <option value="ROADS">Roads</option>
          <option value="WATER">Water</option>
          <option value="ELECTRICITY">Electricity</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="IMPLEMENTED">Implemented</option>
        </select>
      </div>

      {/* Grouped Requests */}
      {groups && groups.length > 0 && (
        <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Grouped by District + Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {groups.slice(0, 8).map((g: any, i: number) => (
              <div key={i} className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{g.district} — {g.requestType}</p>
                  <p className="text-xs text-white/50">{g.totalRequests} requests · {g.totalSupports} supports</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <DataTable columns={columns} data={requests} />
    </motion.div>
  );
}
