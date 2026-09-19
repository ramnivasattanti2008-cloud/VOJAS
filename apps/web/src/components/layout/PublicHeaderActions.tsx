'use client';

import { AICopilotDrawer } from '@/components/ai-agent/AICopilotDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Auth-aware call to action in the public header/nav with integrated AI Copilot trigger.
 * Anonymous visitors see "Sign In"; a logged-in user sees a direct link back into their own
 * command center instead of a redundant login prompt.
 */
export function PublicHeaderActions() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, isAdmin, isOfficer, isMP, isContractor } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);

  const dashboardHref = isAdmin || isOfficer ? '/dashboard' : isMP ? '/mp' : isContractor ? '/contractor' : '/citizen';

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/report"
        className="hidden sm:inline-flex items-center justify-center h-9 px-3.5 text-[13px] font-semibold text-white bg-[#007AFF] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#0071EB] active:scale-[0.97] transition-all"
      >
        {t('common.submitReport', 'Submit Report')}
      </Link>

      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 text-[13px] font-semibold rounded-[10px] bg-[#5856D6]/10 text-[#5856D6] hover:bg-[#5856D6]/[0.16] active:scale-[0.97] transition-all cursor-pointer"
        aria-label={t('common.aiCopilot', 'AI Copilot')}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('common.aiCopilot', 'AI Copilot')}</span>
      </button>

      {!isLoading && isAuthenticated ? (
        <Link
          href={dashboardHref}
          className="text-[13px] font-semibold text-[#1C1C1E] hover:text-[#007AFF] px-2.5 h-9 inline-flex items-center transition-colors"
        >
          {t('nav.dashboard', 'Dashboard')}
        </Link>
      ) : (
        <Link href="/login" className="text-[13px] font-semibold text-[#1C1C1E] hover:text-[#007AFF] px-2.5 h-9 inline-flex items-center transition-colors">
          {t('common.login', 'Sign In')}
        </Link>
      )}

      <AICopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
