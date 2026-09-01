/**
 * LanguageSelector — VOJAS
 * Dropdown showing all 23 languages with native names, flags, and script direction.
 * Used at login and in settings.
 */

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, Language } from "@/i18n/locales/config";
import { setLanguage, applyLanguageDirection } from "@/i18n/i18n";
import { Globe, ChevronDown, Check, Search } from "lucide-react";

interface LanguageSelectorProps {
  variant?: "dropdown" | "list" | "grid";
  onLanguageChange?: (code: string) => void;
  className?: string;
  showSelected?: boolean;
}

export function LanguageSelector({
  variant = "dropdown",
  onLanguageChange,
  className = "",
  showSelected = true,
}: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  function handleSelect(lang: Language) {
    setLanguage(lang.code);
    applyLanguageDirection(lang.code);
    onLanguageChange?.(lang.code);
    setOpen(false);
    setSearch("");
  }

  function handleNativeSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    const lang = LANGUAGES.find((l) => l.code === code);
    if (lang) {
      setLanguage(code);
      applyLanguageDirection(code);
      onLanguageChange?.(code);
    }
  }

  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.includes(search) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  // Native <select> for accessibility + SSR-safe fallback
  if (variant === ("native" as typeof variant)) {
    return (
      <select
        value={i18n.language}
        onChange={handleNativeSelect}
        className={className}
        aria-label={t("common.selectLanguage")}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.nativeName} ({l.name})
          </option>
        ))}
      </select>
    );
  }

  // Grid variant for login page
  if (variant === "grid") {
    return (
      <div className={`space-y-3 ${className}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left
              ${currentLang.code === lang.code
                ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80"
              }`}
          >
            <span className="text-2xl leading-none">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate ${lang.rtl ? "text-right" : ""}`} dir={lang.direction}>
                {lang.nativeName}
              </div>
              <div className={`text-xs text-white/40 truncate ${lang.rtl ? "text-right" : ""}`} dir={lang.direction}>
                {lang.name}
              </div>
            </div>
            {currentLang.code === lang.code && (
              <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            )}
            {lang.rtl && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex-shrink-0">
                RTL
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // List variant
  if (variant === "list") {
    return (
      <div className={`space-y-1 ${className}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left
              ${currentLang.code === lang.code
                ? "bg-cyan-500/20 text-cyan-400"
                : "hover:bg-white/5 text-white/70"
              }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className={`flex-1 ${lang.rtl ? "text-right" : ""}`} dir={lang.direction}>
              {lang.nativeName}
            </span>
            <span className="text-xs text-white/30">{lang.name}</span>
            {currentLang.code === lang.code && (
              <Check className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-all text-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("common.selectLanguage")}
      >
        <Globe className="w-4 h-4 text-white/60" />
        <span>{showSelected ? `${currentLang.flag} ${currentLang.nativeName}` : t("common.selectLanguage")}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 bg-[#0a1628] border border-white/15 rounded-xl shadow-2xl overflow-hidden"
          style={{ minWidth: 280, maxWidth: 360 }}
          role="listbox"
          aria-label={t("common.selectLanguage")}
        >
          {/* Search */}
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("common.search")}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Language list */}
          <div className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-white/30 text-sm">
                {t("common.noResults")}
              </div>
            ) : (
              filtered.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  role="option"
                  aria-selected={currentLang.code === lang.code}
                  className={`w-full flex items-center gap-3 px-3 py-2 mx-0 text-left transition-colors
                    ${currentLang.code === lang.code
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <span className="text-xl flex-shrink-0">{lang.flag}</span>
                  <div className={`flex-1 min-w-0 ${lang.rtl ? "text-right" : ""}`} dir={lang.direction}>
                    <div className="text-sm font-medium truncate">{lang.nativeName}</div>
                  </div>
                  <div className="text-xs text-white/30 flex-shrink-0">{lang.name}</div>
                  {lang.rtl && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 flex-shrink-0">
                      RTL
                    </span>
                  )}
                  {currentLang.code === lang.code && (
                    <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
