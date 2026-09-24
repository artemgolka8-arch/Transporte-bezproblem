"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Modal } from "./Modal";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  // danger — красная кнопка (удаление и другие необратимые действия)
  tone?: "danger" | "default";
};

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Замена системного confirm(): аккуратное окно в стиле интерфейса.
// Использование: const confirm = useConfirm(); if (!(await confirm(t("..."))) ) return;
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm должен вызываться внутри ConfirmProvider");
  return ctx;
}

type Pending = { message: string; options: ConfirmOptions; resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Pending | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((message, options = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ message, options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  useEffect(() => {
    if (pending) cancelRef.current?.focus();
  }, [pending]);

  const danger = (pending?.options.tone ?? "danger") === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <Modal onClose={() => close(false)} backdropClose labelledBy="confirm-title">
          <div className="panel-elevated w-full max-w-sm animate-rise p-6">
            <h2 id="confirm-title" className="font-display text-base font-semibold text-ink">
              {pending.options.title ?? t("confirm_title")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{pending.message}</p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-panel2"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${
                  danger ? "bg-danger" : "bg-cyan"
                }`}
              >
                {pending.options.confirmLabel ?? (danger ? t("delete_action") : t("confirm_ok"))}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
