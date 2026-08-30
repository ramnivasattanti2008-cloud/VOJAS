interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingState({
  message = "Loading...",
  size = "md",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div role="status" aria-live="polite" aria-label={message} className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className={`${sizeClasses[size]} rounded-full border-electric-500/30 border-t-electric-500 animate-spin`}
      />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
