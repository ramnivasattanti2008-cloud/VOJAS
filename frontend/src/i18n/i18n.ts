/**
 * i18next configuration — VOJAS
 *
 * Loads translation resources synchronously for the 22 Indian languages
 * plus English. Persists selected language in localStorage so the choice
 * survives reloads, and falls back to the browser's preferred language,
 * finally to English.
 *
 * - For RTL scripts (Urdu, Sindhi), `<html dir="rtl">` is set on language change
 * - All UI strings are pulled from translation files; English is the canonical
 *   reference and other languages should be complete over time.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { DEFAULT_LANGUAGE, LANGUAGES, STORAGE_KEY, getLanguage } from "./locales/config";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import bn from "./locales/bn.json";
import te from "./locales/te.json";
import mr from "./locales/mr.json";
import ta from "./locales/ta.json";
import gu from "./locales/gu.json";
import ur from "./locales/ur.json";
import kn from "./locales/kn.json";
import or_ from "./locales/or.json";
import ml from "./locales/ml.json";
import pa from "./locales/pa.json";
import as_ from "./locales/as.json";
import mai from "./locales/mai.json";
import sa from "./locales/sa.json";
import gom from "./locales/gom.json";
import sd from "./locales/sd.json";
import doi from "./locales/doi.json";
import mni from "./locales/mni.json";
import brx from "./locales/brx.json";
import sat from "./locales/sat.json";
import ne from "./locales/ne.json";
import ks from "./locales/ks.json";

// All translation resources keyed by language code
const resources = {
  en,
  hi,
  bn,
  te,
  mr,
  ta,
  gu,
  ur,
  kn,
  "or": or_,
  ml,
  pa,
  "as": as_,
  mai,
  sa,
  gom,
  sd,
  doi,
  mni,
  brx,
  sat,
  ne,
  ks,
};

const supportedCodes = LANGUAGES.map((l) => l.code);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: supportedCodes,
    nonExplicitSupportedLngs: true,
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
      convertDetectedLanguage: (lng: string) => {
        // Map browser-reported locales (e.g. "hi-IN", "en-US") to our codes
        const base = lng.toLowerCase().split("-")[0];
        return supportedCodes.includes(base) ? base : DEFAULT_LANGUAGE;
      },
    },
    returnEmptyString: false,
  });

/**
 * Apply document direction + language attribute based on the current language.
 * Called whenever the language changes.
 */
export function applyLanguageDirection(lang: string) {
  const langInfo = getLanguage(lang);
  if (!langInfo) return;
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", langInfo.direction);
}

/**
 * Persist a language choice — both the i18n instance and the DOM.
 */
export function setLanguage(code: string) {
  if (!supportedCodes.includes(code)) return;
  i18n.changeLanguage(code);
  localStorage.setItem(STORAGE_KEY, code);
  applyLanguageDirection(code);
}

// Apply direction on initial load based on the active language
applyLanguageDirection(i18n.language);

export default i18n;
