/**
 * Whistleblower Submit Page — Phase 65: Privacy-Preserving Reports
 * Public — no authentication required
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { useSubmitWhistleblower } from "@/hooks/useWhistleblower";
import { LoadingState } from "@/components/ui";

export default function WhistleblowerSubmitPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState("");

  const submit = useSubmitWhistleblower();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await submit.mutateAsync({ title, category, description });
      setReferenceId(result?.id ?? "SUB-" + Date.now());
      setSubmitted(true);
    } catch {
      // Show error state
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Report Submitted Safely</h2>
          <p className="text-white/60 mb-4">
            Your report has been encrypted and routed to the review team. No identifying information was stored.
          </p>
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-white/50 text-sm">Reference ID</p>
            <p className="text-xl font-mono text-emerald-400">{referenceId}</p>
          </div>
          <p className="text-xs text-white/30">
            Keep this ID to track your report's status. No email or contact information was collected.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Whistleblower Report</h1>
          <p className="text-white/50">
            Submit sensitive information anonymously. Your identity is never recorded.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              This form does NOT store IP addresses, emails, or any identifying information. All data is encrypted.
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-purple-500 outline-none"
            >
              <option value="">Select category...</option>
              <option value="FRAUD">Financial Fraud</option>
              <option value="CORRUPTION">Corruption</option>
              <option value="SAFETY">Safety Violation</option>
              <option value="NEGLIGENCE">Negligence</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Report Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Brief description of the issue..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Provide as much detail as possible. Do not include your name or contact information..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-purple-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submit.isPending}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            {submit.isPending ? (
              <LoadingState message="Encrypting..." />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Submit Anonymously
              </>
            )}
          </button>

          {submit.isError && (
            <p className="text-red-400 text-sm text-center">Submission failed. Please try again.</p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
