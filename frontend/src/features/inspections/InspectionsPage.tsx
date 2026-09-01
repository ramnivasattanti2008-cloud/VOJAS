/**
 * Inspections Page — Phase 20: Field Verification
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Calendar, CheckCircle, XCircle, Clock, ClipboardCheck } from "lucide-react";
import { useInspections, useInspectionStats } from "@/hooks/useInspections";
import { LoadingState, ErrorState, PageHeader, Badge, DataTable } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-blue-500/20 text-blue-400",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  CANCELLED: "bg-white/10 text-white/40",
};

export default function InspectionsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useInspections({ status: statusFilter });
  const { data: stats } = useInspectionStats();

  if (isLoading) return <LoadingState message="Loading inspections..." />;
  if (error) return <ErrorState message="Failed to load inspections" onRetry={() => window.location.reload()} />;

  const inspections = Array.isArray(data) ? data : (data?.items ?? []);

  const getResultIcon = (result?: string) => {
    if (result === "PASSED") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (result === "FAILED") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-white/40" />;
  };

  const columns = [
    {
      header: "Inspector",
      accessor: (i: any) => (
        <div>
          <p className="font-medium text-white">{i.inspectorName}</p>
          <p className="text-xs text-white/50">ID: {i.inspectorId.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      header: "Scheduled",
      accessor: (i: any) => (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Calendar className="w-3 h-3" />
          {new Date(i.scheduledDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (i: any) => <Badge className={STATUS_COLORS[i.status] ?? ""}>{i.status}</Badge>,
    },
    {
      header: "Result",
      accessor: (i: any) => (
        <div className="flex items-center gap-2">
          {getResultIcon(i.result)}
          <span className="text-sm text-white/70">{i.result ?? "Pending"}</span>
        </div>
      ),
    },
    {
      header: "Project / Asset",
      accessor: (i: any) => (
        <span className="text-sm text-white/60">
          {i.projectId ? `Project ${i.projectId.slice(0, 8)}` : i.assetId ? `Asset ${i.assetId.slice(0, 8)}` : "—"}
        </span>
      ),
    },
    {
      header: "Completed",
      accessor: (i: any) => (
        <span className="text-sm text-white/60">
          {i.completedDate ? new Date(i.completedDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Field Inspections"
        subtitle={`${inspections.length} inspection records`}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Schedule Inspection
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total ?? 0, icon: <ClipboardCheck className="w-5 h-5 text-blue-400" /> },
            { label: "Completed", value: stats.completed ?? 0, icon: <CheckCircle className="w-5 h-5 text-emerald-400" /> },
            { label: "In Progress", value: stats.inProgress ?? 0, icon: <Clock className="w-5 h-5 text-amber-400" /> },
            { label: "Failed", value: stats.failed ?? 0, icon: <XCircle className="w-5 h-5 text-red-400" /> },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                {stat.icon}
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
              <p className="text-sm text-white/50">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <Search className="w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search by inspector..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Status</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable columns={columns} data={inspections} />
    </motion.div>
  );
}
