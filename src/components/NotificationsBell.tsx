"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/translations";

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const POLL_MS = 20000;

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10a6 6 0 0 1 12 0c0 3.4 1 5 1.6 5.8H4.4C5 15 6 13.4 6 10Z" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function formatTime(iso: string, lang: Lang) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(LOCALE_MAP[lang], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(LOCALE_MAP[lang], { day: "2-digit", month: "2-digit" });
}

export function NotificationsBell() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // тихо игнорируем — попробуем на следующем опросе
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markOne(item: NotificationItem) {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${item.id}`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  async function markAll() {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifications_title")}
        className="tap-target relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-panel bg-coral" />
        )}
      </button>

      {open && (
        <div className="panel absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <span className="text-sm font-semibold text-ink">{t("notifications_title")}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-medium text-cyan transition-colors hover:brightness-110"
              >
                {t("notifications_mark_all")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-visible">
            {loading ? (
              <div className="px-3 py-6 text-center text-sm text-muted">{t("notifications_loading")}</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted">{t("notifications_empty")}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOne(n)}
                  className={`block w-full border-b border-line/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-panel2/70 ${
                    n.isRead ? "" : "bg-cyanDim/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />}
                    <div className={`min-w-0 flex-1 ${n.isRead ? "pl-3.5" : ""}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">{n.title}</span>
                        <span className="shrink-0 text-[11px] text-muted">{formatTime(n.createdAt, lang)}</span>
                      </div>
                      {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</div>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
