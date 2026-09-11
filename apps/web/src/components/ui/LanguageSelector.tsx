'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { type Language } from '@/i18n/locales/config';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface LanguageSelectorProps {
  variant?: 'button' | 'compact' | 'minimal';
  className?: string;
}

// Quick shortcuts for prominent regional showcase languages
const FEATURED_LANG_CODES = ['en', 'hi', 'kn', 'or', 'mr', 'te', 'ta', 'bn'];

export function LanguageSelector({
  variant = 'button',
  className = '',
}: LanguageSelectorProps) {
  const { language, currentLanguage, languages, setLanguage, isLoading, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const handleSelect = async (lang: Language) => {
    await setLanguage(lang.code);
    setOpen(false);
    setSearch('');
  };

  const filteredLanguages = languages.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.script.toLowerCase().includes(q)
    );
  });

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          aria-label="Select language"
          title="Select Language"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono text-[11px] uppercase">{currentLanguage.code}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      ) : variant === 'minimal' ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Select language"
          title="Select Language"
        >
          <Globe className="w-4 h-4 text-blue-600" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors group"
          aria-label="Select language"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-slate-700">{currentLanguage.nativeName}</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({currentLanguage.name})</span>
          {isLoading ? (
            <span className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </button>
      )}

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col text-slate-900 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="font-bold text-xs text-slate-900 leading-none">
                  {t('common.selectLanguage', 'Select Language')}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  22 Official Indian Languages + English
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
              23 LANGS
            </span>
          </div>

          {/* Quick Regional Showcase Pills */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100 bg-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Popular / Showcase Regions
            </span>
            <div className="flex flex-wrap gap-1">
              {FEATURED_LANG_CODES.map((code) => {
                const lang = languages.find((l) => l.code === code);
                if (!lang) return null;
                const isSelected = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={cn(
                      'px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    <span>{lang.nativeName}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Filter */}
          <div className="p-2 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search language (e.g. Hindi, Odia, Kannada)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Scrollable Language List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-50">
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching languages found
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors',
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{lang.flag}</span>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-semibold leading-snug truncate">
                          {lang.nativeName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          {lang.name} · {lang.script} {lang.rtl ? '(RTL)' : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

