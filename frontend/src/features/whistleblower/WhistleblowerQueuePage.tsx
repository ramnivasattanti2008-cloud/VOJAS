/**
 * Whistleblower Queue Page — Phase 65: Admin Review Queue
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, CheckCircle, XCircle, Search } from "lucide-react";
import { useWhistleblowerReports, useReviewWhistleblower, useWhistleblowerStats } from "@/hooks/useWhistleblower";
import { LoadingState, ErrorState, PageHeader, Badge } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-500/20 text-blue-400",
  UNDER_REVIEW: "bg-amber-500/20 text-amber-400",
  INVESTIGATED: "bg-purple-500/20 text-purple-400",
  ACTION_TAKEN: "bg-emerald-500/20 text-emerald-400",
  DISMISSED: "bg-white/10 text-white/50",
};

export default function WhistleblowerQueuePage() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading, error } = useWhistleblowerReports({ status: statusFilter });
  const { data: stats } = useWhistleblowerStats();
  const reviewMutation = useReviewWhistleblower();

  const handleReview = async (id: string, action: string) => {
    await reviewMutation.mutateAsync({ id, action });
  };

  if (isLoading) return <LoadingState message="Loading reports..." />;
  if (error) return <ErrorState message="Failed to load reports" />;

  const reports = Array.isArray(data) ? data : (data?.items ?? []);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Whistleblower Reports"
        subtitle="Encrypted, anonymous sensitive reports — REVIEWER/ADMIN access only"
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total ?? 0, color: "text-white" },
            { label: "Under Review", value: stats.underReview ?? 0, color: "text-amber-400" },
            { label: "Action Taken", value: stats.actionTaken ?? 0, color: "text-emerald-400" },
            { label: "Dismissed", value: stats.dismissed ?? 0, color: "text-white/40" },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              <p className="text-sm text-white/50 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <Search className="w-4 h-4 text-white/40 mt-2" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Status</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="INVESTIGATED">Investigated</option>
          <option value="ACTION_TAKEN">Action Taken</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {/* Reports */}
      <div className="space-y-4">
        {reports.map((r: any) => (
          <motion.div key={r.id} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="font-semibold text-white">{r.title}</p>
                  <p className="text-xs text-white/50">
                    ID: {r.id.slice(0, 8)} · {new Date(r.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-white/10 text-white/70 text-xs">{r.category}</Badge>
            </div>
            <p className="text-sm text-white/70 mb-4">{r.description}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleReview(r.id, "UNDER_REVIEW")}
                disabled={reviewMutation.isPending}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Eye className="w-3 h-3" /> Review
              </button>
              <button
                onClick={() => handleReview(r.id, "ACTION_TAKEN")}
                disabled={reviewMutation.isPending}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <CheckCircle className="w-3 h-3" /> Take Action
              </button>
              <button
                onClick={() => handleReview(r.id, "DISMISSED")}
                disabled={reviewMutation.isPending}
                className="btn-secondary flex items-center gap-2 text-sm text-red-400"
              >
                <XCircle className="w-3 h-3" /> Dismiss
              </button>
            </div>
          </motion.div>
        ))}
        {reports.length === 0 && (
          <p className="text-center text-white/40 py-12">No reports found</p>
        )}
      </div>
    </motion.div>
  );
}
