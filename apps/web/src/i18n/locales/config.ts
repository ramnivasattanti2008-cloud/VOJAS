/**
 * Indian Languages — 22 languages of the Eighth Schedule of the Indian Constitution
 * + English (used as the base language and fallback).
 *
 * Each entry contains:
 *  - code: ISO 639-1 + optional script tag
 *  - name: English name
 *  - nativeName: endonym (language name in the language itself)
 *  - flag: emoji flag
 *  - script: writing system used
 *  - direction: 'ltr' or 'rtl' (Urdu and Sindhi are RTL)
 *  - rtl: boolean shortcut
 */

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  script: "Devanagari" | "Bengali" | "Telugu" | "Tamil" | "Gujarati" | "Arabic" | "Kannada" | "Odia" | "Malayalam" | "Gurmukhi" | "Assamese" | "Ol Chiki" | "Devanagari-Persian" | "Meitei" | "Latin" | "Tibetan" | "Sharada" | "Takri";
  direction: "ltr" | "rtl";
  rtl: boolean;
}

export const LANGUAGES: Language[] = [
  // English (base)
  { code: "en",   name: "English",          nativeName: "English",        flag: "🇬🇧", script: "Latin",        direction: "ltr", rtl: false },

  // 22 Scheduled Languages of India
  { code: "hi",   name: "Hindi",            nativeName: "हिन्दी",          flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "bn",   name: "Bengali",          nativeName: "বাংলা",           flag: "🇮🇳", script: "Bengali",      direction: "ltr", rtl: false },
  { code: "te",   name: "Telugu",           nativeName: "తెలుగు",          flag: "🇮🇳", script: "Telugu",       direction: "ltr", rtl: false },
  { code: "mr",   name: "Marathi",          nativeName: "मराठी",          flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "ta",   name: "Tamil",            nativeName: "தமிழ்",          flag: "🇮🇳", script: "Tamil",        direction: "ltr", rtl: false },
  { code: "gu",   name: "Gujarati",         nativeName: "ગુજરાતી",        flag: "🇮🇳", script: "Gujarati",     direction: "ltr", rtl: false },
  { code: "ur",   name: "Urdu",             nativeName: "اردو",            flag: "🇮🇳", script: "Arabic",       direction: "rtl", rtl: true  },
  { code: "kn",   name: "Kannada",          nativeName: "ಕನ್ನಡ",          flag: "🇮🇳", script: "Kannada",      direction: "ltr", rtl: false },
  { code: "or",   name: "Odia",             nativeName: "ଓଡ଼ିଆ",           flag: "🇮🇳", script: "Odia",         direction: "ltr", rtl: false },
  { code: "ml",   name: "Malayalam",        nativeName: "മലയാളം",         flag: "🇮🇳", script: "Malayalam",    direction: "ltr", rtl: false },
  { code: "pa",   name: "Punjabi",          nativeName: "ਪੰਜਾਬੀ",        flag: "🇮🇳", script: "Gurmukhi",     direction: "ltr", rtl: false },
  { code: "as",   name: "Assamese",         nativeName: "অসমীয়া",         flag: "🇮🇳", script: "Assamese",     direction: "ltr", rtl: false },
  { code: "mai",  name: "Maithili",         nativeName: "मैथिली",         flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "sa",   name: "Sanskrit",         nativeName: "संस्कृतम्",       flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "gom",  name: "Konkani",          nativeName: "कोंकणी",         flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "sd",   name: "Sindhi",           nativeName: "سنڌي",            flag: "🇮🇳", script: "Arabic",       direction: "rtl", rtl: true  },
  { code: "doi",  name: "Dogri",            nativeName: "डोगरी",          flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "mni",  name: "Manipuri (Meitei)", nativeName: "ꯃꯩꯇꯩꯂꯣꯟ",    flag: "🇮🇳", script: "Meitei",       direction: "ltr", rtl: false },
  { code: "brx",  name: "Bodo",             nativeName: "बड़ो",            flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "sat",  name: "Santhali",         nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",       flag: "🇮🇳", script: "Ol Chiki",     direction: "ltr", rtl: false },
  { code: "ne",   name: "Nepali",           nativeName: "नेपाली",          flag: "🇮🇳", script: "Devanagari",   direction: "ltr", rtl: false },
  { code: "ks",   name: "Kashmiri",         nativeName: "कॉशुर",          flag: "🇮🇳", script: "Devanagari-Persian", direction: "ltr", rtl: false },
];

export const DEFAULT_LANGUAGE = "en";
export const STORAGE_KEY = "vojas_language";

/**
 * Languages surfaced first in the picker. These are the ones the platform has
 * the deepest dictionary coverage for, so they are the honest default suggestions.
 */
export const SUGGESTED_LANGUAGE_CODES = ["en", "hi", "bn", "mr", "ta", "te", "kn", "gu"] as const;

const LANGUAGE_BY_CODE: ReadonlyMap<string, Language> = new Map(
  LANGUAGES.map((language) => [language.code, language])
);

/**
 * Other codes that should land on one of ours.
 *
 * Browsers and older systems report ISO 639-2/3 codes ("ori", "kok"), region
 * tags ("hi-IN") and script tags ("mni-Mtei"). Without this map a user whose
 * browser says "ory-IN" silently gets English.
 *
 * Only exact language equivalences are listed — never a "close enough"
 * neighbour. Serving Bhojpuri or Awadhi speakers Hindi would be a guess about
 * someone's language, which is not ours to make.
 */
const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  eng: "en",
  hin: "hi",
  ben: "bn",
  bng: "bn",
  tel: "te",
  mar: "mr",
  tam: "ta",
  guj: "gu",
  urd: "ur",
  kan: "kn",
  ori: "or",
  ory: "or",
  odia: "or",
  mal: "ml",
  pan: "pa",
  pnb: "pa",
  asm: "as",
  san: "sa",
  kok: "gom",
  knn: "gom",
  snd: "sd",
  dgo: "doi",
  nep: "ne",
  npi: "ne",
  kas: "ks",
  mtei: "mni",
  sant: "sat",
  brx: "brx",
};

export function getLanguage(code: string): Language | undefined {
  return LANGUAGE_BY_CODE.get(code);
}

/**
 * Normalise any user/browser/storage supplied tag to a supported code.
 * Returns undefined when nothing matches, so callers fall back to English
 * deliberately rather than by accident.
 */
export function resolveLanguageCode(input: string | null | undefined): string | undefined {
  if (!input) return undefined;

  const normalised = input.trim().toLowerCase().replace(/_/g, "-");
  if (!normalised) return undefined;

  const candidates = [normalised, normalised.split("-")[0]];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (LANGUAGE_BY_CODE.has(candidate)) return candidate;
    const alias = LANGUAGE_ALIASES[candidate];
    if (alias && LANGUAGE_BY_CODE.has(alias)) return alias;
  }

  return undefined;
}
