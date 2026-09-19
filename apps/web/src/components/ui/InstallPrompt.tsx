'use client';

import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export function InstallPrompt() {
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white border border-black/[0.06] rounded-[18px] shadow-ios-floating p-4 animate-[ios-sheet-in_0.22s_cubic-bezier(0.32,0.72,0,1)]">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full text-[#8E8E93] hover:bg-black/[0.05] hover:text-[#1C1C1E] transition-colors"
        aria-label="Dismiss install prompt"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-[#007AFF]/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-[#007AFF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#1C1C1E] tracking-[-0.01em]">
            Install VOJAS App
          </p>
          <p className="text-[12px] text-[#8E8E93] mt-0.5 leading-relaxed">
            Add to your home screen for a faster, app-like experience.
          </p>
          <button
            onClick={() => promptInstall()}
            className="mt-3 text-[12px] font-semibold text-[#007AFF] hover:text-[#0064D1] transition-colors"
          >
            Install now →
          </button>
        </div>
      </div>
    </div>
  );
}
