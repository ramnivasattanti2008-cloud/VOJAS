'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES, STORAGE_KEY, getLanguage, type Language } from './locales/config';
import enTranslations from './locales/en.json';

interface LanguageContextType {
  language: string;
  currentLanguage: Language;
  languages: Language[];
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

// In-memory cache for loaded translation dictionaries to prevent duplicate network hits
const translationCache: Record<string, Record<string, any>> = {
  en: enTranslations,
};

// Lazy loaders for non-English dictionaries — code-split on demand for ultra-fast initial load
const localeLoaders: Record<string, () => Promise<{ default: Record<string, any> }>> = {
  hi: () => import('./locales/hi.json'),
  kn: () => import('./locales/kn.json'),
  or: () => import('./locales/or.json'),
  mr: () => import('./locales/mr.json'),
  bn: () => import('./locales/bn.json'),
  te: () => import('./locales/te.json'),
  ta: () => import('./locales/ta.json'),
  gu: () => import('./locales/gu.json'),
  ml: () => import('./locales/ml.json'),
  pa: () => import('./locales/pa.json'),
  as: () => import('./locales/as.json'),
  ur: () => import('./locales/ur.json'),
  sa: () => import('./locales/sa.json'),
  mai: () => import('./locales/mai.json'),
  gom: () => import('./locales/gom.json'),
  sd: () => import('./locales/sd.json'),
  doi: () => import('./locales/doi.json'),
  mni: () => import('./locales/mni.json'),
  brx: () => import('./locales/brx.json'),
  sat: () => import('./locales/sat.json'),
  ne: () => import('./locales/ne.json'),
  ks: () => import('./locales/ks.json'),
};

function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Record<string, any>>(enTranslations);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize from localStorage or navigator
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && getLanguage(saved)) {
        void changeLang(saved);
        return;
      }
      // Check browser navigator language
      if (typeof navigator !== 'undefined') {
        const browserCode = navigator.language.split('-')[0].toLowerCase();
        if (browserCode !== 'en' && getLanguage(browserCode)) {
          void changeLang(browserCode);
        }
      }
    } catch {
      // Ignore localStorage access errors in restricted environment
    }
  }, []);

  const changeLang = useCallback(async (code: string) => {
    const langConfig = getLanguage(code);
    if (!langConfig) return;

    if (code === 'en') {
      setLanguageState('en');
      setTranslations(enTranslations);
      try {
        localStorage.setItem(STORAGE_KEY, 'en');
        document.cookie = `${STORAGE_KEY}=en; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
      } catch {}
      return;
    }

    if (translationCache[code]) {
      setLanguageState(code);
      setTranslations(translationCache[code]);
      try {
        localStorage.setItem(STORAGE_KEY, code);
        document.cookie = `${STORAGE_KEY}=${code}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = code;
        document.documentElement.dir = langConfig.direction;
      } catch {}
      return;
    }

    const loader = localeLoaders[code];
    if (loader) {
      setIsLoading(true);
      try {
        const module = await loader();
        translationCache[code] = module.default;
        setLanguageState(code);
        setTranslations(module.default);
        try {
          localStorage.setItem(STORAGE_KEY, code);
          document.cookie = `${STORAGE_KEY}=${code}; path=/; max-age=31536000; SameSite=Lax`;
          document.documentElement.lang = code;
          document.documentElement.dir = langConfig.direction;
        } catch {}
      } catch (err) {
        console.warn(`Failed to load locale chunk for ${code}, falling back to en`, err);
        setLanguageState('en');
        setTranslations(enTranslations);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>): string => {
      // Try active language first, then fallback to enTranslations, then fallback argument, then key
      let text = getNestedValue(translations, key);
      if (text == null && language !== 'en') {
        text = getNestedValue(enTranslations, key);
      }
      if (text == null) {
        text = fallback ?? key;
      }

      if (params && typeof text === 'string') {
        return text.replace(/{(\w+)}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
      }

      return text;
    },
    [translations, language]
  );

  const currentLanguage = useMemo(() => getLanguage(language) ?? LANGUAGES[0], [language]);
  const isRTL = currentLanguage.rtl;

  const value = useMemo(
    () => ({
      language,
      currentLanguage,
      languages: LANGUAGES,
      setLanguage: changeLang,
      t,
      isRTL,
      isLoading,
    }),
    [language, currentLanguage, changeLang, t, isRTL, isLoading]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

