'use client';

import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export function InstallPrompt() {
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-vojas-50 dark:bg-vojas-900/30 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-vojas-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Install VOJAS App
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Add to your home screen for a faster, app-like experience.
          </p>
          <button
            onClick={() => promptInstall()}
            className="mt-3 text-xs font-medium text-vojas-600 hover:text-vojas-700 dark:text-vojas-400 dark:hover:text-vojas-300 transition-colors"
          >
            Install now →
          </button>
        </div>
      </div>
    </div>
  );
}
