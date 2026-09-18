'use client';

import { AICopilotDrawer } from '@/components/ai-agent/AICopilotDrawer';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Auth-aware call to action in the public header/nav with integrated AI Copilot trigger.
 * Anonymous visitors see "Sign In"; a logged-in user sees a direct link back into their own
 * command center instead of a redundant login prompt.
 */
export function PublicHeaderActions() {
  const { isAuthenticated, isLoading, isAdmin, isOfficer, isMP, isContractor } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const dashboardHref = isAdmin || isOfficer ? '/dashboard' : isMP ? '/mp' : isContractor ? '/contractor' : '/citizen';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100/70 transition-all cursor-pointer shadow-2xs"
        aria-label="Open AI Copilot"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span className="hidden sm:inline">AI Copilot</span>
      </button>

      {!isLoading && isAuthenticated ? (
        <Link
          href={dashboardHref}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1"
        >
          Dashboard
        </Link>
      ) : (
        <Link href="/login" className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1">
          Sign In
        </Link>
      )}

      <AICopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
