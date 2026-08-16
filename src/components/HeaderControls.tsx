"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useTheme } from "@/lib/theme/ThemeProvider";

export function HeaderControls({ className = "" }: { className?: string }) {
  const { lang, setLang } = useTranslation();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-line/70 bg-panel/70 p-1 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-0.5" role="group" aria-label="Language">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            title={l.label}
            onClick={() => setLang(l.code)}
            className={`rounded-full px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide transition-colors ${
              lang === l.code ? "bg-cyan/15 text-cyan" : "text-faint hover:text-ink"
            }`}
          >
            {l.code}
          </button>
        ))}
      </div>

      <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />

      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? t("theme_light") : t("theme_dark")}
        aria-label={isDark ? t("theme_light") : t("theme_dark")}
        aria-pressed={isDark}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:text-ink"
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
