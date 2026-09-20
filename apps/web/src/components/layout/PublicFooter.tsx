'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/ui/Logo';

export function PublicFooter() {
  const { t } = useLanguage();

  return (
    <footer className="ios-hairline-t bg-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <LogoMark size={26} />
              <span className="text-base font-bold text-[#1C1C1E]">VOJAS</span>
            </div>
            <p className="text-xs text-[#6E6E73] leading-relaxed">
              {t(
                'footer.tagline',
                'Public infrastructure intelligence platform for Members of Parliament Local Area Development (MPLADS) monitoring. Sourced from official records and Sentinel-2 satellite observations.'
              )}
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1E] mb-3">
              {t('footer.discovery', 'Discovery')}
            </h4>
            <ul className="space-y-2 text-xs text-[#6E6E73]">
              <li>
                <Link href="/explore" className="hover:text-[#007AFF] transition-colors">
                  {t('footer.browseProjects', 'Browse Projects')}
                </Link>
              </li>
              <li>
                <Link href="/explore/map" className="hover:text-[#007AFF] transition-colors">
                  {t('footer.projectMap', 'Interactive Project Map')}
                </Link>
              </li>
              <li>
                <Link href="/budget" className="hover:text-[#007AFF] transition-colors">
                  {t('footer.budgetTracker', 'Financial Budget Tracker')}
                </Link>
              </li>
              <li>
                <Link href="/insights" className="hover:text-[#007AFF] transition-colors">
                  {t('footer.sectorBreakdown', 'Sector Breakdown')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1E] mb-3">
              {t('footer.evidenceAndReport', 'Evidence & Report')}
            </h4>
            <ul className="space-y-2 text-xs text-[#6E6E73]">
              <li>
                <Link href="/satellites" className="hover:text-[#007AFF] transition-colors">
                  {t('footer.satelliteEngine', 'Satellite Change Engine')}
                </Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-[#007AFF] transition-colors">
                  {t('footer.reportDiscrepancy', 'Report Project Discrepancy')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1C1C1E] mb-3">
              {t('footer.platformIntegrity', 'Platform Integrity')}
            </h4>
            <div className="p-3 bg-[#34C759]/[0.06] border border-[#34C759]/20 rounded-[14px] space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#1C1C1E]">
                <Shield className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                <span>{t('footer.zeroFabricated', 'Zero Fabricated Data')}</span>
              </div>
              <p className="text-[11px] text-[#6E6E73] leading-relaxed">
                {t(
                  'footer.zeroFabricatedDesc',
                  'VOJAS never invents figures or fake status records. Missing or unverified data is explicitly labeled as source-unavailable.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 ios-hairline-t flex flex-wrap items-center justify-between gap-4 text-xs text-[#8E8E93]">
          <p>© {new Date().getFullYear()} VOJAS. {t('footer.copyright', 'Built for Indian Civic Transparency & Public Accountability.')}</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#1C1C1E] transition-colors">
              {t('footer.privacy', 'Privacy')}
            </Link>
            <Link href="/about" className="hover:text-[#1C1C1E] transition-colors">
              {t('footer.about', 'About')}
            </Link>
            <Link href="/contact" className="hover:text-[#1C1C1E] transition-colors">
              {t('footer.contact', 'Contact')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

