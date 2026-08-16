"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/translations";
import { ROLE_LABEL_KEYS, type Role } from "@/lib/roles";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  city: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "DONE";
  dueDate: string | null;
  creator: { id: string; name: string };
  assignee: { id: string; name: string };
};

type MeResponse = { linked: false } | { linked: true; profile: Profile };

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData: string;
        colorScheme?: "light" | "dark";
        themeParams?: Record<string, string>;
      };
    };
  }
}

function useInitData() {
  const [initData, setInitData] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!sdkReady) return;
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setInitData(tg.initData || "");
    } else {
      setInitData("");
    }
  }, [sdkReady]);

  return { initData, onSdkLoad: () => setSdkReady(true) };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TelegramMiniApp() {
  const { t } = useTranslation();
  const { initData, onSdkLoad } = useInitData();
  const [tab, setTab] = useState<"profile" | "tasks">("tasks");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (initData === null) return; // ждём SDK
    let cancelled = false;

    async function load() {
      try {
        const [meRes, tasksRes] = await Promise.all([
          fetch("/api/telegram/me", { headers: { "x-telegram-init-data": initData as string } }),
          fetch("/api/telegram/tasks", { headers: { "x-telegram-init-data": initData as string } }),
        ]);
        if (cancelled) return;

        if (!meRes.ok) {
          const data = await meRes.json().catch(() => ({}));
          setError(data.error || t("telegram_error_generic"));
          return;
        }
        const meData: MeResponse = await meRes.json();
        setMe(meData);

        if (tasksRes.ok) {
          setTasks(await tasksRes.json());
        }
      } catch {
        if (!cancelled) setError(t("telegram_error_generic"));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function toggleTask(task: Task) {
    if (!initData) return;
    setBusyTaskId(task.id);
    const action = task.status === "OPEN" ? "complete" : "reopen";
    const res = await fetch(`/api/telegram/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
      body: JSON.stringify({ action }),
    });
    setBusyTaskId(null);
    if (res.ok) {
      const updated: Task = await res.json();
      setTasks((prev) => (prev ? prev.map((tsk) => (tsk.id === updated.id ? updated : tsk)) : prev));
    }
  }

  const linked = me?.linked === true;
  const openTasks = tasks?.filter((tsk) => tsk.status === "OPEN") || [];
  const doneTasks = tasks?.filter((tsk) => tsk.status === "DONE") || [];

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={onSdkLoad} />

      <div className="min-h-screen bg-bg px-4 py-5">
        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!error && me === null && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-muted">
            {t("telegram_loading")}
          </div>
        )}

        {!error && me !== null && !linked && (
          <div className="panel flex flex-col items-center gap-2 px-5 py-10 text-center">
            <div className="text-sm font-medium text-ink">{t("telegram_not_linked_title")}</div>
            <div className="text-xs text-muted">{t("telegram_not_linked_body")}</div>
          </div>
        )}

        {!error && linked && me.linked && (
          <>
            <div className="mb-5 flex gap-2">
              <button
                onClick={() => setTab("tasks")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === "tasks" ? "bg-violet text-white" : "border border-line bg-bg2 text-muted"
                }`}
              >
                {t("telegram_tab_tasks")}
              </button>
              <button
                onClick={() => setTab("profile")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === "profile" ? "bg-violet text-white" : "border border-line bg-bg2 text-muted"
                }`}
              >
                {t("telegram_tab_profile")}
              </button>
            </div>

            {tab === "profile" && <ProfileCard profile={me.profile} />}

            {tab === "tasks" && (
              <div className="space-y-5">
                {tasks === null ? (
                  <div className="py-10 text-center text-sm text-muted">{t("telegram_loading")}</div>
                ) : (
                  <>
                    <TaskGroup
                      title={t("task_status_open")}
                      items={openTasks}
                      busyTaskId={busyTaskId}
                      onToggle={toggleTask}
                      t={t}
                    />
                    <TaskGroup
                      title={t("task_status_done")}
                      items={doneTasks}
                      busyTaskId={busyTaskId}
                      onToggle={toggleTask}
                      t={t}
                    />
                    {tasks.length === 0 && (
                      <div className="py-10 text-center text-sm text-muted">{t("telegram_no_tasks")}</div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name;
  const rows: { label: string; value: string | null }[] = [
    { label: t("field_phone"), value: profile.phone },
    { label: t("field_position"), value: profile.position },
    { label: t("field_city"), value: profile.city },
    { label: "Email", value: profile.email },
  ];

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violetDim/70 text-sm font-semibold text-violet">
          {initials(fullName)}
        </span>
        <div>
          <div className="text-base font-semibold text-ink">{fullName}</div>
          <div className="text-xs text-muted">{t(ROLE_LABEL_KEYS[profile.role])}</div>
        </div>
      </div>
      <div className="space-y-2.5 border-t border-line/70 pt-4">
        {rows
          .filter((r) => r.value)
          .map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-muted">{r.label}</span>
              <span className="text-ink">{r.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function TaskGroup({
  title,
  items,
  busyTaskId,
  onToggle,
  t,
}: {
  title: string;
  items: Task[];
  busyTaskId: string | null;
  onToggle: (task: Task) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">{title}</div>
      <div className="space-y-2">
        {items.map((task) => (
          <div key={task.id} className="panel p-4">
            <div className="mb-1 text-sm font-medium text-ink">{task.title}</div>
            {task.description && <div className="mb-2 text-xs text-muted">{task.description}</div>}
            <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
              <span>{t("task_assignee_label", { name: task.assignee.name })}</span>
              {task.dueDate && (
                <span>{t("task_due_label", { date: new Date(task.dueDate).toLocaleDateString() })}</span>
              )}
            </div>
            <button
              onClick={() => onToggle(task)}
              disabled={busyTaskId === task.id}
              className={
                task.status === "OPEN"
                  ? "w-full rounded-lg border border-mint/40 bg-mintDim/40 py-2 text-xs font-medium text-mint transition-opacity hover:opacity-90 disabled:opacity-50"
                  : "w-full rounded-lg border border-line bg-bg2 py-2 text-xs font-medium text-muted transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-50"
              }
            >
              {t(task.status === "OPEN" ? "mark_done_btn" : "reopen_btn")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
