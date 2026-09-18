'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  STORAGE_KEY,
  getLanguage,
  resolveLanguageCode,
  type Language,
} from './locales/config';
import enTranslations from './locales/en.json';

/**
 * A locale dictionary — arbitrarily nested plain objects whose leaves are strings.
 * Unknown (not `any`) so every lookup has to prove the leaf is a string before use.
 */
type Dictionary = Record<string, unknown>;

export type TranslationParams = Record<string, string | number>;

export interface LanguageContextType {
  /** Active language code, e.g. 'hi'. Always one of LANGUAGES. */
  language: string;
  currentLanguage: Language;
  languages: Language[];
  setLanguage: (code: string) => Promise<void>;
  /**
   * Translate a dotted key.
   *
   * Resolution order (first hit wins):
   *   1. active dictionary, plural variant (`key_plural` when params.count !== 1)
   *   2. active dictionary, `key`
   *   3. English dictionary, plural variant
   *   4. English dictionary, `key`
   *   5. the explicit `fallback` argument
   *   6. a humanised form of the key ('nav.dataSources' -> 'Data Sources')
   *
   * Step 6 exists so a user never reads a raw dotted key in the UI. It is a
   * last resort, not a feature: a key that reaches it is a missing-translation
   * bug and is reported to the console in development.
   */
  t: (
    key: string,
    fallbackOrParams?: string | TranslationParams,
    params?: TranslationParams
  ) => string;
  /** True when `key` genuinely resolves in the active or English dictionary. */
  hasTranslation: (key: string) => boolean;
  isRTL: boolean;
  /** True while a non-English dictionary chunk is being fetched. */
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const EN_DICTIONARY = enTranslations as Dictionary;

/** In-memory cache of loaded dictionaries — prevents duplicate chunk work. */
const translationCache: Record<string, Dictionary> = {
  en: EN_DICTIONARY,
};

/** Lazy loaders for non-English dictionaries — code-split so the first paint stays small. */
const localeLoaders: Record<string, () => Promise<{ default: Dictionary }>> = {
  hi: () => import('./locales/hi.json'),
  bn: () => import('./locales/bn.json'),
  te: () => import('./locales/te.json'),
  mr: () => import('./locales/mr.json'),
  ta: () => import('./locales/ta.json'),
  gu: () => import('./locales/gu.json'),
  ur: () => import('./locales/ur.json'),
  kn: () => import('./locales/kn.json'),
  or: () => import('./locales/or.json'),
  ml: () => import('./locales/ml.json'),
  pa: () => import('./locales/pa.json'),
  as: () => import('./locales/as.json'),
  mai: () => import('./locales/mai.json'),
  sa: () => import('./locales/sa.json'),
  gom: () => import('./locales/gom.json'),
  sd: () => import('./locales/sd.json'),
  doi: () => import('./locales/doi.json'),
  mni: () => import('./locales/mni.json'),
  brx: () => import('./locales/brx.json'),
  sat: () => import('./locales/sat.json'),
  ne: () => import('./locales/ne.json'),
  ks: () => import('./locales/ks.json'),
};

// ---------------------------------------------------------------------------
// Dictionary lookup
// ---------------------------------------------------------------------------

function countLeaves(dict: Dictionary): number {
  let total = 0;
  for (const value of Object.values(dict)) {
    if (value !== null && typeof value === 'object') {
      total += countLeaves(value as Dictionary);
    } else {
      total += 1;
    }
  }
  return total;
}

/**
 * Cache namespace. The English leaf count is folded in so a deploy that adds or
 * removes keys automatically invalidates every warm dictionary a browser is
 * holding — a stale dictionary would silently render last week's copy.
 */
const SESSION_CACHE_PREFIX = `vojas_i18n_v2_${countLeaves(EN_DICTIONARY)}:`;

function lookup(dict: Dictionary | undefined, key: string): string | undefined {
  if (!dict) return undefined;

  // Flat dictionaries (literal "a.b.c" keys) are supported as well as nested ones.
  const direct = dict[key];
  if (typeof direct === 'string') return direct;
  if (typeof direct === 'number') return String(direct);

  let current: unknown = dict;
  for (const part of key.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Dictionary)[part];
  }
  if (typeof current === 'string') return current;
  if (typeof current === 'number') return String(current);
  return undefined;
}

/**
 * Replace `{{name}}` and `{name}` placeholders.
 *
 * Both forms are supported on purpose: the locale files use `{{count}}`, and the
 * previous single-brace-only implementation turned "{{count}} days" into
 * "{5} days" for every interpolated string in the app.
 *
 * An unknown placeholder is left untouched rather than blanked — a visible
 * `{{count}}` is a bug report; a silently missing number is a wrong number.
 */
function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}|\{\s*(\w+)\s*\}/g, (match, doubled: string | undefined, single: string | undefined) => {
    const name = doubled ?? single;
    if (!name) return match;
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * 'nav.dataSources' -> 'Data Sources', 'projects.projectStartDate' -> 'Project Start Date',
 * 'common.officialMPLADProjects' -> 'Official MPLAD Projects'.
 */
function humaniseKey(key: string): string {
  const last = key.split('.').pop() ?? key;
  const spaced = last
    .replace(/_plural$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const reportedMissingKeys = new Set<string>();

function reportMissingKey(key: string, language: string) {
  if (process.env.NODE_ENV === 'production') return;
  const id = `${language}:${key}`;
  if (reportedMissingKeys.has(id)) return;
  reportedMissingKeys.add(id);
  console.warn(
    `[i18n] "${key}" is missing from both the ${language} and the en dictionary — showing a humanised key. Add it to apps/web/src/i18n/locales/en.json.`
  );
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** localStorage -> cookie -> browser language. Returns a valid code or undefined. */
function readPreferredLanguage(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const resolved = stored ? resolveLanguageCode(stored) : undefined;
    if (resolved) return resolved;
  } catch {
    // Private browsing / blocked storage — fall through to the cookie.
  }

  const fromCookie = readCookie(STORAGE_KEY);
  const resolvedCookie = fromCookie ? resolveLanguageCode(fromCookie) : undefined;
  if (resolvedCookie) return resolvedCookie;

  if (typeof navigator !== 'undefined') {
    const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
    for (const candidate of candidates) {
      const resolved = resolveLanguageCode(candidate);
      if (resolved) return resolved;
    }
  }

  return undefined;
}

function persistLanguage(code: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Non-fatal: the language still applies for this page load, it just won't
    // survive a reload if the browser blocks storage.
  }
  try {
    document.cookie = `${STORAGE_KEY}=${code}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Same as above.
  }
}

/** Keeps <html lang>/<html dir> in sync — screen readers and hyphenation rely on it. */
function applyDocumentLanguage(config: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = config.code;
  document.documentElement.dir = config.direction;
}

function readWarmDictionary(code: string): Dictionary | undefined {
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${code}`);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Dictionary;
    }
  } catch {
    // Corrupt or unavailable cache — the real chunk load covers us.
  }
  return undefined;
}

function writeWarmDictionary(code: string, dict: Dictionary) {
  try {
    window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${code}`, JSON.stringify(dict));
  } catch {
    // Quota or blocked storage — purely an optimisation, safe to skip.
  }
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface LocaleState {
  code: string;
  dict: Dictionary;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Code and dictionary live in one state object so they can never disagree —
  // a render with code='hi' but the Tamil dictionary is not representable.
  const [locale, setLocale] = useState<LocaleState>({
    code: DEFAULT_LANGUAGE,
    dict: EN_DICTIONARY,
  });
  const [isLoading, setIsLoading] = useState(false);

  const localeRef = useRef(locale);
  localeRef.current = locale;

  // Monotonic token so a slow chunk for a language the user already navigated
  // away from cannot overwrite the language they actually chose.
  const requestRef = useRef(0);

  const loadDictionary = useCallback(async (code: string): Promise<void> => {
    const loader = localeLoaders[code];
    if (!loader) return;

    const requestId = ++requestRef.current;
    setIsLoading(true);
    try {
      // Not named `module` — that shadows Next.js's module-system global
      // (@next/next/no-assign-module-variable) and breaks the build.
      const loadedLocale = await loader();
      const dict = loadedLocale.default;
      translationCache[code] = dict;
      writeWarmDictionary(code, dict);
      if (requestRef.current !== requestId) return;
      setLocale({ code, dict });
    } catch (error) {
      console.warn(`[i18n] failed to load the "${code}" dictionary; falling back to English`, error);
      if (requestRef.current !== requestId) return;
      // Keep the user's chosen code (so <html lang> and the selector stay
      // truthful) but serve English text — t() falls back to English anyway.
      setLocale({ code, dict: EN_DICTIONARY });
    } finally {
      if (requestRef.current === requestId) setIsLoading(false);
    }
  }, []);

  const changeLanguage = useCallback(
    async (input: string): Promise<void> => {
      const code = resolveLanguageCode(input);
      const config = code ? getLanguage(code) : undefined;
      if (!code || !config) return;

      applyDocumentLanguage(config);
      persistLanguage(code);

      const cached = translationCache[code];
      if (cached) {
        requestRef.current += 1; // cancel any in-flight load
        setLocale({ code, dict: cached });
        setIsLoading(false);
        return;
      }

      // Paint the new language immediately using whatever is already warm, then
      // replace it with the authoritative chunk.
      const warm = readWarmDictionary(code);
      if (warm) setLocale({ code, dict: warm });

      await loadDictionary(code);
    },
    [loadDictionary]
  );

  // Restore the persisted language before the browser paints. On a warm cache
  // this swaps the tree to the chosen language with no flash of English.
  const didInitRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const preferred = readPreferredLanguage() ?? DEFAULT_LANGUAGE;
    const config = getLanguage(preferred) ?? LANGUAGES[0];
    applyDocumentLanguage(config);

    if (config.code === DEFAULT_LANGUAGE) return;

    const warm = translationCache[config.code] ?? readWarmDictionary(config.code);
    if (warm) {
      translationCache[config.code] = warm;
      setLocale({ code: config.code, dict: warm });
    } else {
      // No dictionary yet: show the code as active and let English carry the
      // text for one frame rather than lying about which language is selected.
      setLocale({ code: config.code, dict: EN_DICTIONARY });
    }

    void loadDictionary(config.code);
  }, [loadDictionary]);

  // Keep tabs in sync — changing the language in one tab should not leave the
  // others silently disagreeing with the stored preference.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const code = resolveLanguageCode(event.newValue);
      if (code && code !== localeRef.current.code) void changeLanguage(code);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [changeLanguage]);

  const resolve = useCallback(
    (key: string, params?: TranslationParams): string | undefined => {
      const count = params?.count;
      const pluralKey =
        typeof count === 'number' && Math.abs(count) !== 1 ? `${key}_plural` : undefined;

      const active = locale.dict;
      const fromActive =
        (pluralKey ? lookup(active, pluralKey) : undefined) ?? lookup(active, key);
      if (fromActive !== undefined) return fromActive;

      if (active !== EN_DICTIONARY) {
        const fromEnglish =
          (pluralKey ? lookup(EN_DICTIONARY, pluralKey) : undefined) ?? lookup(EN_DICTIONARY, key);
        if (fromEnglish !== undefined) return fromEnglish;
      }

      return undefined;
    },
    [locale]
  );

  const t = useCallback<LanguageContextType['t']>(
    (key, fallbackOrParams, maybeParams) => {
      const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
      const params =
        typeof fallbackOrParams === 'object' && fallbackOrParams !== null
          ? fallbackOrParams
          : maybeParams;

      const resolved = resolve(key, params);
      if (resolved !== undefined) return interpolate(resolved, params);

      if (fallback !== undefined) return interpolate(fallback, params);

      reportMissingKey(key, locale.code);
      return humaniseKey(key);
    },
    [resolve, locale.code]
  );

  const hasTranslation = useCallback((key: string) => resolve(key) !== undefined, [resolve]);

  const currentLanguage = useMemo(
    () => getLanguage(locale.code) ?? LANGUAGES[0],
    [locale.code]
  );

  const value = useMemo<LanguageContextType>(
    () => ({
      language: locale.code,
      currentLanguage,
      languages: LANGUAGES,
      setLanguage: changeLanguage,
      t,
      hasTranslation,
      isRTL: currentLanguage.rtl,
      isLoading,
    }),
    [locale.code, currentLanguage, changeLanguage, t, hasTranslation, isLoading]
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
