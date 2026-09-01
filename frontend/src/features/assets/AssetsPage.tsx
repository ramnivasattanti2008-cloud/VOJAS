/**
 * Assets Page — Phase 16: Public Asset Health Monitoring
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, AlertTriangle, CheckCircle, Wrench, TrendingDown, Plus } from "lucide-react";
import { useAssets, useAssetStats } from "@/hooks/useAssets";
import { LoadingState, ErrorState, PageHeader, Badge, DataTable } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: "bg-emerald-500/20 text-emerald-400",
  FAIR: "bg-amber-500/20 text-amber-400",
  POOR: "bg-orange-500/20 text-orange-400",
  CRITICAL: "bg-red-500/20 text-red-400",
  UNDER_REPAIR: "bg-blue-500/20 text-blue-400",
};

const TYPE_ICONS: Record<string, string> = {
  ROAD: "🛣️",
  BRIDGE: "🌉",
  BUILDING: "🏢",
  DRAINAGE: "💧",
  WATER_SUPPLY: "🚰",
  ELECTRICITY: "⚡",
  OTHER: "📦",
};

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error } = useAssets({ type: typeFilter, status: statusFilter, search });
  const { data: stats } = useAssetStats();

  if (isLoading) return <LoadingState message="Loading assets..." />;
  if (error) return <ErrorState message="Failed to load assets" onRetry={() => window.location.reload()} />;

  const assets = Array.isArray(data) ? data : (data?.items ?? []);

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (score >= 50) return <Wrench className="w-4 h-4 text-amber-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  const columns = [
    {
      header: "Asset",
      accessor: (a: any) => (
        <div className="flex items-center gap-3">
          <span className="text-xl">{TYPE_ICONS[a.type] ?? "📦"}</span>
          <div>
            <p className="font-medium text-white">{a.name}</p>
            <p className="text-xs text-white/50">{a.district}, {a.state}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (a: Record<string, any>) => <span className="text-sm text-white/70">{a.type}</span>,
    },
    {
      header: "Status",
      accessor: (a: any) => (
        <Badge className={STATUS_COLORS[a.status] ?? "bg-white/10"}>{a.status}</Badge>
      ),
    },
    {
      header: "Health",
      accessor: (a: any) => (
        <div className="flex items-center gap-2">
          {getHealthIcon(a.healthScore)}
          <span className={`font-mono text-sm ${a.healthScore >= 80 ? "text-emerald-400" : a.healthScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {a.healthScore}%
          </span>
        </div>
      ),
    },
    {
      header: "Last Inspection",
      accessor: (a: any) => (
        <span className="text-sm text-white/60">
          {a.lastInspectionDate ? new Date(a.lastInspectionDate).toLocaleDateString() : "Never"}
        </span>
      ),
    },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Public Asset Health"
        subtitle={`${assets.length} assets monitored`}
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        }
      />

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Assets", value: stats.total ?? 0, icon: "🏗️", color: "text-blue-400" },
            { label: "Healthy", value: stats.healthy ?? 0, icon: "✅", color: "text-emerald-400" },
            { label: "Critical", value: stats.critical ?? 0, icon: <AlertTriangle className="w-5 h-5 text-red-400" />, color: "text-red-400" },
            { label: "Under Repair", value: stats.underRepair ?? 0, icon: "🔧", color: "text-amber-400" },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl`}>{stat.icon}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
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
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Types</option>
          <option value="ROAD">Roads</option>
          <option value="BRIDGE">Bridges</option>
          <option value="BUILDING">Buildings</option>
          <option value="DRAINAGE">Drainage</option>
          <option value="WATER_SUPPLY">Water Supply</option>
          <option value="ELECTRICITY">Electricity</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Status</option>
          <option value="HEALTHY">Healthy</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
          <option value="CRITICAL">Critical</option>
          <option value="UNDER_REPAIR">Under Repair</option>
        </select>
      </div>

      {/* Asset Table */}
      <DataTable columns={columns} data={assets} onRowClick={(a) => console.log("Asset:", a.id)} />
    </motion.div>
  );
}
