/**
 * Admin Data Sources Page — Phase 43: Data Source Management
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Plus, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle, Search } from "lucide-react";
import { useDataSources, useSyncDataSource, useDeleteDataSource } from "@/hooks/useDataSources";
import { LoadingState, ErrorState, PageHeader, Badge } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  INACTIVE: "bg-white/10 text-white/40",
  ERROR: "bg-red-500/20 text-red-400",
  PENDING: "bg-amber-500/20 text-amber-400",
};

export default function AdminDataSourcesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useDataSources();
  const syncDs = useSyncDataSource();
  const deleteDs = useDeleteDataSource();

  if (isLoading) return <LoadingState message="Loading data sources..." />;
  if (error) return <ErrorState message="Failed to load data sources" />;

  const sources = Array.isArray(data) ? data : (data?.items ?? []);

  const getStatusIcon = (status: string) => {
    if (status === "ACTIVE") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === "ERROR") return <XCircle className="w-4 h-4 text-red-400" />;
    return <AlertCircle className="w-4 h-4 text-white/40" />;
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Data Source Management"
        subtitle={`${sources.length} registered data sources`}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Data Source
          </button>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
        <Search className="w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search data sources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
        />
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-2 gap-4">
        {sources.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase())).map((s: any) => (
          <motion.div key={s.id} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-white/50">{s.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(s.status)}
                <Badge className={STATUS_COLORS[s.status] ?? ""}>{s.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{s.recordCount?.toLocaleString() ?? 0}</p>
                <p className="text-xs text-white/40">Records</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-xs text-white/60">
                  {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleDateString() : "Never"}
                </p>
                <p className="text-xs text-white/40">Last Sync</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-xs text-white/60 truncate">{s.url ?? "—"}</p>
                <p className="text-xs text-white/40">Endpoint</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => syncDs.mutate(s.id)}
                disabled={syncDs.isPending}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${syncDs.isPending ? "animate-spin" : ""}`} />
                Sync
              </button>
              <button
                onClick={() => deleteDs.mutate(s.id)}
                disabled={deleteDs.isPending}
                className="btn-secondary flex items-center gap-1.5 text-xs text-red-400"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="text-center py-16 text-white/40">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No data sources registered yet</p>
        </div>
      )}
    </motion.div>
  );
}
