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

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}
