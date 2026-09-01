/**
 * Priority Page — Phase 18: Development Priority Areas
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Zap } from "lucide-react";
import { useTopPriorities, useRecomputeAll } from "@/hooks/usePriority";
import { LoadingState, ErrorState, PageHeader, Badge } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";

export default function PriorityPage() {
  const { data: priorities, isLoading, error } = useTopPriorities(30);
  const recomputeMutation = useRecomputeAll();
  const [recomputing, setRecomputing] = useState(false);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await recomputeMutation.mutateAsync();
    } finally {
      setRecomputing(false);
    }
  };

  if (isLoading) return <LoadingState message="Computing priorities..." />;
  if (error) return <ErrorState message="Failed to load priorities" />;

  const items = Array.isArray(priorities) ? priorities : (priorities?.items ?? []);

  const maxScore = Math.max(...items.map((p: any) => p.score ?? 0), 1);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Development Priority"
        subtitle="AI-computed development need scores by area"
        actions={
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${recomputing ? "animate-spin" : ""}`} />
            {recomputing ? "Recomputing..." : "Recompute All"}
          </button>
        }
      />

      {/* Top Priority Banner */}
      {items.length > 0 && (
        <motion.div variants={fadeUp} className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-bold text-white">Highest Priority Area</h3>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-white/50 text-sm">District</p>
              <p className="text-xl font-bold text-white">{(items[0] as any)?.district}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">State</p>
              <p className="text-xl font-bold text-white">{(items[0] as any)?.state}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Priority Score</p>
              <p className="text-3xl font-bold text-red-400">{(items[0] as any)?.score}</p>
            </div>
          </div>
          {(items[0] as any)?.factors && (
            <p className="text-sm text-white/60 mt-3">{(items[0] as any).factors}</p>
          )}
        </motion.div>
      )}

      {/* Priority List */}
      <div className="space-y-3">
        {items.map((p: any, i: number) => (
          <motion.div
            key={p.id}
            variants={fadeUp}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/60 text-sm font-mono">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-white">{p.district}</span>
                  <Badge className="bg-white/10 text-white/60 text-xs">{p.state}</Badge>
                  {p.sector && <Badge className="bg-blue-500/20 text-blue-400 text-xs">{p.sector}</Badge>}
                </div>
                <p className="text-xs text-white/50">{p.factors}</p>
              </div>
              <div className="text-right">
                <div className="relative w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${p.score >= 70 ? "bg-red-500" : p.score >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${(p.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-bold mt-1 block ${p.score >= 70 ? "text-red-400" : p.score >= 40 ? "text-amber-400" : "text-emerald-400"}`}>
                  {p.score}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
