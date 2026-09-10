'use client';
import { Skeleton } from '@/components/ui/Skeleton';

export default function MapViewLoading() {
  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-48 mx-auto" />
        </div>
      </div>
      <div className="absolute top-4 right-4 space-y-2 w-64">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}
