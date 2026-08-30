import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-navy-800/60 border border-white/5 flex items-center justify-center text-slate-500">
        {icon ?? <Inbox className="w-7 h-7" />}
      </div>
      <div>
        <h3 className="text-slate-300 font-semibold text-base mb-1">{title}</h3>
        {description && (
          <p className="text-slate-500 text-sm max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
