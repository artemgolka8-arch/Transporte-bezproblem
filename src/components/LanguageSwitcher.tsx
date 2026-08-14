"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n/translations";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useTranslation();

  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg border border-line bg-panel p-1 ${className}`}
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          title={l.label}
          onClick={() => setLang(l.code)}
          className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
            lang === l.code
              ? "bg-panel2 text-cyan"
              : "text-muted hover:text-ink"
          }`}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}
