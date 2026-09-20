'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
        <WifiOff className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">You are currently offline</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        VOJAS is running in local cached mode. Please check your network connectivity to stream live satellite telemetry and database updates.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
        <Link
          href="/"
          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
