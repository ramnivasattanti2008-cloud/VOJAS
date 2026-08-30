import { FileText, ArrowRight } from "lucide-react";
import EmptyState from "../components/EmptyState";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

export default function PlaceholderPage({
  title,
  description,
  phase,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>
      <div className="glass rounded-xl p-6 min-h-[400px] flex items-center justify-center">
        <EmptyState
          icon={<FileText className="w-7 h-7" />}
          title={`${title} — Coming in ${phase}`}
          description="This module will be implemented in its dedicated phase. Phase 2 is just the shell."
          action={
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Implementation Roadmap</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          }
        />
      </div>
    </div>
  );
}
