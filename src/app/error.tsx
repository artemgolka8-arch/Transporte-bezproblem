"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

// Общая страница ошибки: вместо белого экрана — понятное сообщение и кнопка «Повторить»
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="panel-elevated w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-coralDim text-coral">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
            <path d="M12 10v4.2M12 17.2v.01" />
          </svg>
        </div>
        <h1 className="font-display text-lg font-semibold text-ink">{t("error_title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("error_text")}</p>
        <div className="mt-6 flex justify-center gap-2.5">
          <button type="button" onClick={reset} className="btn-primary px-5 py-2.5 text-sm">
            {t("error_retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-panel2"
          >
            {t("error_home")}
          </a>
        </div>
      </div>
    </div>
  );
}
